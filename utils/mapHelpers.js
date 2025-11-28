import fs from "fs/promises";
import path from "path";
import { Errors } from "./errors.js";

/**
 * Loads map data from a project directory.
 * @param {string} projectPath - Path to the project directory
 * @param {number} mapId - Map ID to load
 * @returns {Promise<import('../types/index.js').MapData>} Map data object
 * @throws {MCPError} If the map file cannot be read
 */
export async function loadMapData(projectPath, mapId) {
    const mapIdPadded = String(mapId).padStart(3, "0");
    const mapFilePath = path.join(projectPath, "data", `Map${mapIdPadded}.json`);
    try {
        const mapContent = await fs.readFile(mapFilePath, "utf-8");
        return JSON.parse(mapContent);
    } catch (e) {
        if (e.code === 'ENOENT') {
            throw Errors.mapFileNotFound(mapId, projectPath);
        }
        throw Errors.mapFileReadError(mapId, e.message);
    }
}

/**
 * Saves map data to a project directory.
 * @param {string} projectPath - Path to the project directory
 * @param {number} mapId - Map ID to save
 * @param {import('../types/index.js').MapData} mapData - Map data object to save
 * @returns {Promise<void>}
 */
export async function saveMapData(projectPath, mapId, mapData) {
    const mapIdPadded = String(mapId).padStart(3, "0");
    const mapFilePath = path.join(projectPath, "data", `Map${mapIdPadded}.json`);
    await fs.writeFile(mapFilePath, JSON.stringify(mapData, null, 2), "utf-8");
}

/**
 * Gets the event page list from map data.
 * @param {import('../types/index.js').MapData} mapData - Map data object
 * @param {string} eventId - Event ID
 * @param {number} pageIndex - Page index (0-based)
 * @param {number} mapId - Map ID (for error messages)
 * @returns {import('../types/index.js').EventCommand[]} Event page command list
 * @throws {MCPError} If the event or page is not found
 */
export function getEventPageList(mapData, eventId, pageIndex, mapId = null) {
    if (!mapData.events[eventId]) {
        throw Errors.eventNotFound(eventId, mapId || 'unknown');
    }
    const event = mapData.events[eventId];
    if (!event.pages[pageIndex]) {
        throw Errors.eventPageNotFound(eventId, pageIndex, mapId || 'unknown');
    }
    return event.pages[pageIndex].list;
}
