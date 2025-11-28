import puppeteer from "puppeteer";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import screenshot from "screenshot-desktop";
import { fileURLToPath } from "url";
import { validateProjectPath, sleep } from "../utils/validation.js";
import { Logger } from "../utils/logger.js";
import { DEFAULTS } from "../utils/constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runPlaytest(args) {
    const {
        projectPath,
        duration = DEFAULTS.TIMEOUT,
        autoClose = DEFAULTS.AUTO_CLOSE,
        debugPort = DEFAULTS.PORT,
        startNewGame = DEFAULTS.START_NEW_GAME
    } = args;

    await validateProjectPath(projectPath);

    const gameExePath = path.join(projectPath, "Game.exe");
    let useBrowserFallback = false;

    try {
        await fs.access(gameExePath);
    } catch {
        await Logger.info("Game.exe not found. Falling back to browser-based playtest.");
        useBrowserFallback = true;
    }

    let gameProcess;
    let server;
    let browser;
    let result = { content: [] };
    let capturedViaPuppeteer = false;
    const startTime = Date.now();
    const maxWaitTime = Math.max(duration + 10000, DEFAULTS.MAX_WAIT_TIME);

    try {
        if (useBrowserFallback) {
            // Browser Fallback: Start local server
            const http = await import('http');
            const serveHandlerModule = await import('serve-handler');
            const serveHandler = serveHandlerModule.default || serveHandlerModule;

            server = http.createServer((request, response) => {
                return serveHandler(request, response, {
                    public: projectPath,
                    headers: [
                        { source: "**/*", headers: [{ key: "Access-Control-Allow-Origin", value: "*" }] }
                    ]
                });
            });

            await new Promise((resolve) => server.listen(0, () => resolve()));
            const port = server.address().port;
            await Logger.info(`Local server running on port ${port}`);
            await Logger.debug(`Local server running on port ${port}`);

            // Launch browser
            browser = await puppeteer.launch({
                headless: false,
                defaultViewport: null,
                args: ['--disable-web-security', '--allow-file-access-from-files']
            });

            const pages = await browser.pages();
            let page = pages[0];
            if (!page) page = await browser.newPage();
            await page.goto(`http://localhost:${port}/index.html`);

            // Screenshot logic
            const screenshotContent = await captureGameScreenshot(page, startNewGame, duration, startTime);
            result.content.push(...screenshotContent);
            capturedViaPuppeteer = true;

        } else {
            // Game.exe mode
            await Logger.debug(`Launching game: ${gameExePath} with remote debugging on port ${debugPort}`);
            await Logger.info(`Launching game: ${gameExePath} with remote debugging on port ${debugPort}`);

            const spawnArgs = [`--remote-debugging-port=${debugPort}`];
            gameProcess = spawn(gameExePath, spawnArgs, { detached: true, stdio: 'ignore' });
            gameProcess.unref();

            // Connect to existing Game.exe
            let connected = false;
            while (Date.now() - startTime < maxWaitTime) {
                try {
                    browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${debugPort}`, defaultViewport: null });
                    connected = true;
                    await Logger.debug("Puppeteer connected successfully.");
                    break;
                } catch (e) {
                    await sleep(1000);
                }
            }

            if (!connected) {
                await Logger.debug("Puppeteer failed to connect.");
            }

            if (browser) {
                const pages = await browser.pages();
                const page = pages[0];

                if (page) {
                    const screenshotContent = await captureGameScreenshot(page, startNewGame, duration, startTime);
                    result.content.push(...screenshotContent);
                    capturedViaPuppeteer = true;
                }
            }

            // Desktop screenshot fallback (only for Game.exe mode)
            if (!capturedViaPuppeteer) {
                await Logger.error("Falling back to desktop screenshot", new Error("Puppeteer capture failed"));
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
        }
    } catch (e) {
        await Logger.error("Puppeteer connection logic error", e);
    } finally {
        // Cleanup: Different strategies for fallback vs Game.exe mode
        if (useBrowserFallback) {
            // Always close browser in fallback mode
            if (browser) await browser.close();
            if (server) server.close();
        } else {
            if (browser) await browser.disconnect();
            if (autoClose && gameProcess) {
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
        }
    }

    return result;
}

async function captureGameScreenshot(page, startNewGame, duration, startTime) {
    const content = [];
    try {
        await page.waitForSelector('#gameCanvas', { timeout: duration });
        await Logger.debug("Found #gameCanvas.");

        if (startNewGame) {
            await Logger.debug("Attempting to start new game...");
            try {
                await page.waitForFunction(() => {
                    return window.SceneManager && window.SceneManager._scene && window.SceneManager._scene.constructor.name === 'Scene_Title';
                }, { timeout: 10000 });
                await Logger.debug("Scene_Title detected.");
                await page.evaluate(() => { DataManager.setupNewGame(); SceneManager.goto(Scene_Map); });
                await Logger.debug("New Game command sent.");
            } catch (e) {
                await Logger.debug(`Failed to start new game: ${e.message}`);
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
            await Logger.debug("Scene ready check passed.");
        } catch (e) {
            await Logger.debug("Scene ready check timed out.");
        }

        await sleep(1000);

        try {
            const canvasDataUrl = await page.evaluate(() => {
                const canvas = document.querySelector('#gameCanvas');
                return canvas.toDataURL('image/png');
            });
            const base64Data = canvasDataUrl.replace(/^data:image\/png;base64,/, "");
            content.push({ type: "image/png", data: base64Data });
            content.push({ type: "text", text: `Game launched and screenshot taken via Canvas.toDataURL. (New Game: ${startNewGame})` });
            await Logger.debug("Screenshot taken via Canvas.toDataURL.");
        } catch (e) {
            await Logger.debug(`Canvas toDataURL failed: ${e.message}`);
            const base64Img = await page.screenshot({ encoding: 'base64' });
            content.push({ type: "image/png", data: base64Img });
            content.push({ type: "text", text: `Game launched and screenshot taken via Puppeteer page.screenshot. (New Game: ${startNewGame})` });
            await Logger.debug("Screenshot taken via page.screenshot.");
        }
    } catch (e) {
        await Logger.error("Puppeteer operation failed", e);
    }
    return content;
}

export async function inspectGameState(args) {
    const { port = DEFAULTS.PORT, script } = args;

    try {
        const browser = await puppeteer.connect({
            browserURL: `http://127.0.0.1:${port}`,
            defaultViewport: null
        });

        const pages = await browser.pages();
        if (!pages || pages.length === 0) {
            throw new Error("No pages found in browser");
        }

        const page = pages[0];
        const evalResult = await page.evaluate((code) => {
            return eval(code);
        }, script);

        await browser.disconnect();

        return {
            content: [
                { type: "text", text: JSON.stringify(evalResult, null, 2) }
            ]
        };
    } catch (error) {
        throw new Error(`Failed to inspect game state: ${error.message}`);
    }
}
