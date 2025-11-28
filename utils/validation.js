import fs from "fs/promises";
import path from "path";

/**
 * Validates that the given path is a valid RPG Maker MZ project directory.
 * @param {string} projectPath - Path to the project directory
 * @returns {Promise<void>}
 * @throws {Error} If the path is invalid or not a valid RPG Maker MZ project
 */
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

/**
 * Recursively gets all files in a directory.
 * @param {string} dir - Directory path to scan
 * @returns {Promise<string[]>} Array of file paths
 */
export async function getFilesRecursively(dir) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.join(dir, dirent.name);
        return dirent.isDirectory() ? getFilesRecursively(res) : res;
    }));
    return Array.prototype.concat(...files);
}

/**
 * Sleeps for the specified number of milliseconds.
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
