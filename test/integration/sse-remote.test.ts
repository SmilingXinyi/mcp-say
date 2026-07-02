import assert from 'node:assert/strict';
import {createServer, type Server} from 'node:http';
import {after, before, describe, it} from 'node:test';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {SSEClientTransport} from '@modelcontextprotocol/sdk/client/sse.js';
import {createRemoteApp} from '../../src/remote.js';

async function listen(app: ReturnType<typeof createRemoteApp>['app']): Promise<{server: Server; port: number}> {
    return new Promise((resolve, reject) => {
        const server = createServer(app);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            if (!address || typeof address === 'string') {
                reject(new Error('Failed to get server port'));
                return;
            }
            resolve({server, port: address.port});
        });
        server.on('error', reject);
    });
}

describe('SSE remote server', () => {
    let httpServer: Server;
    let port: number;
    let closeTransports: () => Promise<void>;

    before(async () => {
        const remote = createRemoteApp({host: '127.0.0.1'});
        closeTransports = remote.closeTransports;
        ({server: httpServer, port} = await listen(remote.app));
    });

    after(async () => {
        await closeTransports();
        await new Promise<void>((resolve, reject) => {
            httpServer.close(err => (err ? reject(err) : resolve()));
        });
    });

    it('connects via SSE and calls ping', async () => {
        const client = new Client({name: 'sse-test-client', version: '0.0.0'});
        const transport = new SSEClientTransport(new URL(`http://127.0.0.1:${port}/mcp`));

        await client.connect(transport);

        try {
            const result = await client.callTool({name: 'ping', arguments: {}});
            assert.deepEqual(result.content, [{type: 'text', text: 'pong'}]);
        } finally {
            await client.close();
        }
    });

    it('lists tools over SSE', async () => {
        const client = new Client({name: 'sse-test-client', version: '0.0.0'});
        const transport = new SSEClientTransport(new URL(`http://127.0.0.1:${port}/mcp`));

        await client.connect(transport);

        try {
            const {tools} = await client.listTools();
            assert.ok(tools.some(t => t.name === 'say_to_audio'));
        } finally {
            await client.close();
        }
    });
});

describe('SSE auth', () => {
    let httpServer: Server;
    let port: number;
    let closeTransports: () => Promise<void>;
    const authToken = 'test-secret-token';

    before(async () => {
        const remote = createRemoteApp({host: '127.0.0.1', authToken});
        closeTransports = remote.closeTransports;
        ({server: httpServer, port} = await listen(remote.app));
    });

    after(async () => {
        await closeTransports();
        await new Promise<void>((resolve, reject) => {
            httpServer.close(err => (err ? reject(err) : resolve()));
        });
    });

    it('rejects unauthenticated SSE connections', async () => {
        const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
            headers: {Accept: 'text/event-stream'}
        });

        assert.equal(response.status, 401);
    });

    it('allows authenticated SSE connections', async () => {
        const client = new Client({name: 'auth-test-client', version: '0.0.0'});
        const transport = new SSEClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), {
            eventSourceInit: {
                fetch: (url, init) =>
                    fetch(url, {
                        ...init,
                        headers: {
                            ...init?.headers,
                            Authorization: `Bearer ${authToken}`
                        }
                    })
            },
            requestInit: {
                headers: {Authorization: `Bearer ${authToken}`}
            }
        });

        await client.connect(transport);

        try {
            const result = await client.callTool({name: 'ping', arguments: {}});
            assert.deepEqual(result.content, [{type: 'text', text: 'pong'}]);
        } finally {
            await client.close();
        }
    });
});

describe('SSE message routing', () => {
    it('returns 400 when sessionId is missing', async () => {
        const remote = createRemoteApp({host: '127.0.0.1'});
        const {server, port} = await listen(remote.app);

        try {
            const response = await fetch(`http://127.0.0.1:${port}/messages`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: '{}'
            });

            assert.equal(response.status, 400);
            assert.match(await response.text(), /Missing sessionId/);
        } finally {
            await remote.closeTransports();
            await new Promise<void>((resolve, reject) => {
                server.close(err => (err ? reject(err) : resolve()));
            });
        }
    });
});
