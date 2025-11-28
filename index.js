import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import * as fsSync from "fs";

// Handlers
import * as projectHandlers from "./handlers/project.js";
import * as pluginsHandlers from "./handlers/plugins.js";
import * as eventsHandlers from "./handlers/events.js";
import * as databaseHandlers from "./handlers/database.js";
import * as mapHandlers from "./handlers/map.js";
import * as playtestHandlers from "./handlers/playtest.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Crash logging
const logCrash = (type, error) => {
  const logPath = path.join(__dirname, "crash_log.txt");
  const message = `[${new Date().toISOString()}] ${type}: ${error instanceof Error ? error.stack : error}\\n`;
  try {
    fsSync.appendFileSync(logPath, message);
  } catch (e) {
    // Last resort
  }
};

process.on('uncaughtException', (err) => {
  logCrash('Uncaught Exception', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logCrash('Unhandled Rejection', reason);
  process.exit(1);
});

const server = new Server(
  {
    name: "rpg-maker-mz-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Tool mapping
const toolMap = {
  // Project tools
  "get_project_info": projectHandlers.getProjectInfo,
  "list_data_files": projectHandlers.listDataFiles,
  "read_data_file": projectHandlers.readDataFile,
  "write_data_file": projectHandlers.writeDataFile,
  "list_assets": projectHandlers.listAssets,

  // Plugin tools
  "write_plugin_code": pluginsHandlers.writePluginCode,
  "get_plugins_config": pluginsHandlers.getPluginsConfig,
  "update_plugins_config": pluginsHandlers.updatePluginsConfig,

  // Event tools
  "get_event_page": eventsHandlers.getEventPage,
  "add_dialogue": eventsHandlers.addDialogue,
  "add_choice": eventsHandlers.addChoice,
  "add_loop": eventsHandlers.addLoop,
  "add_break_loop": eventsHandlers.addBreakLoop,
  "add_conditional_branch": eventsHandlers.addConditionalBranch,
  "delete_event_command": eventsHandlers.deleteEventCommand,
  "update_event_command": eventsHandlers.updateEventCommand,
  "search_events": eventsHandlers.searchEvents,

  // Database tools
  "add_actor": databaseHandlers.addActor,
  "add_item": databaseHandlers.addItem,
  "add_skill": databaseHandlers.addSkill,

  // Map tools
  "draw_map_tile": mapHandlers.drawMapTile,
  "create_map": mapHandlers.createMap,

  // Project tools (extended)
  "check_assets_integrity": projectHandlers.checkAssetsIntegrity,

  // Event tools (extended)
  "show_picture": eventsHandlers.showPicture,

  // Playtest tools
  "run_playtest": playtestHandlers.runPlaytest,
  "inspect_game_state": playtestHandlers.inspectGameState,
};

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "mz://docs/event_commands",
        name: "RPG Maker MZ Event Command Reference",
        description: "Reference manual for MZ event commands with code to parameters mapping",
        mimeType: "application/json"
      }
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === "mz://docs/event_commands") {
    try {
      const refPath = path.join(__dirname, "resources", "event_commands.json");
      const content = await fs.readFile(refPath, "utf-8");
      return {
        contents: [
          {
            uri: uri,
            mimeType: "application/json",
            text: content
          }
        ]
      };
    } catch (e) {
      throw new Error(`Failed to read event commands reference: ${e.message}`);
    }
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// List Tools handler (imports tool schemas from ./toolSchemas.js)
import { toolSchemas } from "./toolSchemas.js";

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: toolSchemas
  };
});

// Call Tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  console.error("Processing tool:", name);

  try {
    const handler = toolMap[name];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return await handler(args);
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("RPG Maker MZ MCP Server running on stdio.");
