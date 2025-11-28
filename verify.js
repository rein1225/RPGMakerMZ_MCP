import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, "index.js");
const projectPath = path.join(__dirname, "test_project");

const server = spawn("node", [serverPath], {
    stdio: ["pipe", "pipe", "inherit"],
});

const requests = [
    {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test-client", version: "1.0" },
        },
    },
    {
        jsonrpc: "2.0",
        method: "notifications/initialized",
    },
    {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
    },
    {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
            name: "get_project_info",
            arguments: { projectPath },
        },
    },
    {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
            name: "list_data_files",
            arguments: { projectPath },
        },
    },
    {
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: {
            name: "read_data_file",
            arguments: { projectPath, filename: "Actors.json" },
        },
    },
    {
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: {
            name: "write_data_file",
            arguments: {
                projectPath,
                filename: "Actors.json",
                content: JSON.stringify([
                    null,
                    {
                        "id": 1,
                        "name": "Reid (Modified)",
                        "classId": 1,
                        "level": 99
                    }
                ], null, 2)
            },
        },
    },
    {
        jsonrpc: "2.0",
        id: 7,
        method: "tools/call",
        params: {
            name: "read_data_file",
            arguments: { projectPath, filename: "Actors.json" },
        },
    },
    {
        jsonrpc: "2.0",
        id: 8,
        method: "tools/call",
        params: {
            name: "write_plugin_code",
            arguments: {
                projectPath,
                filename: "TestPlugin.js",
                code: "/*: \n * @target MZ\n * @plugindesc Test Plugin\n * @author Antigravity\n * @help\n * This is a test plugin.\n */\n\n(() => {\n  console.log('Test Plugin Loaded');\n})();"
            },
        },
    },
    {
        jsonrpc: "2.0",
        id: 9,
        method: "tools/call",
        params: {
            name: "get_plugins_config",
            arguments: { projectPath },
        },
    },
    {
        jsonrpc: "2.0",
        id: 10,
        method: "tools/call",
        params: {
            name: "update_plugins_config",
            arguments: {
                projectPath,
                plugins: [
                    {
                        name: "TestPlugin",
                        status: true,
                        description: "Test Plugin",
                        parameters: {}
                    }
                ]
            },
        },
    },
    {
        jsonrpc: "2.0",
        id: 11,
        method: "tools/call",
        params: {
            name: "get_plugins_config",
            arguments: { projectPath },
        },
    },
    {
        jsonrpc: "2.0",
        id: 12,
        method: "tools/call",
        params: {
            name: "list_assets",
            arguments: { projectPath, assetType: "all" },
        },
    },
    {
        jsonrpc: "2.0",
        id: 13,
        method: "tools/call",
        params: {
            name: "search_events",
            arguments: { projectPath, query: "Reid" },
        },
    },
];

let buffer = "";

server.stdout.on("data", (data) => {
    buffer += data.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop(); // Keep incomplete line in buffer

    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const response = JSON.parse(line);
            console.log("Received:", JSON.stringify(response, null, 2));
        } catch (e) {
            console.log("Received (raw):", line);
        }
    }
});

async function run() {
    for (const req of requests) {
        console.log("Sending:", JSON.stringify(req));
        server.stdin.write(JSON.stringify(req) + "\n");
        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait a bit between requests
    }
    server.kill();
}

run();
