import fs from "fs/promises";
import path from "path";
import { Errors } from "./errors.js";

/**
 * Validates that the given path is a valid RPG Maker MZ project directory.
 * @param {string} projectPath - Path to the project directory
 * @returns {Promise<void>}
 * @throws {MCPError} If the path is invalid or not a valid RPG Maker MZ project
 */
export async function validateProjectPath(projectPath) {
    try {
        const stats = await fs.stat(projectPath);
        if (!stats.isDirectory()) {
            throw Errors.projectNotDirectory(projectPath);
        }
        const projectFile = path.join(projectPath, "game.rmmzproject");
        try {
            await fs.access(projectFile);
        } catch {
            throw Errors.projectFileNotFound(projectPath);
        }
    } catch (error) {
        if (error.code && error.code.startsWith('E')) {
            // Already an MCPError, re-throw
            throw error;
        }
        throw Errors.invalidProjectPath(projectPath, error.message);
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
