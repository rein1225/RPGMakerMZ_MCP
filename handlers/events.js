import { validateProjectPath } from "../utils/validation.js";
import { loadMapData, saveMapData, getEventPageList } from "../utils/mapHelpers.js";
import { annotateCommand } from "../utils/commandAnnotator.js";
import { EVENT_CODES } from "../utils/constants.js";
import fs from "fs/promises";
import path from "path";

export async function getEventPage(args) {
    const { projectPath, mapId, eventId, pageIndex } = args;
    await validateProjectPath(projectPath);
    const mapData = await loadMapData(projectPath, mapId);
    const list = getEventPageList(mapData, eventId, pageIndex, mapId);
    const annotatedList = list.map(annotateCommand);
    return { content: [{ type: "text", text: JSON.stringify(annotatedList, null, 2) }] };
}

export async function addDialogue(args) {
    const { projectPath, mapId, eventId, pageIndex, insertPosition, text, face = "", faceIndex = 0, background = 0, position = 2 } = args;
    await validateProjectPath(projectPath);
    const mapData = await loadMapData(projectPath, mapId);
    const list = getEventPageList(mapData, eventId, pageIndex, mapId);
    const pos = insertPosition === -1 ? list.length - 1 : insertPosition;
    const cmds = [];
    cmds.push({ code: EVENT_CODES.SHOW_TEXT, indent: 0, parameters: [face, faceIndex, background, position] });
    const lines = text.split('\n');
    lines.forEach(line => { cmds.push({ code: EVENT_CODES.TEXT_DATA, indent: 0, parameters: [line] }); });
    list.splice(pos, 0, ...cmds);
    await saveMapData(projectPath, mapId, mapData);
    return { content: [{ type: "text", text: "Added dialogue." }] };
}

export async function addChoice(args) {
    const { projectPath, mapId, eventId, pageIndex, insertPosition, options, cancelType = -1 } = args;
    await validateProjectPath(projectPath);

    const mapData = await loadMapData(projectPath, mapId);
    const list = getEventPageList(mapData, eventId, pageIndex, mapId);
    const pos = insertPosition === -1 ? list.length - 1 : insertPosition;

    const cmds = [];
    // Show Choices
    cmds.push({ code: EVENT_CODES.SHOW_CHOICES, indent: 0, parameters: [options, cancelType] });

    // When [choice]
    options.forEach((opt, i) => {
        cmds.push({ code: EVENT_CODES.CHOICE_WHEN, indent: 0, parameters: [i, opt] });
        cmds.push({ code: 0, indent: 1, parameters: [] }); // Empty command for content
    });

    // End
    cmds.push({ code: EVENT_CODES.CHOICE_END, indent: 0, parameters: [] });

    list.splice(pos, 0, ...cmds);
    await saveMapData(projectPath, mapId, mapData);

    return { content: [{ type: "text", text: `Added choice with ${options.length} options.` }] };
}

export async function showPicture(args) {
    const { projectPath, mapId, eventId, pageIndex, insertPosition, pictureId = 1, pictureName, origin = 0, x = 0, y = 0 } = args;
    await validateProjectPath(projectPath);

    const mapData = await loadMapData(projectPath, mapId);
    const list = getEventPageList(mapData, eventId, pageIndex, mapId);
    const pos = insertPosition === -1 ? list.length - 1 : insertPosition;

    // Show Picture
    // parameters: [pictureId, pictureName, origin, x, y, scaleX, scaleY, opacity, blendMode]
    const cmd = {
        code: EVENT_CODES.SHOW_PICTURE,
        indent: 0,
        parameters: [pictureId, pictureName, origin, x, y, 100, 100, 255, 0]
    };

    list.splice(pos, 0, cmd);
    await saveMapData(projectPath, mapId, mapData);

    return { content: [{ type: "text", text: `Added show picture command for "${pictureName}" (ID: ${pictureId}).` }] };
}

export async function addLoop(args) {
    const { projectPath, mapId, eventId, pageIndex, insertPosition } = args;
    await validateProjectPath(projectPath);

    const mapData = await loadMapData(projectPath, mapId);
    const list = getEventPageList(mapData, eventId, pageIndex, mapId);

    const pos = insertPosition === -1 ? list.length - 1 : insertPosition;

    const loopCmd = { code: EVENT_CODES.LOOP, indent: 0, parameters: [] };
    const repeatCmd = { code: EVENT_CODES.LOOP_REPEAT, indent: 0, parameters: [] };

    list.splice(pos, 0, loopCmd, repeatCmd);

    await saveMapData(projectPath, mapId, mapData);

    return {
        content: [{ type: "text", text: "Successfully added Loop block." }],
    };
}

export async function addBreakLoop(args) {
    const { projectPath, mapId, eventId, pageIndex, insertPosition } = args;
    await validateProjectPath(projectPath);

    const mapData = await loadMapData(projectPath, mapId);
    const list = getEventPageList(mapData, eventId, pageIndex, mapId);

    const pos = insertPosition === -1 ? list.length - 1 : insertPosition;
    const cmd = { code: EVENT_CODES.BREAK_LOOP, indent: 0, parameters: [] };

    list.splice(pos, 0, cmd);

    await saveMapData(projectPath, mapId, mapData);

    return {
        content: [{ type: "text", text: "Successfully added Break Loop command." }],
    };
}

export async function addConditionalBranch(args) {
    const { projectPath, mapId, eventId, pageIndex, insertPosition, condition, includeElse = true } = args;
    await validateProjectPath(projectPath);

    const mapData = await loadMapData(projectPath, mapId);
    const list = getEventPageList(mapData, eventId, pageIndex, mapId);

    const pos = insertPosition === -1 ? list.length - 1 : insertPosition;

    const params = [
        condition.code,
        condition.dataA,
        condition.operation,
        condition.dataB,
        condition.class || 0
    ];

    const branchStart = { code: EVENT_CODES.CONDITIONAL_BRANCH, indent: 0, parameters: params };
    const elseCmd = { code: EVENT_CODES.CONDITIONAL_ELSE, indent: 0, parameters: [] };
    const branchEnd = { code: EVENT_CODES.CONDITIONAL_END, indent: 0, parameters: [] };

    if (includeElse) {
        list.splice(pos, 0, branchStart, elseCmd, branchEnd);
    } else {
        list.splice(pos, 0, branchStart, branchEnd);
    }

    await saveMapData(projectPath, mapId, mapData);

    return {
        content: [{ type: "text", text: "Successfully added Conditional Branch." }],
    };
}

export async function deleteEventCommand(args) {
    const { projectPath, mapId, eventId, pageIndex, commandIndex } = args;
    await validateProjectPath(projectPath);

    const mapData = await loadMapData(projectPath, mapId);
    const list = getEventPageList(mapData, eventId, pageIndex, mapId);

    if (commandIndex < 0 || commandIndex >= list.length) {
        throw new Error(`Command index ${commandIndex} out of bounds (0-${list.length - 1})`);
    }

    list.splice(commandIndex, 1);

    await saveMapData(projectPath, mapId, mapData);

    return {
        content: [{ type: "text", text: `Successfully deleted command at index ${commandIndex}.` }],
    };
}

export async function updateEventCommand(args) {
    const { projectPath, mapId, eventId, pageIndex, commandIndex, newCommand } = args;
    await validateProjectPath(projectPath);

    const mapData = await loadMapData(projectPath, mapId);
    const list = getEventPageList(mapData, eventId, pageIndex, mapId);

    if (commandIndex < 0 || commandIndex >= list.length) {
        throw new Error(`Command index ${commandIndex} out of bounds (0-${list.length - 1})`);
    }

    list[commandIndex] = newCommand;

    await saveMapData(projectPath, mapId, mapData);

    return {
        content: [{ type: "text", text: `Successfully updated command at index ${commandIndex}.` }],
    };
}

export async function searchEvents(args) {
    const { projectPath, query } = args;
    await validateProjectPath(projectPath);

    const matches = [];
    const dataDir = path.join(projectPath, "data");

    const searchInList = (list, sourceName) => {
        if (!list) return;
        list.forEach((ev) => {
            if (!ev) return;
            const eventName = ev.name || `Event ${ev.id}`;
            if (ev.pages) {
                ev.pages.forEach((page, pageIndex) => {
                    if (page.list) {
                        page.list.forEach((cmd, cmdIndex) => {
                            const paramStr = JSON.stringify(cmd.parameters);
                            const codeStr = cmd.code.toString();
                            if (paramStr.includes(query) || (query === codeStr)) {
                                matches.push({
                                    source: sourceName,
                                    event: eventName,
                                    eventId: ev.id,
                                    page: pageIndex + 1,
                                    line: cmdIndex + 1,
                                    code: cmd.code,
                                    parameters: cmd.parameters
                                });
                            }
                        });
                    }
                });
            }
        });
    };

    try {
        const commonEventsPath = path.join(dataDir, "CommonEvents.json");
        const commonEvents = JSON.parse(await fs.readFile(commonEventsPath, "utf-8"));
        searchInList(commonEvents, "CommonEvents");
    } catch (e) { }

    try {
        const mapInfosPath = path.join(dataDir, "MapInfos.json");
        const mapInfos = JSON.parse(await fs.readFile(mapInfosPath, "utf-8"));
        for (const mapInfo of mapInfos) {
            if (!mapInfo) continue;
            const mapId = mapInfo.id.toString().padStart(3, "0");
            const mapFilename = `Map${mapId}.json`;
            const mapPath = path.join(dataDir, mapFilename);
            try {
                const mapData = JSON.parse(await fs.readFile(mapPath, "utf-8"));
                searchInList(mapData.events, `Map ${mapInfo.id}: ${mapInfo.name}`);
            } catch (e) { }
        }
    } catch (e) { }

    return {
        content: [{ type: "text", text: JSON.stringify(matches, null, 2) }],
    };
}

