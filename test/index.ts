import * as assert from "assert";
import * as ts from "typescript"
import {traverseDir} from "./test_utils";
import {TsParser} from "../src";
import * as fs from "fs";


// const path = "/home/andrey/git/front/playground/src/app/app.component.ts";
// const path = "/home/andrey/git/front/playground/src/app/app.component.html";
// const pathToResolve = "/home/andrey/git/front/playground/src/app";

const path = "/home/andrey/git/front/ts-node/ng-dss";


describe("index", () => {
    it("should say 'hohoho'", () => {
        // const fileNames = process.argv.slice(2);
        const files = traverseDir(path);
        let tsParser = new TsParser(path);

        files.filter((n: string) => {
            return n.endsWith(".ts");
        }).forEach(fileName => {
            tsParser.delint(fileName);
        });
        //     tsParser.delint('/home/andrey/git/front/ts-node/ng-dss/src/app/features/doctor/task-design/mltask-design-clust-view-switch/mltask-design-clust-view-switch.component.ts');

        for (let [key, value] of tsParser.entries) {
            tsParser.delintHtml(value)
        }
        const links = new Map<string, Map<string, Set<any>>>();
        for (let [currentClass, v] of tsParser.entries) {
            if (!links.has(currentClass)) {
                links.set(currentClass, new Map<string, Set<any>>());
            }
            if (v.fields) {
                for (let [fk, reference] of v.fields) {
                    if (reference.usedProps && reference.usedProps.size) {
                        for (let referencedPropName of reference.usedProps) {
                            if (!links.get(currentClass).has(reference.class)) {
                                links.get(currentClass).set(reference.class, new Set<string>())
                            }
                            links.get(currentClass).get(reference.class).add(referencedPropName);
                        }
                    } else {
                        if (!links.get(currentClass).has(reference.class)) {
                            links.get(currentClass).set(reference.class, new Set<string>())
                        }
                        console.warn(`Possibly unused reference: ${currentClass}.${fk} --> ${reference.class}`);
                    }

                }
            }
            for (let codeRef of v.codeRefs) {
                if (!links.get(currentClass).has(codeRef)) {
                    links.get(currentClass).set(codeRef, new Set<string>())
                }
            }
            // v.codeRefs.forEach(e => {
            //     links.get(currentClass).get(e)
            //     links.get(currentClass).add(e);
            // });
            // v.fields && v.fields.forEach(f => {
            //     f.usedProps.forEach(p => {
            //         links.get(currentClass).add(`${f.class}.${p}`);
            //     })
            // });
        }

        function createD3data() {
            let d3_links = [];
            let nodes = new Set([...tsParser.entries.keys()]);
            for (let [src, targets] of links) {
                for (let [target, props] of targets) {
                    nodes.add(target);
                    if (props.size > 0) {
                        for (let prop of props) {
                            d3_links.push({
                                "source": src,
                                "target": target,
                                "value": prop
                            });
                        }
                    } else {
                        d3_links.push({
                            "source": src,
                            "target": target,
                        });
                    }
                }
            }

            let d3_nodes = [...nodes].map(e => {
                return {id: e}
            });
            return {d3_links, d3_nodes};
        }

        function createD3dataEachMethodSeparate() {
            let d3_links = [];
            // let nodes = new Set([...tsParser.entries.keys()]);
            let nodes = new Set<string>();
            for (let [src, targets] of links) {
                for (let [target, props] of targets) {
                    if (props.size > 0) {
                        for (let prop of props) {
                            let targetName = `${target}.${prop}`;
                            nodes.add(src);
                            nodes.add(targetName);
                            d3_links.push({
                                "source": src,
                                "target": targetName
                            });
                        }
                    } else {
                        // nodes.add(target);
                        // nodes.add(src);
                        // d3_links.push({
                        //     "source": src,
                        //     "target": target,
                        // });
                    }
                }
            }

            let d3_nodes = [...nodes].map(e => {
                return {id: e}
            });
            return {d3_links, d3_nodes};
        }

        let {d3_links, d3_nodes} = createD3dataEachMethodSeparate();

        // let res = [...links].map(e => [...e[1]].map(i => `"${e[0]}" -> "${i}"[len=10]`));
        // let d3_nodesSet = new Set<string>();
        //
        // let d3_links = [...links].map(e => [...e[1]].map(i => {
        //     d3_nodesSet.add(e[0]);
        //     d3_nodesSet.add(i);
        //     return {'source': e[0], 'target': i}
        // })).filter(e => e.length);
        // d3_links = Array.prototype.concat(...d3_links);
        // let d3_nodes = [...d3_nodesSet].map(e => {
        //     return {'id': e}
        // });
        //
        // let graph = Array.prototype.concat(...res).join('\n');
        // graph = `digraph tsgraph { \n${graph}\n}`
        // let e = tsParser.entries;
        // fs.writeFileSync('dist/graph.dot', graph);
        fs.writeFileSync('dist/nodes_d3.json', JSON.stringify(d3_nodes));
        fs.writeFileSync('dist/edges_d3.json', JSON.stringify(d3_links));
        assert.ok(true);
    });

});