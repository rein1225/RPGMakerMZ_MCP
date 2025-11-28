import fs from "fs/promises";
import path from "path";

/**
 * Loads map data from a project directory.
 * @param {string} projectPath - Path to the project directory
 * @param {number} mapId - Map ID to load
 * @returns {Promise<import('../types/index.js').MapData>} Map data object
 * @throws {Error} If the map file cannot be read
 */
export async function loadMapData(projectPath, mapId) {
    const mapIdPadded = String(mapId).padStart(3, "0");
    const mapFilePath = path.join(projectPath, "data", `Map${mapIdPadded}.json`);
    try {
        const mapContent = await fs.readFile(mapFilePath, "utf-8");
        return JSON.parse(mapContent);
    } catch (e) {
        throw new Error(`Failed to read map file: ${e.message}`);
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
 * @returns {import('../types/index.js').EventCommand[]} Event page command list
 * @throws {Error} If the event or page is not found
 */
export function getEventPageList(mapData, eventId, pageIndex) {
    if (!mapData.events[eventId]) {
        throw new Error(`Event ${eventId} not found in Map`);
    }
    const event = mapData.events[eventId];
    if (!event.pages[pageIndex]) {
        throw new Error(`Page ${pageIndex} not found in Event ${eventId}`);
    }
    return event.pages[pageIndex].list;
}
