import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, "index.js");
const projectPath = path.join(__dirname, "test_project");

const server = spawn("node", [serverPath], {
    stdio: ["pipe", "pipe", "pipe"],
});

server.stderr.on("data", (data) => {
    // console.error("SERVER STDERR:", data.toString());
});

let requestId = 1;
const pendingRequests = new Map();

const sendRequest = (method, params) => {
    return new Promise((resolve, reject) => {
        const id = requestId++;
        const req = {
            jsonrpc: "2.0",
            id,
            method,
            params
        };
        pendingRequests.set(id, { resolve, reject, method, name: params?.name });
        server.stdin.write(JSON.stringify(req) + "\n");
    });
};

server.stdout.on("data", (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const res = JSON.parse(line);
            if (pendingRequests.has(res.id)) {
                const { resolve, reject, name } = pendingRequests.get(res.id);
                pendingRequests.delete(res.id);
                if (res.result) {
                    console.log(`✅ [${name || 'init'}] Success`);
                    resolve(res.result);
                } else {
                    console.error(`❌ [${name || 'init'}] Error: ${res.error.message}`);
                    resolve({ error: res.error }); // Resolve with error to continue testing
                }
            }
        } catch (e) { }
    }
});

async function runTests() {
    console.log("Starting verification of all tools...");

    // Initialize
    await sendRequest("initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test-runner", version: "1.0" } });

    // 1. Basic Info & Files
    await sendRequest("tools/call", { name: "get_project_info", arguments: { projectPath } });
    await sendRequest("tools/call", { name: "list_data_files", arguments: { projectPath } });
    await sendRequest("tools/call", { name: "read_data_file", arguments: { projectPath, filename: "Actors.json" } });
    await sendRequest("tools/call", { name: "list_assets", arguments: { projectPath, assetType: "all" } });

    // 2. Database Updates
    await sendRequest("tools/call", { name: "add_actor", arguments: { projectPath, name: "Test Actor" } });
    await sendRequest("tools/call", { name: "add_item", arguments: { projectPath, name: "Test Item" } });
    await sendRequest("tools/call", { name: "add_skill", arguments: { projectPath, name: "Test Skill" } });

    // 3. Plugin Management
    await sendRequest("tools/call", { name: "write_plugin_code", arguments: { projectPath, filename: "TestPlugin.js", code: "// Test Plugin" } });
    await sendRequest("tools/call", { name: "get_plugins_config", arguments: { projectPath } });
    // update_plugins_config skipped to avoid messing up real config too much, but could test if needed

    // 4. Map & Event Operations (Map001.json, Event 1)
    // We assume Map001.json exists and has at least one event (Event 1).
    // If not, these might fail, which is a valid test result.
    const mapId = 1;
    const eventId = 1;
    const pageIndex = 0;

    await sendRequest("tools/call", { name: "search_events", arguments: { projectPath, query: "Show Text" } });

    // Get page first to see initial state
    await sendRequest("tools/call", { name: "get_event_page", arguments: { projectPath, mapId, eventId, pageIndex } });

    // Add Dialogue
    await sendRequest("tools/call", { name: "add_dialogue", arguments: { projectPath, mapId, eventId, pageIndex, insertPosition: 0, text: "Test Dialogue" } });

    // Add Conditional Branch
    await sendRequest("tools/call", {
        name: "add_conditional_branch", arguments: {
            projectPath, mapId, eventId, pageIndex, insertPosition: 0,
            condition: { code: 0, dataA: 1, operation: 0, dataB: 0 } // If Switch 1 is ON
        }
    });

    // Add Loop
    await sendRequest("tools/call", { name: "add_loop", arguments: { projectPath, mapId, eventId, pageIndex, insertPosition: 0 } });

    // Add Break Loop
    await sendRequest("tools/call", { name: "add_break_loop", arguments: { projectPath, mapId, eventId, pageIndex, insertPosition: 1 } }); // Inside loop roughly

    // Draw Map Tile (Safe coordinates)
    await sendRequest("tools/call", { name: "draw_map_tile", arguments: { projectPath, mapId, x: 0, y: 0, layer: 0, tileId: 1555 } });

    // 5. Playtest & Debug (Expect failure/skip if Game.exe missing)
    // We check for Game.exe first to verify the tool handles it, but here we just call it.
    // The server implementation throws if Game.exe is missing.
    console.log("Testing run_playtest (Expect error if Game.exe missing)...");
    await sendRequest("tools/call", { name: "run_playtest", arguments: { projectPath, duration: 1000, autoClose: true } });

    console.log("Testing inspect_game_state (Expect error if game not running)...");
    await sendRequest("tools/call", { name: "inspect_game_state", arguments: { script: "1+1" } });

    console.log("Verification complete.");
    process.exit(0);
}

runTests();
