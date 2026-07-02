import {createRequire} from 'node:module';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerSayTools} from './tools/index.js';

const require = createRequire(import.meta.url);
const {name, version} = require('../package.json') as {name: string; version: string};

export const SERVER_INFO = {
    name,
    version
};

export function createMcpServer(): McpServer {
    const server = new McpServer(SERVER_INFO);

    server.server.onerror = error => {
        console.error('[MCP Error]', error);
    };

    server.registerTool(
        'ping',
        {
            description: 'Simple health check',
            inputSchema: {}
        },
        async () => ({content: [{type: 'text', text: 'pong'}]})
    );

    registerSayTools(server);

    return server;
}
