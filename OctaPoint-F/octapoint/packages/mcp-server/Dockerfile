FROM node:20-alpine
WORKDIR /app

# Build context is the repository root (see docker-compose.yml) so the local
# @octapoint/sdk workspace is available to the MCP package during install.
COPY package.json ./package.json
COPY packages/sdk-ts/package.json ./packages/sdk-ts/package.json
COPY packages/mcp-server/package.json ./packages/mcp-server/package.json
RUN npm install --workspaces --include-workspace-root

COPY packages/sdk-ts ./packages/sdk-ts
COPY packages/mcp-server ./packages/mcp-server
RUN npm run build -w @octapoint/sdk

EXPOSE 4100
CMD ["npm", "run", "start:http", "-w", "@octapoint/mcp-server"]
