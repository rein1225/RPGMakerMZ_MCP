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

            server = http.createServer(async (request, response) => {
                try {
                    return await serveHandler(request, response, {
                        public: projectPath,
                        headers: [
                            { source: "**/*", headers: [{ key: "Access-Control-Allow-Origin", value: "*" }] }
                        ]
                    });
                } catch (e: unknown) {
                    await Logger.error("HTTP server request handler error", e);
                    if (!response.headersSent) {
                        response.statusCode = 500;
                        response.end("Internal Server Error");
                    }
                }
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
        result.isError = true;
        result.content.push({ type: "text", text: `Error during playtest: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
        // Cleanup: Different strategies for fallback vs Game.exe mode
        // Ensure all resources are properly cleaned up even if errors occur
        const cleanupErrors: string[] = [];

        if (useBrowserFallback) {
            // Always close browser in fallback mode
            if (browser) {
                try {
                    await browser.close();
                } catch (e: unknown) {
                    const err = e instanceof Error ? e.message : String(e);
                    cleanupErrors.push(`Failed to close browser: ${err}`);
                    await Logger.error("Failed to close browser during cleanup", e);
                }
            }
            if (server) {
                try {
                    await new Promise<void>((resolve, reject) => {
                        server!.close((err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                } catch (e: unknown) {
                    const err = e instanceof Error ? e.message : String(e);
                    cleanupErrors.push(`Failed to close server: ${err}`);
                    await Logger.error("Failed to close server during cleanup", e);
                }
            }
        } else {
            // Game.exe mode cleanup
            if (browser) {
                try {
                    await browser.disconnect();
                } catch (e: unknown) {
                    const err = e instanceof Error ? e.message : String(e);
                    cleanupErrors.push(`Failed to disconnect browser: ${err}`);
                    await Logger.error("Failed to disconnect browser during cleanup", e);
                }
            }
            if (autoClose && gameProcess) {
                try {
                    if (process.platform === 'win32' && gameProcess.pid) {
                        const killProcess = spawn("taskkill", ["/pid", gameProcess.pid.toString(), "/f", "/t"], { stdio: 'ignore' });
                        killProcess.unref();
                        result.content.push({ type: "text", text: "Game process terminated (autoClose: true)." });
                    } else if (gameProcess.pid) {
                        gameProcess.kill();
                        result.content.push({ type: "text", text: "Game process kill signal sent." });
                    }
                } catch (e: unknown) {
                    const err = e instanceof Error ? e.message : String(e);
                    cleanupErrors.push(`Failed to close game process: ${err}`);
                    await Logger.error("Failed to close game process during cleanup", e);
                    result.content.push({ type: "text", text: `Failed to close game process: ${err}` });
                }
            }
        }

        // Log any cleanup errors
        if (cleanupErrors.length > 0) {
            await Logger.warn(`Cleanup errors occurred: ${cleanupErrors.join('; ')}`);
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

/**
 * Whitelist of allowed property access patterns for game state inspection
 * Only these patterns are allowed to prevent arbitrary code execution
 */
const ALLOWED_ACCESS_PATTERNS = [
    /^\$gameVariables\.value\(\d+\)$/,
    /^\$gameSwitches\.value\(\d+\)$/,
    /^\$gameActors\.actor\(\d+\)$/,
    /^\$gameParty\.members\(\)$/,
    /^\$gameParty\.gold\(\)$/,
    /^\$gameParty\.items\(\)$/,
    /^\$gameParty\.weapons\(\)$/,
    /^\$gameParty\.armors\(\)$/,
    /^\$gameMap\.mapId\(\)$/,
    /^\$gamePlayer\.x\(\)$/,
    /^\$gamePlayer\.y\(\)$/,
    /^\$gamePlayer\.screenX\(\)$/,
    /^\$gamePlayer\.screenY\(\)$/,
    /^SceneManager\._scene$/,
    /^SceneManager\._scene\.constructor\.name$/,
    /^DataManager\._globalId$/,
    /^Graphics\.width$/,
    /^Graphics\.height$/,
] as const;

/**
 * Validates if a script matches allowed access patterns
 */
function isScriptAllowed(script: string): boolean {
    const trimmed = script.trim();
    return ALLOWED_ACCESS_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Safe evaluator that only allows whitelisted property access
 */
function safeEvaluate(script: string): unknown {
    if (!isScriptAllowed(script)) {
        throw new Error(`Script not allowed: ${script}. Only whitelisted RPG Maker MZ game state access patterns are permitted.`);
    }

    // Use Function constructor instead of eval for slightly better sandboxing
    // Still executes in page context, but prevents direct eval scope access
    try {
        const func = new Function('return ' + script);
        return func();
    } catch (e) {
        // If Function constructor fails, try direct property access parsing
        // This handles cases like $gameVariables.value(1) more safely
        const win = globalThis as any;
        
        // Parse simple property access patterns
        if (script.startsWith('$gameVariables.value(')) {
            const match = script.match(/\$gameVariables\.value\((\d+)\)/);
            if (match && win.$gameVariables) {
                return win.$gameVariables.value(parseInt(match[1], 10));
            }
        }
        if (script.startsWith('$gameSwitches.value(')) {
            const match = script.match(/\$gameSwitches\.value\((\d+)\)/);
            if (match && win.$gameSwitches) {
                return win.$gameSwitches.value(parseInt(match[1], 10));
            }
        }
        if (script.startsWith('$gameActors.actor(')) {
            const match = script.match(/\$gameActors\.actor\((\d+)\)/);
            if (match && win.$gameActors) {
                return win.$gameActors.actor(parseInt(match[1], 10));
            }
        }
        if (script === '$gameParty.members()' && win.$gameParty) {
            return win.$gameParty.members();
        }
        if (script === '$gameParty.gold()' && win.$gameParty) {
            return win.$gameParty.gold();
        }
        if (script === '$gameMap.mapId()' && win.$gameMap) {
            return win.$gameMap.mapId();
        }
        if (script === '$gamePlayer.x()' && win.$gamePlayer) {
            return win.$gamePlayer.x();
        }
        if (script === '$gamePlayer.y()' && win.$gamePlayer) {
            return win.$gamePlayer.y();
        }
        if (script === 'SceneManager._scene' && win.SceneManager) {
            return win.SceneManager._scene;
        }
        if (script === 'SceneManager._scene.constructor.name' && win.SceneManager?._scene) {
            return win.SceneManager._scene.constructor.name;
        }
        
        throw new Error(`Failed to evaluate script: ${script}. Error: ${e instanceof Error ? e.message : String(e)}`);
    }
}

export async function inspectGameState(args: InspectGameStateArgs): Promise<HandlerResponse> {
    const { port = DEFAULTS.PORT, script } = args;

    // Security: Input length limit (ReDoS対策)
    const MAX_SCRIPT_LENGTH = 100;
    if (script.length > MAX_SCRIPT_LENGTH) {
        await Logger.error(`Security violation: Script too long`, new Error(`Script length: ${script.length}, max: ${MAX_SCRIPT_LENGTH}`));
        throw new Error(`Script too long (max ${MAX_SCRIPT_LENGTH} chars)`);
    }

    // Security: Validate script against whitelist before execution
    if (!isScriptAllowed(script)) {
        await Logger.error(`Security violation: Attempted to execute non-whitelisted script`, new Error(script));
        throw new Error(`Script not allowed: ${script}. Only whitelisted RPG Maker MZ game state access patterns are permitted.`);
    }

    // Security: ID range validation (1-9999)
    const idMatch = script.match(/\((\d+)\)/);
    if (idMatch) {
        const id = parseInt(idMatch[1], 10);
        if (isNaN(id) || id < 1 || id > 9999) {
            await Logger.error(`Security violation: ID out of range`, new Error(`ID: ${id}`));
            throw new Error(`ID out of allowed range (1-9999): ${id}`);
        }
    }

    await Logger.info(`Executing whitelisted game state access: ${script}`);

    let browser: Browser | undefined;
    try {
        browser = await puppeteer.connect({
            browserURL: `http://127.0.0.1:${port}`,
            defaultViewport: null
        });

        const pages = await browser.pages();
        if (!pages || pages.length === 0) {
            throw new Error("No pages found in browser");
        }

        const page = pages[0];
        // Inject safe evaluator function into page context
        const evalResult = await page.evaluate((code, allowedPatterns) => {
            // Recreate safeEvaluate in page context
            function isScriptAllowed(script: string): boolean {
                const trimmed = script.trim();
                return allowedPatterns.some((pattern: string) => {
                    const regex = new RegExp(pattern);
                    return regex.test(trimmed);
                });
            }

            function safeEvaluate(script: string): unknown {
                if (!isScriptAllowed(script)) {
                    throw new Error(`Script not allowed: ${script}. Only whitelisted RPG Maker MZ game state access patterns are permitted.`);
                }

                try {
                    const func = new Function('return ' + script);
                    return func();
                } catch (e) {
                    const win = globalThis as any;
                    
                    // Parse simple property access patterns
                    if (script.startsWith('$gameVariables.value(')) {
                        const match = script.match(/\$gameVariables\.value\((\d+)\)/);
                        if (match && win.$gameVariables) {
                            return win.$gameVariables.value(parseInt(match[1], 10));
                        }
                    }
                    if (script.startsWith('$gameSwitches.value(')) {
                        const match = script.match(/\$gameSwitches\.value\((\d+)\)/);
                        if (match && win.$gameSwitches) {
                            return win.$gameSwitches.value(parseInt(match[1], 10));
                        }
                    }
                    if (script.startsWith('$gameActors.actor(')) {
                        const match = script.match(/\$gameActors\.actor\((\d+)\)/);
                        if (match && win.$gameActors) {
                            return win.$gameActors.actor(parseInt(match[1], 10));
                        }
                    }
                    if (script === '$gameParty.members()' && win.$gameParty) {
                        return win.$gameParty.members();
                    }
                    if (script === '$gameParty.gold()' && win.$gameParty) {
                        return win.$gameParty.gold();
                    }
                    if (script === '$gameMap.mapId()' && win.$gameMap) {
                        return win.$gameMap.mapId();
                    }
                    if (script === '$gamePlayer.x()' && win.$gamePlayer) {
                        return win.$gamePlayer.x();
                    }
                    if (script === '$gamePlayer.y()' && win.$gamePlayer) {
                        return win.$gamePlayer.y();
                    }
                    if (script === 'SceneManager._scene' && win.SceneManager) {
                        return win.SceneManager._scene;
                    }
                    if (script === 'SceneManager._scene.constructor.name' && win.SceneManager?._scene) {
                        return win.SceneManager._scene.constructor.name;
                    }
                    
                    throw new Error(`Failed to evaluate script: ${script}. Error: ${e instanceof Error ? e.message : String(e)}`);
                }
            }

            return safeEvaluate(code);
        }, script, ALLOWED_ACCESS_PATTERNS.map(p => p.source));

        return {
            content: [
                { type: "text", text: JSON.stringify(evalResult, null, 2) }
            ]
        };
    } catch (error: unknown) {
        const err = error as Error;
        await Logger.error(`Failed to inspect game state`, err);
        throw new Error(`Failed to inspect game state: ${err.message}`);
    } finally {
        if (browser) {
            try {
                await browser.disconnect();
            } catch (e) {
                await Logger.error(`Failed to disconnect browser`, e);
            }
        }
    }
}
