import * as ts from "typescript"
import {CallExpression, Decorator, Identifier} from "typescript"
import * as htmlparser from 'htmlparser2';
import * as fs from "fs";
import {readFileSync} from "fs";
import * as path from "path";

class DecoratorReader {
    public className: string;
    private properties: any;

    constructor(node: ts.Node) {
        this.className = (<any>node).parent.name.getText();
        if ((<any>node).expression.arguments[0]) {
            this.properties = (<any>node).expression.arguments[0].properties
        }
    }

    get selector() {
        return this.properties.find(e => e.name.getText() === 'selector').initializer.text;
    }


    private get templateNode() {
        return this.properties.find(e => e.name.getText() === 'template');

    }

    private get templateUrlNode() {
        return this.properties.find(e => e.name.getText() === 'templateUrl');
    }

    getTemplate(fileName) {
        let template;
        if (this.templateUrlNode) {
            template = readFileSync(path.resolve(path.dirname(fileName), this.templateUrlNode.initializer.text)).toString()
        } else if (this.templateNode) {
            template = this.templateNode.initializer.text;
        }
        return template;
    }
}

class ImportResolver {
    private tsConfig: any;
    private paths: ts.MapLike<string[]>;
    private rootPath: string;

    constructor(rootPath: string) {
        this.rootPath = rootPath;
        this.tsConfig = JSON.parse(readFileSync(path.resolve(rootPath, 'tsconfig.json')).toString());

        this.paths = {};
        if (this.tsConfig.compilerOptions.paths) {
            for (let key of Object.keys(this.tsConfig.compilerOptions.paths)) {
                this.paths[key.replace(new RegExp('\\*$'), '')] = this.tsConfig.compilerOptions.paths[key];
            }
        }
    }

    resolve(pathToResolve: string, currentPath: string) {
        let matchingPaths = Object.keys(this.paths).filter(e => pathToResolve.startsWith(e));
        for (let matchingPath of matchingPaths) {
            for (let predefinedPath of this.paths[matchingPath]) {
                let fullPath = path.resolve(this.rootPath, pathToResolve.replace(matchingPath, predefinedPath.replace(new RegExp('\\*$'), '')) + '.ts')
                if (fs.existsSync(fullPath)) {
                    return fullPath;
                }
            }
        }
        let fromRelative = path.resolve(path.dirname(currentPath), pathToResolve) + ".ts";
        if (fs.existsSync(fromRelative)) {
            return fromRelative;
        }
        let nodeModulesDirName = path.resolve(this.rootPath, 'node_modules', pathToResolve);
        if (fs.existsSync(path.resolve(nodeModulesDirName, `${path.basename(nodeModulesDirName)}.ts`))) {
            return path.resolve(nodeModulesDirName, `${path.basename(nodeModulesDirName)}.ts`);
        }
        if (fs.existsSync(path.resolve(nodeModulesDirName, `${path.basename(nodeModulesDirName)}.d.ts`))) {
            return path.resolve(nodeModulesDirName, `${path.basename(nodeModulesDirName)}.d.ts`);
        }
    }
}


export class TsParser {
    private rootPath: string;

    entries = new Map<string, any>();
    selectors = new Map<string, any>();


    delintHtml(component: any) {
        let linkedComponents = [];
        var parser = new htmlparser.Parser({
            ontext: (text: string) => {
                component.fields && [...component.fields.keys()].forEach(e => {
                    if (text.includes(e)) {
                        component.fields.get(e).usedProps.add('#TEMPLATE_USAGE#');
                    }
                });
            },
            onopentag: (name, attribs) => {
                for (let attrName of Object.keys(attribs)) {
                    let attr = attribs[attrName];
                    component.fields && [...component.fields.keys()].forEach(e => {
                        if (attr.includes(e)) {
                            component.fields.get(e).usedProps.add('#TEMPLATE_USAGE#');
                        }
                    });

                }
                if (this.selectors.has(name)) {
                    linkedComponents.push(this.entries.get(name))
                }
                for (let a of Object.keys(attribs)) {
                    if (this.selectors.has(a)) {
                        linkedComponents.push(this.entries.get(a))
                    }
                }
            },
        }, {decodeEntities: true, lowerCaseAttributeNames: false});
        parser.write(component.template);
        parser.end();
        return linkedComponents;
    }


    constructor(rootPath: string) {
        this.rootPath = rootPath;
    }

    delint(fileName: string) {
        let sourceFile: ts.SourceFile = ts.createSourceFile(
            fileName,
            readFileSync(fileName).toString(),
            ts.ScriptTarget.Latest,
            /*setParentNodes */ true
        );
        let importResolver = new ImportResolver(this.rootPath);


        const imports = new Map<string, string>();
        const fields = new Map<string, any>();
        const injected = new Map<string, any>();

        let componentName;

        let delintConstructor = (node: ts.Node) => {
            switch (node.kind) {
                case ts.SyntaxKind.Constructor:
                    for (let p of (<any>node).parameters) {
                        if (p.type && p.type.typeName) {
                            let injectedClassName = p.type.typeName.getText();
                            fields.set(p.name.getText(), {
                                'class': injectedClassName,
                                'path': imports.get(injectedClassName),
                                'usedProps': new Set<string>()
                            });
                            injected.set(injectedClassName, imports.get(injectedClassName));
                            let e = this.entries;
                            let currentClassName = (<any>node).parent.name.getText();
                            if (this.entries.has(currentClassName)) {
                                this.entries.get(currentClassName).codeRefs.add(injectedClassName);
                            } else {
                                this.entries.set(currentClassName, {codeRefs: new Set([injectedClassName])})
                            }
                        }
                    }
                    break;

            }
            ts.forEachChild(node, delintConstructor);
        };
        let delintNode = (node: ts.Node) => {
            // if (node.getText() === 'ClusterEditDetailsModalComponent' && ts.SyntaxKind.ImportSpecifier !== node.parent.kind && ts.SyntaxKind.NamedImports !== node.parent.kind) {
            //     console.log(ts.SyntaxKind[node.kind], ts.SyntaxKind[node.parent.kind]);
            // }
            switch (node.kind) {
                case ts.SyntaxKind.PropertyAccessExpression:
                    if ((<any>node).parent.expression) {
                        let parentName = (<any>node).parent.expression.name;
                        if (parentName && fields.has(parentName.getText()) && (<any>node).parent.name) {
                            fields.get(parentName.getText()).usedProps.add((<any>node).parent.name.getText());
                        }
                    }
                    break;
                case ts.SyntaxKind.Identifier:
                    switch (node.parent.kind) {
                        case ts.SyntaxKind.PropertyAccessExpression:
                            let parentName = (<any>node).parent.expression.name;
                            if (parentName && fields.has(parentName.getText())) {
                                fields.get(parentName.getText()).usedProps.add(node.getText());
                            }
                        // if (imports.has(node.getText())) {
                        //     console.log(`Using external method ${(<any>node).parent.name.getText()} of ${node.getText()}`)
                        // }
                    }
                    // if (!ts.SyntaxKind[node.parent.kind].includes('Import')) {
                    //     console.log(ts.SyntaxKind[node.parent.kind], node.getText(), '-------->', node.parent.getText().replace(/\n/g, ''));
                    // }
                    // if (node.parent.kind !== ts.SyntaxKind.PropertyAccessExpression
                    //     && !ts.SyntaxKind[node.parent.kind].includes('Declaration')
                    //
                    //     && !ts.SyntaxKind[node.parent.kind].includes('Import')
                    //     && node.parent.kind !== ts.SyntaxKind.Parameter
                    //     && node.parent.kind !== ts.SyntaxKind.PropertySignature
                    //     && node.parent.kind !== ts.SyntaxKind.EnumMember
                    //
                    // ) {
                    // }
                    // console.log(1);
                    break;
                // case ts.SyntaxKind.ImportDeclaration:
                //     // console.log(1);
                //     break;
                // case ts.SyntaxKind.ImportEqualsDeclaration:
                //     console.log(1);
                //     break
                // case ts.SyntaxKind.ImportKeyword:
                //     console.log(1);
                //     break
                // case ts.SyntaxKind.ImportSpecifier:
                //     console.log(1);
                //     break
                // case ts.SyntaxKind.ImportType:
                //     console.log(1);
                //     break
                // case ts.SyntaxKind.NamespaceImport:
                //     console.log(1);
                //     break
                // case ts.SyntaxKind.NamedImports:
                //     console.log(1);
                //     break
                case ts.SyntaxKind.ImportDeclaration:
                    if (!(<any>node).importClause) {
                        break;
                    }
                    let pathToResolve = (<any>node).moduleSpecifier.getText().replace(RegExp("^['|\"]+"), '').replace(RegExp("['|\"]+$"), '');
                    let resolvedPath = importResolver.resolve(pathToResolve, fileName);
                    if ((<any>node).importClause.namedBindings.name) {
                        imports.set((<any>node).importClause.namedBindings.name.getText(), resolvedPath);
                    } else {
                        for (let el of (<any>node).importClause.namedBindings.elements) {
                            imports.set(el.name.getText(), resolvedPath);
                        }
                    }
                    break;

                case ts.SyntaxKind.Decorator:
                    let decoratorReader = new DecoratorReader(node);

                    let typedNode = <Decorator>node;
                    let message = <Identifier>(<CallExpression>typedNode.expression).expression;
                    let decoratorText = message.getText();
                    if (decoratorText === 'Injectable') {
                        componentName = decoratorReader.className;
                        let e = this.entries;
                        if (this.entries.has(decoratorReader.className)) {
                            this.entries.set(decoratorReader.className, {
                                class: decoratorReader.className,
                                codeRefs: new Set(this.entries.get(decoratorReader.className).codeRefs)
                            });
                        } else {
                            this.entries.set(decoratorReader.className, {
                                'class': decoratorReader.className,
                                codeRefs: new Set()
                            })
                        }
                    }
                    if (decoratorText === 'Directive') {
                        componentName = decoratorReader.className;
                        this.entries.set(decoratorReader.className, {
                            'class': decoratorReader.className,
                            codeRefs: new Set()
                        });
                        this.selectors.set(decoratorReader.selector, {
                            'class': decoratorReader.className,
                            'selector': decoratorReader.selector,
                        });
                    }
                    if (decoratorText === 'Component') {
                        componentName = decoratorReader.className;
                        this.entries.set(decoratorReader.className, {
                            'class': decoratorReader.className,
                            codeRefs: new Set(),
                            'template': decoratorReader.getTemplate(fileName)
                        });
                        this.selectors.set(decoratorReader.selector, {
                            'class': decoratorReader.className,
                            'selector': decoratorReader.selector,
                        })
                    }
            }
            ts.forEachChild(node, delintNode);
        };
        delintConstructor(sourceFile);
        delintNode(sourceFile);

        let component = this.entries.get(componentName);
        if (component) {
            component.imports = imports;
            component.fields = fields;
            component.injected = injected;
        }
    }

    private getClassOfObjectCalled(node: ts.Node) {
        console.log(1);
    }
}