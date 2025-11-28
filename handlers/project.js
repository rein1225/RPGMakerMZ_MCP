import fs from "fs/promises";
import path from "path";
import { validateProjectPath, getFilesRecursively } from "../utils/validation.js";

export async function getProjectInfo(args) {
    const { projectPath } = args;
    await validateProjectPath(projectPath);

    const systemPath = path.join(projectPath, "data", "System.json");
    const content = await fs.readFile(systemPath, "utf-8");
    const systemData = JSON.parse(content);

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    gameTitle: systemData.gameTitle,
                    versionId: systemData.versionId,
                    locale: systemData.locale,
                    currencyUnit: systemData.currencyUnit,
                }, null, 2),
            },
        ],
    };
}

export async function listDataFiles(args) {
    const { projectPath } = args;
    await validateProjectPath(projectPath);

    const dataDir = path.join(projectPath, "data");
    const files = await fs.readdir(dataDir);
    const jsonFiles = files.filter(f => f.endsWith(".json"));

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(jsonFiles, null, 2),
            },
        ],
    };
}

export async function readDataFile(args) {
    const { projectPath, filename } = args;
    await validateProjectPath(projectPath);

    if (!filename.endsWith(".json")) {
        throw new Error("Only .json files can be read");
    }

    const filePath = path.join(projectPath, "data", filename);
    const content = await fs.readFile(filePath, "utf-8");

    return {
        content: [
            {
                type: "text",
                text: content,
            },
        ],
    };
}

export async function writeDataFile(args) {
    const { projectPath, filename, content } = args;
    await validateProjectPath(projectPath);

    if (!filename.endsWith(".json")) {
        throw new Error("Only .json files can be written");
    }

    JSON.parse(content);

    const filePath = path.join(projectPath, "data", filename);
    await fs.writeFile(filePath, content, "utf-8");

    return {
        content: [
            {
                type: "text",
                text: `Successfully wrote to ${filename}`,
            },
        ],
    };
}

export async function listAssets(args) {
    const { projectPath, assetType = "all" } = args;
    await validateProjectPath(projectPath);

    const results = {};

    if (assetType === "img" || assetType === "all") {
        const imgDir = path.join(projectPath, "img");
        try {
            const files = await getFilesRecursively(imgDir);
            results.img = files.map(f => path.relative(projectPath, f).replace(/\\/g, "/"));
        } catch (e) {
            results.img = [`Error reading img directory: ${e.message}`];
        }
    }

    if (assetType === "audio" || assetType === "all") {
        const audioDir = path.join(projectPath, "audio");
        try {
            const files = await getFilesRecursively(audioDir);
            results.audio = files.map(f => path.relative(projectPath, f).replace(/\\/g, "/"));
        } catch (e) {
            results.audio = [`Error reading audio directory: ${e.message}`];
        }
    }

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(results, null, 2),
            },
        ],
    };
}

export async function checkAssetsIntegrity(args) {
    const { projectPath } = args;
    await validateProjectPath(projectPath);

    const issues = [];
    const dataDir = path.join(projectPath, "data");

    // Check for referenced images in database
    const checkImageReferences = async (dataFile, propertyName) => {
        try {
            const filePath = path.join(dataDir, dataFile);
            const data = JSON.parse(await fs.readFile(filePath, "utf-8"));

            for (const item of data) {
                if (!item) continue;
                const imageName = item[propertyName];
                if (imageName && imageName !== "") {
                    // Check if image exists (simplified - just check characters folder)
                    const imgPath = path.join(projectPath, "img", "characters", `${imageName}.png`);
                    try {
                        await fs.access(imgPath);
                    } catch {
                        issues.push({
                            type: "missing_image",
                            file: dataFile,
                            itemId: item.id,
                            itemName: item.name || "Unknown",
                            imageName: imageName,
                            expectedPath: `img/characters/${imageName}.png`
                        });
                    }
                }
            }
        } catch (e) {
            // File doesn't exist or can't be read
        }
    };

    // Check actors for character images
    await checkImageReferences("Actors.json", "characterName");

    // Check for orphaned map files
    try {
        const mapInfosPath = path.join(dataDir, "MapInfos.json");
        const mapInfos = JSON.parse(await fs.readFile(mapInfosPath, "utf-8"));
        const mapFiles = await fs.readdir(dataDir);

        for (const file of mapFiles) {
            if (file.match(/^Map(\d{3})\.json$/)) {
                const mapId = parseInt(file.match(/^Map(\d{3})\.json$/)[1]);
                if (!mapInfos[mapId]) {
                    issues.push({
                        type: "orphaned_map",
                        file: file,
                        mapId: mapId
                    });
                }
            }
        }
    } catch (e) {
        // Ignore errors
    }

    return {
        content: [{
            type: "text",
            text: issues.length === 0
                ? "No asset integrity issues found."
                : `Found ${issues.length} issue(s):\n${JSON.stringify(issues, null, 2)}`
        }]
    };
}
