import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import pkg from '../package.json';
import {registerSayTools} from './tools/index.js';

export const SERVER_INFO = {
    name: pkg.name,
    version: pkg.version
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
