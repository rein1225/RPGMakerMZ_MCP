import puppeteer, { Browser, Page } from "puppeteer";
import { spawn, ChildProcess } from "child_process";
import fs from "fs/promises";
import path from "path";
import screenshot from "screenshot-desktop";
import { validateProjectPath, sleep } from "../utils/validation.js";
import { Logger } from "../utils/logger.js";
import { DEFAULTS } from "../utils/constants.js";
import { HandlerResponse } from "../types/index.js";
import { Server } from "http";

type ProjectArgs = { projectPath: string };
type RunPlaytestArgs = ProjectArgs & {
    duration?: number;
    autoClose?: boolean;
    debugPort?: number;
    startNewGame?: boolean;
};
type InspectGameStateArgs = { port?: number; script: string };

type HandlerContent = { type: string; text?: string; data?: string };
type HandlerResult = { content: HandlerContent[]; isError?: boolean };

export async function runPlaytest(args: RunPlaytestArgs): Promise<HandlerResult> {
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

    let gameProcess: ChildProcess | undefined;
    let server: Server | undefined;
    let browser: Browser | undefined;
    let result: HandlerResult = { content: [] };
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

            await new Promise<void>((resolve, reject) => {
                server!.once('error', (err) => {
                    reject(err);
                });
                server!.listen(0, () => resolve());
            });
            const port = (server!.address() as { port: number }).port;
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
                } catch (e: unknown) {
                    const err = e as Error;
                    result.content.push({ type: "text", text: `Game launched but failed to take screenshot: ${err.message}` });
                    result.isError = true;
                }
            }
        }
    } catch (e: unknown) {
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
                    if (process.platform === 'win32' && gameProcess.pid) {
                        spawn("taskkill", ["/pid", gameProcess.pid.toString(), "/f", "/t"]);
                        result.content.push({ type: "text", text: "Game process terminated (autoClose: true)." });
                    } else {
                        gameProcess.kill();
                        result.content.push({ type: "text", text: "Game process kill signal sent." });
                    }
                } catch (e: unknown) {
                    const err = e as Error;
                    result.content.push({ type: "text", text: `Failed to close game process: ${err.message}` });
                }
            }
        }
    }

    return result;
}

async function captureGameScreenshot(
    page: Page,
    startNewGame: boolean,
    duration: number,
    startTime: number
): Promise<HandlerContent[]> {
    const content: HandlerContent[] = [];
    try {
        await page.waitForSelector('#gameCanvas', { timeout: duration });
        await Logger.debug("Found #gameCanvas.");

        if (startNewGame) {
            await Logger.debug("Attempting to start new game...");
            try {
                await page.waitForFunction(() => {
                    const win = globalThis as any;
                    return win.SceneManager && win.SceneManager._scene && win.SceneManager._scene.constructor.name === 'Scene_Title';
                }, { timeout: 10000 });
                await Logger.debug("Scene_Title detected.");
                await page.evaluate(() => { 
                    const win = globalThis as any;
                    win.DataManager.setupNewGame(); 
                    win.SceneManager.goto(win.Scene_Map); 
                });
                await Logger.debug("New Game command sent.");
            } catch (e: unknown) {
                const err = e as Error;
                await Logger.debug(`Failed to start new game: ${err.message}`);
            }
        }

        const remainingTime = Math.max(2000, duration - (Date.now() - startTime));
        try {
            await page.waitForFunction((targetScene: string | null) => {
                const win = globalThis as any;
                if (!win.SceneManager || !win.SceneManager._scene) return false;
                const sceneName = win.SceneManager._scene.constructor.name;
                if (sceneName === 'Scene_Boot') return false;
                if (targetScene && sceneName !== targetScene) return false;
                return true;
            }, { timeout: remainingTime }, startNewGame ? 'Scene_Map' : null);
            await Logger.debug("Scene ready check passed.");
        } catch (e: unknown) {
            await Logger.debug("Scene ready check timed out.");
        }

        await sleep(1000);

        try {
            const canvasDataUrl = await page.evaluate(() => {
                const canvas = (globalThis as any).document.querySelector('#gameCanvas');
                return canvas.toDataURL('image/png');
            });
            const base64Data = canvasDataUrl.replace(/^data:image\/png;base64,/, "");
            content.push({ type: "image/png", data: base64Data });
            content.push({ type: "text", text: `Game launched and screenshot taken via Canvas.toDataURL. (New Game: ${startNewGame})` });
            await Logger.debug("Screenshot taken via Canvas.toDataURL.");
        } catch (e: unknown) {
            const err = e as Error;
            await Logger.debug(`Canvas toDataURL failed: ${err.message}`);
            const base64Img = await page.screenshot({ encoding: 'base64' }) as string;
            content.push({ type: "image/png", data: base64Img });
            content.push({ type: "text", text: `Game launched and screenshot taken via Puppeteer page.screenshot. (New Game: ${startNewGame})` });
            await Logger.debug("Screenshot taken via page.screenshot.");
        }
    } catch (e: unknown) {
        await Logger.error("Puppeteer operation failed", e);
    }
    return content;
}

export async function inspectGameState(args: InspectGameStateArgs): Promise<HandlerResponse> {
    const { port = DEFAULTS.PORT, script } = args;

    // Security Warning: Evaluating arbitrary code is dangerous.
    // Ensure this tool is only used in a trusted local environment.
    await Logger.warn(`Executing arbitrary code via inspect_game_state: ${script}`);

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
    } catch (error: unknown) {
        const err = error as Error;
        throw new Error(`Failed to inspect game state: ${err.message}`);
    }
}
