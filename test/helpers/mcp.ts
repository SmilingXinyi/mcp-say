import type {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {Client as McpClient} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createMcpServer} from '../../src/server.js';

export async function withMcpClient(run: (client: Client) => Promise<void>): Promise<void> {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer();
    const client = new McpClient({name: 'test-client', version: '0.0.0'});

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    try {
        await run(client);
    } finally {
        await client.close();
        await server.close();
    }
}

export const isMacOS = process.platform === 'darwin';
