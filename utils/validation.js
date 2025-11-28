import fs from "fs/promises";
import path from "path";

export async function validateProjectPath(projectPath) {
    try {
        const stats = await fs.stat(projectPath);
        if (!stats.isDirectory()) {
            throw new Error(`Path is not a directory: ${projectPath}`);
        }
        const projectFile = path.join(projectPath, "game.rmmzproject");
        try {
            await fs.access(projectFile);
        } catch {
            throw new Error(`Not a valid RPG Maker MZ project (game.rmmzproject not found): ${projectPath}`);
        }
    } catch (error) {
        throw new Error(`Invalid project path: ${error.message}`);
    }
}

export async function getFilesRecursively(dir) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.join(dir, dirent.name);
        return dirent.isDirectory() ? getFilesRecursively(res) : res;
    }));
    return Array.prototype.concat(...files);
}

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
