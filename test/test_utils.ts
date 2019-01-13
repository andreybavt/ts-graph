import * as fs from "fs";
import * as path from "path";

export function traverseDir(dir): string[] {
    const res = [];
    fs.readdirSync(dir).forEach(file => {
        let fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            res.push(...traverseDir(fullPath));
        } else {
            res.push(fullPath);
        }
    });
    return res;
}