import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE_PATH = path.join(__dirname, '..', 'server.log');
const DEBUG_LOG_PATH = path.join(__dirname, '..', 'debug_log.txt');

export const Logger = {
    async info(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [INFO] ${message}\n`;
        console.log(logMessage.trim());
        try {
            await fs.appendFile(LOG_FILE_PATH, logMessage);
        } catch (e) {
            console.error("Failed to write to log file:", e);
        }
    },

    async error(message, error) {
        const timestamp = new Date().toISOString();
        const errorStack = error instanceof Error ? error.stack : error;
        const logMessage = `[${timestamp}] [ERROR] ${message}: ${errorStack}\n`;
        console.error(logMessage.trim());
        try {
            await fs.appendFile(LOG_FILE_PATH, logMessage);
        } catch (e) {
            console.error("Failed to write to log file:", e);
        }
    },

    async debug(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [DEBUG] ${message}\n`;
        // Debug logs might be too verbose for console, so mainly file
        try {
            await fs.appendFile(DEBUG_LOG_PATH, logMessage);
        } catch (e) {
            // Ignore debug log errors
        }
    }
};
