import fs from "fs/promises";
import path from "path";

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

export async function saveMapData(projectPath, mapId, mapData) {
    const mapIdPadded = String(mapId).padStart(3, "0");
    const mapFilePath = path.join(projectPath, "data", `Map${mapIdPadded}.json`);
    await fs.writeFile(mapFilePath, JSON.stringify(mapData, null, 2), "utf-8");
}

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
