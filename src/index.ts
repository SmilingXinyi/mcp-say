import 'dotenv/config';
import Debug from 'debug';
import {createRemoteApp} from './remote.js';
import {createMcpServer} from './server.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';

const debug = Debug('mcp-say');

async function startStdioServer() {
    const server = createMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    debug('MCP Server running on stdio');
}

async function startRemoteServer() {
    const host = process.env.MCP_HOST ?? 'localhost';
    const port = Number(process.env.MCP_PORT ?? 3000);
    const {app, closeTransports} = createRemoteApp({host});

    const httpServer = app.listen(port, host, () => {
        console.error(`MCP remote server listening on http://${host}:${port}/mcp`);
    });

    httpServer.on('error', (error: Error) => {
        console.error('Failed to start MCP remote server:', error);
        process.exit(1);
    });

    const shutdown = async () => {
        await closeTransports();
        httpServer.close(() => process.exit(0));
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

const transportMode = process.env.MCP_TRANSPORT ?? 'stdio';
const startServer = transportMode === 'sse' || transportMode === 'remote' ? startRemoteServer : startStdioServer;

startServer().catch(err => {
    console.error('MCP Server error:', err);
    process.exit(1);
});
