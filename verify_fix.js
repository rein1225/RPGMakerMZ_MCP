import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, "index.js");
const projectPath = path.join(__dirname, "test_project");
fs.writeFileSync("verify_log_location.txt", "test");
console.log("Written verify_log_location.txt to " + path.resolve("verify_log_location.txt"));

const server = spawn("node", [serverPath], {
    stdio: ["pipe", "pipe", "pipe"],
});

server.stderr.on("data", (data) => {
    console.error("SERVER STDERR:", data.toString());
    fs.appendFileSync("server_log.txt", data.toString());
});

const sendRequest = (req) => {
    console.log("Sending Request:", req.method, req.params ? req.params.name : "");
    server.stdin.write(JSON.stringify(req) + "\n");
};

server.stdout.on("data", (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const res = JSON.parse(line);
            if (res.result) {
                console.log("Response received.");
                if (res.id === 1) {
                    console.log("Initialized.");
                    // Check if Game.exe exists
                    const gameExePath = path.join(projectPath, "Game.exe");
                    if (!fs.existsSync(gameExePath)) {
                        console.log("WARNING: Game.exe not found in test_project. Skipping run_playtest automation.");
                        console.log("Server initialized successfully.");
                        process.exit(0);
                    }

                    // Call run_playtest with startNewGame: true
                    sendRequest({
                        jsonrpc: "2.0",
                        id: 2,
                        method: "tools/call",
                        params: {
                            name: "run_playtest",
                            arguments: {
                                projectPath,
                                duration: 8000, // Give enough time for new game transition
                                autoClose: true,
                                debugPort: 9222,
                                startNewGame: true
                            }
                        }
                    });
                } else if (res.id === 2) {
                    console.log("run_playtest result received.");
                    const content = res.result.content;
                    const textItem = content.find(c => c.type === "text");
                    if (textItem) {
                        console.log("Output Text:", textItem.text);
                        if (textItem.text.includes("New Game: true")) {
                            console.log("SUCCESS: New Game automation triggered.");
                        } else {
                            console.log("WARNING: New Game automation NOT triggered? Check Output Text above.");
                        }
                    } else {
                        console.log("No text content found in response.");
                        console.log("Full Result:", JSON.stringify(res.result, null, 2));
                    }
                    process.exit(0);
                }
            } else if (res.error) {
                console.error("Error:", res.error);
                process.exit(1);
            }
        } catch (e) {
            // ignore
        }
    }
});

// Initialize
sendRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test-runner", version: "1.0" } }
});
