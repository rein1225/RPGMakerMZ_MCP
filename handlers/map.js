import { validateProjectPath } from "../utils/validation.js";
import { loadMapData, saveMapData } from "../utils/mapHelpers.js";

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
