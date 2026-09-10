import http from "node:http";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { tools } from "./tools.js";

function buildServer() {
  const server = new McpServer({ name: "octapoint", version: "0.1.0" });
  for (const tool of tools) {
    server.tool(tool.name, tool.description, tool.inputSchema.shape, async (args) => {
      try {
        const result = await tool.handler(args as any);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (err: any) {
        return { content: [{ type: "text", text: `Error: ${err?.message ?? String(err)}` }], isError: true };
      }
    });
  }
  return server;
}

// One MCP server + transport per session id, so multiple agents/tabs can
// connect concurrently without stepping on each other's state.
const sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

const httpServer = http.createServer(async (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "octapoint-mcp-server" }));
    return;
  }

  if (req.url !== "/mcp") {
    res.writeHead(404);
    res.end();
    return;
  }

  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let session = sessionId ? sessions.get(sessionId) : undefined;

  if (!session) {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, { server, transport });
      },
    });
    await server.connect(transport);
    session = { server, transport };
  }

  await session.transport.handleRequest(req, res);
});

const port = Number(process.env.MCP_HTTP_PORT ?? 4100);
httpServer.listen(port, () => {
  console.log(`[octapoint-mcp] HTTP/streamable transport listening on :${port}`);
});
