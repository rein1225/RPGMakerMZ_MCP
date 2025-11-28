if (name === "search_events") {
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

if (name === "run_playtest") {
    const { projectPath, duration = 5000, autoClose = false, debugPort = 9222, startNewGame = false } = args;
    await validateProjectPath(projectPath);

    const gameExePath = path.join(projectPath, "Game.exe");
    try {
        await fs.access(gameExePath);
    } catch {
        throw new Error(`Game.exe not found at ${gameExePath}. Please deploy the game or provide correct path.`);
    }

    await fs.appendFile("debug_log.txt", `Launching game: ${gameExePath} with remote debugging on port ${debugPort}\n`);
    console.error(`Launching game: ${gameExePath} with remote debugging on port ${debugPort}`);

    const spawnArgs = [`--remote-debugging-port=${debugPort}`];
    const gameProcess = spawn(gameExePath, spawnArgs, { detached: true, stdio: 'ignore' });
    gameProcess.unref();

    let result = { content: [] };
    let browser;
    let capturedViaPuppeteer = false;
    const startTime = Date.now();
    const maxWaitTime = Math.max(duration + 10000, 20000);

    try {
        let connected = false;
        while (Date.now() - startTime < maxWaitTime) {
            try {
                browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${debugPort}`, defaultViewport: null });
                connected = true;
                await fs.appendFile("debug_log.txt", "Puppeteer connected successfully.\n");
                break;
            } catch (e) {
                await sleep(1000);
            }
        }

        if (connected && browser) {
            const pages = await browser.pages();
            const page = pages[0];
            if (page) {
                try {
                    await page.waitForSelector('#gameCanvas', { timeout: duration });
                    await fs.appendFile("debug_log.txt", "Found #gameCanvas.\n");

                    if (startNewGame) {
                        await fs.appendFile("debug_log.txt", "Attempting to start new game...\n");
                        try {
                            await page.waitForFunction(() => {
                                return window.SceneManager && window.SceneManager._scene && window.SceneManager._scene.constructor.name === 'Scene_Title';
                            }, { timeout: 10000 });
                            await fs.appendFile("debug_log.txt", "Scene_Title detected.\n");
                            await page.evaluate(() => { DataManager.setupNewGame(); SceneManager.goto(Scene_Map); });
                            await fs.appendFile("debug_log.txt", "New Game command sent.\n");
                        } catch (e) {
                            await fs.appendFile("debug_log.txt", `Failed to start new game: ${e.message}\n`);
                        }
                    }

                    const remainingTime = Math.max(2000, duration - (Date.now() - startTime));
                    try {
                        await page.waitForFunction((targetScene) => {
                            if (!window.SceneManager || !window.SceneManager._scene) return false;
                            const sceneName = window.SceneManager._scene.constructor.name;
                            if (sceneName === 'Scene_Boot') return false;
                            if (targetScene && sceneName !== targetScene) return false;
                            return true;
                        }, { timeout: remainingTime }, startNewGame ? 'Scene_Map' : null);
                        await fs.appendFile("debug_log.txt", "Scene ready check passed.\n");
                    } catch (e) {
                        await fs.appendFile("debug_log.txt", "Scene ready check timed out.\n");
                    }

                    await sleep(1000);

                    try {
                        const canvasDataUrl = await page.evaluate(() => {
                            const canvas = document.querySelector('#gameCanvas');
                            return canvas.toDataURL('image/png');
                        });
                        const base64Data = canvasDataUrl.replace(/^data:image\/png;base64,/, "");
                        result.content.push({ type: "image/png", data: base64Data });
                        result.content.push({ type: "text", text: `Game launched and screenshot taken via Canvas.toDataURL. (New Game: ${startNewGame})` });
                        capturedViaPuppeteer = true;
                        await fs.appendFile("debug_log.txt", "Screenshot taken via Canvas.toDataURL.\n");
                    } catch (e) {
                        await fs.appendFile("debug_log.txt", `Canvas toDataURL failed: ${e.message}\n`);
                        const base64Img = await page.screenshot({ encoding: 'base64' });
                        result.content.push({ type: "image/png", data: base64Img });
                        result.content.push({ type: "text", text: `Game launched and screenshot taken via Puppeteer page.screenshot. (New Game: ${startNewGame})` });
                        capturedViaPuppeteer = true;
                        await fs.appendFile("debug_log.txt", "Screenshot taken via page.screenshot.\n");
                    }
                } catch (e) {
                    await fs.appendFile("debug_log.txt", `Puppeteer operation failed: ${e.message}\n`);
                }
            }
        } else {
            await fs.appendFile("debug_log.txt", "Puppeteer failed to connect.\n");
        }
    } catch (e) {
        await fs.appendFile("debug_log.txt", `Puppeteer connection logic error: ${e.message}\n`);
    } finally {
        if (browser) await browser.disconnect();
    }

    if (!capturedViaPuppeteer) {
        console.error("Falling back to desktop screenshot");
        const elapsed = Date.now() - startTime;
        if (elapsed < duration) await sleep(duration - elapsed);
        try {
            const imgBuffer = await screenshot({ format: 'png' });
            const base64Img = imgBuffer.toString('base64');
            result.content.push({ type: "image/png", data: base64Img });
            result.content.push({ type: "text", text: "Game launched and screenshot taken (Desktop Fallback)." });
        } catch (e) {
            result.content.push({ type: "text", text: `Game launched but failed to take screenshot: ${e.message}` });
            result.isError = true;
        }
    }

    if (autoClose) {
        try {
            if (process.platform === 'win32') {
                spawn("taskkill", ["/pid", gameProcess.pid, "/f", "/t"]);
                result.content.push({ type: "text", text: "Game process terminated (autoClose: true)." });
            } else {
                gameProcess.kill();
                result.content.push({ type: "text", text: "Game process kill signal sent." });
            }
        } catch (e) {
            result.content.push({ type: "text", text: `Failed to close game process: ${e.message}` });
        }
    }
    return result;
}

if (name === "get_event_page") {
    const { projectPath, mapId, eventId, pageIndex } = args;
    await validateProjectPath(projectPath);
    const mapData = await loadMapData(projectPath, mapId);
    const list = getEventPageList(mapData, eventId, pageIndex);
    const annotatedList = list.map(annotateCommand);
    return { content: [{ type: "text", text: JSON.stringify(annotatedList, null, 2) }] };
}

if (name === "add_dialogue") {
    const { projectPath, mapId, eventId, pageIndex, insertPosition, text, face = "", faceIndex = 0, background = 0, position = 2 } = args;
    await validateProjectPath(projectPath);
    const mapData = await loadMapData(projectPath, mapId);
    const list = getEventPageList(mapData, eventId, pageIndex);
    const pos = insertPosition === -1 ? list.length - 1 : insertPosition;
    const cmds = [];
    cmds.push({ code: 101, indent: 0, parameters: [face, faceIndex, background, position] });
    const lines = text.split('\n');
    lines.forEach(line => { cmds.push({ code: 401, indent: 0, parameters: [line] }); });
    list.splice(pos, 0, ...cmds);
    await saveMapData(projectPath, mapId, mapData);
    return { content: [{ type: "text", text: "Added dialogue." }] };
}

if (name === "add_choice") { throw new Error("Tool 'add_choice' is temporarily unavailable (restoration in progress)."); }
if (name === "set_switch") { throw new Error("Tool 'set_switch' is temporarily unavailable (restoration in progress)."); }
if (name === "show_picture") { throw new Error("Tool 'show_picture' is temporarily unavailable (restoration in progress)."); }
if (name === "create_map") { throw new Error("Tool 'create_map' is temporarily unavailable (restoration in progress)."); }
if (name === "check_assets_integrity") { throw new Error("Tool 'check_assets_integrity' is temporarily unavailable (restoration in progress)."); }


