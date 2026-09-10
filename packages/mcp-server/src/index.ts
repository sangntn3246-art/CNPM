import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { tools } from "./tools.js";

/**
 * OctaPoint MCP Server — stdio transport.
 *
 * Point any MCP-compatible client (Claude Desktop, an internal agent
 * runtime, etc.) at this process. Example Claude Desktop config entry:
 *
 * {
 *   "mcpServers": {
 *     "octapoint": {
 *       "command": "node",
 *       "args": ["/path/to/octapoint/packages/mcp-server/dist/index.js"],
 *       "env": {
 *         "OCTAPOINT_BASE_URL": "http://localhost:4000",
 *         "OCTAPOINT_KEY_ID": "op_live_...",
 *         "OCTAPOINT_SECRET": "...",
 *         "OCTAPOINT_MERCHANT_ID": "..."
 *       }
 *     }
 *   }
 * }
 */
const server = new McpServer({ name: "octapoint", version: "0.1.0" });

for (const tool of tools) {
  server.tool(tool.name, tool.description, tool.inputSchema.shape, async (args) => {
    try {
      const result = await tool.handler(args as any);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err: any) {
      return {
        content: [{ type: "text", text: `Error: ${err?.message ?? String(err)}` }],
        isError: true,
      };
    }
  });
}

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[octapoint-mcp] server ready on stdio");
