import { createRequire } from "module";
const require = createRequire(import.meta.url);
const robot = require("robotjs");
import screenshot from "screenshot-desktop";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const projectPath = path.join(__dirname, "../test_project");
const gameExePath = path.join(projectPath, "Game.exe");
const screenshotDir = path.join(__dirname, "screenshots");

// Ensure screenshot directory exists
if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runAutomation() {
    console.log("=== Starting GUI Automation PoC (robotjs) ===");

    // 1. Launch the game
    console.log(`Launching game from: ${gameExePath}`);

    if (!fs.existsSync(gameExePath)) {
        console.error("Game.exe not found! Please deploy the game or provide the path to Game.exe.");
        // For PoC, we continue to see if we can take a screenshot of the desktop at least.
    } else {
        const gameProcess = spawn(gameExePath, [], {
            detached: true,
            stdio: 'ignore'
        });
        gameProcess.unref();
    }

    console.log("Waiting for game window (5 seconds)...");
    await sleep(5000);

    // 2. Take a screenshot
    console.log("Taking screenshot...");
    const screenshotPath = path.join(screenshotDir, "title_screen.png");
    try {
        await screenshot({ filename: screenshotPath });
        console.log(`Screenshot saved to: ${screenshotPath}`);
    } catch (e) {
        console.error("Failed to capture screenshot:", e);
    }

    // 3. Simulate Input (Example: Press Enter)
    console.log("Simulating Enter key press...");
    robot.keyTap("enter");

    console.log("=== Automation Finished ===");
}

runAutomation();
