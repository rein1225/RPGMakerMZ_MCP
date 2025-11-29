import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import * as fsSync from "fs";
import { HandlerResponse } from "./types/index.js";
import { Logger } from "./utils/logger.js";

// Handlers
import * as projectHandlers from "./handlers/project.js";
import * as pluginsHandlers from "./handlers/plugins.js";
import * as eventsHandlers from "./handlers/events.js";
import * as databaseHandlers from "./handlers/database.js";
import * as mapHandlers from "./handlers/map.js";
import * as playtestHandlers from "./handlers/playtest.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Crash logging
const logCrash = (type: string, error: unknown): void => {
  const logPath = path.join(__dirname, "crash_log.txt");
  const message = `[${new Date().toISOString()}] ${type}: ${error instanceof Error ? error.stack : String(error)}\\n`;
  try {
    fsSync.appendFileSync(logPath, message);
  } catch (e: unknown) {
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

// Tool handler type definitions
type ToolHandler<T = unknown> = (args: T) => Promise<HandlerResponse>;

// Import handler argument types
type ProjectArgs = { projectPath: string };
type DataFileArgs = ProjectArgs & { filename: string };
type WriteDataFileArgs = DataFileArgs & { content: string };
type ListAssetsArgs = ProjectArgs & { assetType?: "img" | "audio" | "all" };
type EventPageArgs = ProjectArgs & { mapId: number; eventId: string; pageIndex: number };
type EventCommandArgs = EventPageArgs & { insertPosition: number };
type AddDialogueArgs = EventCommandArgs & { text: string; face?: string; faceIndex?: number; background?: number; position?: number };
type AddChoiceArgs = EventCommandArgs & { options: string[]; cancelType?: number };
type ShowPictureArgs = EventCommandArgs & { pictureId?: number; pictureName: string; origin?: number; x?: number; y?: number };
type AddConditionalBranchArgs = EventCommandArgs & { condition: { code: number; dataA: number; operation: number; dataB: number; class?: number }; includeElse?: boolean };
type DeleteEventCommandArgs = EventPageArgs & { commandIndex: number };
type UpdateEventCommandArgs = EventPageArgs & { commandIndex: number; newCommand: unknown };
type SearchEventsArgs = ProjectArgs & { query: string };
type WritePluginCodeArgs = ProjectArgs & { filename: string; code: string };
type UpdatePluginsConfigArgs = ProjectArgs & { plugins: unknown[] };
type AddActorArgs = ProjectArgs & { name: string; classId?: number; initialLevel?: number; maxLevel?: number };
type AddItemArgs = ProjectArgs & { name: string; price?: number; consumable?: boolean; scope?: number; occasion?: number };
type AddSkillArgs = ProjectArgs & { name: string; mpCost?: number; tpCost?: number; scope?: number; occasion?: number };
type DrawMapTileArgs = ProjectArgs & { mapId: number; x: number; y: number; layer: number; tileId: number };
type CreateMapArgs = ProjectArgs & { mapName: string; width?: number; height?: number; tilesetId?: number };
type RunPlaytestArgs = ProjectArgs & { duration?: number; autoClose?: boolean; debugPort?: number; startNewGame?: boolean };
type InspectGameStateArgs = { port?: number; script: string };

// Tool mapping with strict types
const toolMap: {
  "get_project_info": ToolHandler<ProjectArgs>;
  "list_data_files": ToolHandler<ProjectArgs>;
  "read_data_file": ToolHandler<DataFileArgs>;
  "write_data_file": ToolHandler<WriteDataFileArgs>;
  "list_assets": ToolHandler<ListAssetsArgs>;
  "write_plugin_code": ToolHandler<WritePluginCodeArgs>;
  "get_plugins_config": ToolHandler<ProjectArgs>;
  "update_plugins_config": ToolHandler<UpdatePluginsConfigArgs>;
  "get_event_page": ToolHandler<EventPageArgs>;
  "add_dialogue": ToolHandler<AddDialogueArgs>;
  "add_choice": ToolHandler<AddChoiceArgs>;
  "add_loop": ToolHandler<EventCommandArgs>;
  "add_break_loop": ToolHandler<EventCommandArgs>;
  "add_conditional_branch": ToolHandler<AddConditionalBranchArgs>;
  "delete_event_command": ToolHandler<DeleteEventCommandArgs>;
  "update_event_command": ToolHandler<UpdateEventCommandArgs>;
  "search_events": ToolHandler<SearchEventsArgs>;
  "add_actor": ToolHandler<AddActorArgs>;
  "add_item": ToolHandler<AddItemArgs>;
  "add_skill": ToolHandler<AddSkillArgs>;
  "draw_map_tile": ToolHandler<DrawMapTileArgs>;
  "create_map": ToolHandler<CreateMapArgs>;
  "check_assets_integrity": ToolHandler<ProjectArgs>;
  "show_picture": ToolHandler<ShowPictureArgs>;
  "run_playtest": ToolHandler<RunPlaytestArgs>;
  "inspect_game_state": ToolHandler<InspectGameStateArgs>;
} = {
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
  try {
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
  } catch (error: unknown) {
    logCrash('ListResourcesRequestSchema handler error', error);
    throw error;
  }
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    try {
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
            } catch (e: unknown) {
                const err = e as Error;
                throw new Error(`Failed to read event commands reference: ${err.message}`);
            }
        }

        throw new Error(`Unknown resource: ${uri}`);
    } catch (error: unknown) {
        logCrash('ReadResourceRequestSchema handler error', error);
        throw error;
    }
});

// List Tools handler (imports tool schemas from ./toolSchemas.ts)
import { toolSchemas } from "./toolSchemas.js";

server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    return {
      tools: toolSchemas
    };
  } catch (error: unknown) {
    logCrash('ListToolsRequestSchema handler error', error);
    throw error;
  }
});

// Call Tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    await Logger.info(`Processing tool: ${name}`);

    try {
        const handler = toolMap[name as keyof typeof toolMap];
        if (!handler) {
            throw new Error(`Unknown tool: ${name}`);
        }
        return await handler(args);
    } catch (error: unknown) {
        const err = error as Error;
        await Logger.error(`Error executing tool ${name}`, err);
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${err.message}`,
                },
            ],
            isError: true,
        };
    }
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
await Logger.info("RPG Maker MZ MCP Server running on stdio.");
