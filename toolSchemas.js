// Tool schemas for all 22 tools
export const toolSchemas = [
    {
        name: "get_project_info",
        description: "Get basic information about the RPG Maker MZ project from System.json",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string", description: "Absolute path to the RPG Maker MZ project folder" }
            },
            required: ["projectPath"]
        }
    },
    {
        name: "list_data_files",
        description: "List all JSON data files in the project's data directory",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" }
            },
            required: ["projectPath"]
        }
    },
    {
        name: "read_data_file",
        description: "Read a specific data file from the data directory",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" },
                filename: { type: "string", description: "Name of the JSON file to read (e.g., 'Actors.json')" }
            },
            required: ["projectPath", "filename"]
        }
    },
    {
        name: "write_data_file",
        description: "Write to a data file in the data directory",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" },
                filename: { type: "string" },
                content: { type: "string", description: "JSON string content to write" }
            },
            required: ["projectPath", "filename", "content"]
        }
    },
    {
        name: "search_events",
        description: "Search for text or command codes in map and common events",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" },
                query: { type: "string", description: "Search query (text or command code)" }
            },
            required: ["projectPath", "query"]
        }
    },
    {
        name: "get_event_page",
        description: "Get event page commands with readable annotations",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" },
                mapId: { type: "number" },
                eventId: { type: "number" },
                pageIndex: { type: "number" }
            },
            required: ["projectPath", "mapId", "eventId", "pageIndex"]
        }
    },
    {
        name: "list_assets",
        description: "List assets in img and audio directories",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" },
                assetType: { type: "string", enum: ["img", "audio", "all"], default: "all" }
            },
            required: ["projectPath"]
        }
    },
    {
        name: "write_plugin_code",
        description: "Write a plugin file to js/plugins directory",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" },
                filename: { type: "string" },
                code: { type: "string" }
            },
            required: ["projectPath", "filename", "code"]
        }
    },
    {
        name: "get_plugins_config",
        description: "Read current plugins configuration from js/plugins.js",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" }
            },
            required: ["projectPath"]
        }
    },
    {
        name: "update_plugins_config",
        description: "Update plugins configuration in js/plugins.js",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" },
                plugins: { type: "array" }
            },
            required: ["projectPath", "plugins"]
        }
    },
    {
        name: "add_dialogue",
        description: "Add dialogue text to an event",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" },
                mapId: { type: "number" },
                eventId: { type: "number" },
                pageIndex: { type: "number" },
                insertPosition: { type: "number" },
                text: { type: "string" },
                face: { type: "string", default: "" },
                faceIndex: { type: "number", default: 0 },
                background: { type: "number", default: 0 },
                position: { type: "number", default: 2 }
            },
            required: ["projectPath", "mapId", "eventId", "pageIndex", "insertPosition", "text"]
        }
    },
    {
        name: "add_choice",
        description: "Add a choice selection to an event",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" },
                mapId: { type: "number" },
                eventId: { type: "number" },
                pageIndex: { type: "number" },
                insertPosition: { type: "number" },
                options: { type: "array", items: { type: "string" }, description: "Choice options" },
                cancelType: { type: "number", default: -1, description: "Cancel behavior: -1=disallow, 0-n=branch to option" }
            },
            required: ["projectPath", "mapId", "eventId", "pageIndex", "insertPosition", "options"]
        }
    },
    {
        name: "add_loop",
        description: "Add a loop structure to an event",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" },
                mapId: { type: "number" },
                eventId: { type: "number" },
                pageIndex: { type: "number" },
                insertPosition: { type: "number" }
            },
            required: ["projectPath", "mapId", "eventId", "pageIndex", "insertPosition"]
        }
    },
    {
        name: "add_break_loop",
        description: "Add a break loop command to an event",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" },
                mapId: { type: "number" },
                eventId: { type: "number" },
                pageIndex: { type: "number" },
                insertPosition: { type: "number" }
            },
            required: ["projectPath", "mapId", "eventId", "pageIndex", "insertPosition"]
        }
    },
    {
        name: "add_conditional_branch",
        description: "Add a conditional branch to an event",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" },
                mapId: { type: "number" },
                eventId: { type: "number" },
                pageIndex: { type: "number" },
                insertPosition: { type: "number" },
                condition: { type: "object" },
                includeElse: { type: "boolean", default: true }
            },
            required: ["projectPath", "mapId", "eventId", "pageIndex", "insertPosition", "condition"]
        }
    },
    {
        name: "delete_event_command",
        description: "Delete an event command at specified index",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" },
                mapId: { type: "number" },
                eventId: { type: "number" },
                pageIndex: { type: "number" },
                commandIndex: { type: "number" }
            },
            required: ["projectPath", "mapId", "eventId", "pageIndex", "commandIndex"]
        }
    },
    {
        name: "update_event_command",
        description: "Update an event command at specified index",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" },
                mapId: { type: "number" },
                eventId: { type: "number" },
                pageIndex: { type: "number" },
                commandIndex: { type: "number" },
                newCommand: { type: "object" }
            },
            required: ["projectPath", "mapId", "eventId", "pageIndex", "commandIndex", "newCommand"]
        }
    },
    {
        name: "add_actor",
        description: "Add a new actor to the database",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" },
                name: { type: "string" },
                classId: { type: "number", default: 1 },
                initialLevel: { type: "number", default: 1 },
                maxLevel: { type: "number", default: 99 }
            },
            required: ["projectPath", "name"]
        }
    },
    {
        name: "add_item",
        description: "Add a new item to the database",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" },
                name: { type: "string" },
                price: { type: "number", default: 0 },
                consumable: { type: "boolean", default: true },
                scope: { type: "number", default: 7 },
                occasion: { type: "number", default: 0 }
            },
            required: ["projectPath", "name"]
        }
    },
    {
        name: "add_skill",
        description: "Add a new skill to the database",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" },
                name: { type: "string" },
                mpCost: { type: "number", default: 0 },
                tpCost: { type: "number", default: 0 },
                scope: { type: "number", default: 1 },
                occasion: { type: "number", default: 1 }
            },
            required: ["projectPath", "name"]
        }
    },
    {
        name: "draw_map_tile",
        description: "Draw a tile on the map",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" },
                mapId: { type: "number" },
                x: { type: "number" },
                y: { type: "number" },
                layer: { type: "number", description: "0-3: Map Layers, 4: Shadow, 5: Region" },
                tileId: { type: "number" }
            },
            required: ["projectPath", "mapId", "x", "y", "layer", "tileId"]
        }
    },
    {
        name: "inspect_game_state",
        description: "Inspect game variables and switches via Puppeteer. Requires game running with --remote-debugging-port.",
        inputSchema: {
            type: "object",
            properties: {
                port: { type: "number", default: 9222, description: "Remote debugging port" },
                script: { type: "string", description: "JavaScript code to evaluate (e.g. '$gameVariables.value(1)')" }
            },
            required: ["script"]
        }
    },
    {
        name: "run_playtest",
        description: "Run a playtest of the game. Launches Game.exe if available, otherwise uses browser-based fallback.",
        inputSchema: {
            type: "object",
            properties: {
                projectPath: { type: "string" },
                duration: { type: "number", default: 5000, description: "Time to wait before screenshot (ms)" },
                autoClose: { type: "boolean", default: false, description: "Automatically close game after screenshot" },
                debugPort: { type: "number", default: 9222, description: "Remote debugging port for Puppeteer" },
                startNewGame: { type: "boolean", default: false, description: "Skip title and start new game" }
            },
            required: ["projectPath"]
        }
    }
];
