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
