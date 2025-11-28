import { validateProjectPath } from "../utils/validation.js";
import { loadMapData, saveMapData } from "../utils/mapHelpers.js";
import fs from "fs/promises";
import path from "path";

export async function drawMapTile(args) {
    const { projectPath, mapId, x, y, layer, tileId } = args;
    await validateProjectPath(projectPath);

    const mapData = await loadMapData(projectPath, mapId);
    const width = mapData.width;
    const height = mapData.height;

    if (x < 0 || x >= width || y < 0 || y >= height) {
        throw new Error(`Coordinates (${x},${y}) out of bounds (W:${width}, H:${height})`);
    }
    if (layer < 0 || layer > 5) {
        throw new Error(`Layer ${layer} out of bounds (0-5)`);
    }

    // Calculate index in flattened array: (z * height + y) * width + x
    const index = (layer * height + y) * width + x;

    if (index >= mapData.data.length) {
        throw new Error(`Calculated index ${index} out of bounds`);
    }

    mapData.data[index] = tileId;

    await saveMapData(projectPath, mapId, mapData);

    return {
        content: [{ type: "text", text: `Successfully drew tile ${tileId} at (${x},${y}) on layer ${layer}.` }],
    };
}

export async function createMap(args) {
    const { projectPath, mapName, width = 17, height = 13, tilesetId = 1 } = args;
    await validateProjectPath(projectPath);

    const dataDir = path.join(projectPath, "data");

    // Read MapInfos.json to get next available ID
    const mapInfosPath = path.join(dataDir, "MapInfos.json");
    let mapInfos = [];
    try {
        mapInfos = JSON.parse(await fs.readFile(mapInfosPath, "utf-8"));
    } catch (e) {
        // If it doesn't exist, start with [null]
        mapInfos = [null];
    }

    const newMapId = mapInfos.length;
    const mapIdPadded = String(newMapId).padStart(3, "0");

    // Create new map data
    const newMapData = {
        autoplayBgm: false,
        autoplayBgs: false,
        battleback1Name: "",
        battleback2Name: "",
        bgm: { name: "", pan: 0, pitch: 100, volume: 90 },
        bgs: { name: "", pan: 0, pitch: 100, volume: 90 },
        disableDashing: false,
        displayName: mapName,
        encounterList: [],
        encounterStep: 30,
        height: height,
        width: width,
        note: "",
        parallaxLoopX: false,
        parallaxLoopY: false,
        parallaxName: "",
        parallaxShow: true,
        parallaxSx: 0,
        parallaxSy: 0,
        scrollType: 0,
        specifyBattleback: false,
        tilesetId: tilesetId,
        data: new Array(width * height * 6).fill(0),
        events: [null]
    };

    // Save new map file
    const newMapPath = path.join(dataDir, `Map${mapIdPadded}.json`);
    await fs.writeFile(newMapPath, JSON.stringify(newMapData, null, 2), "utf-8");

    // Update MapInfos.json
    mapInfos.push({
        id: newMapId,
        expanded: false,
        name: mapName,
        order: newMapId,
        parentId: 0,
        scrollX: 0,
        scrollY: 0
    });
    await fs.writeFile(mapInfosPath, JSON.stringify(mapInfos, null, 2), "utf-8");

    return {
        content: [{ type: "text", text: `Successfully created map "${mapName}" (ID: ${newMapId}, ${width}x${height}).` }],
    };
}
