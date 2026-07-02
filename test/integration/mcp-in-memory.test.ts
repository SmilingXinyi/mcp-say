import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {SERVER_INFO, createMcpServer} from '../../src/server.js';
import {withMcpClient} from '../helpers/mcp.js';

describe('createMcpServer', () => {
    it('reads name and version from package.json', () => {
        assert.equal(SERVER_INFO.name, 'mcp-say');
        assert.match(SERVER_INFO.version, /^\d+\.\d+\.\d+/);
    });

    it('creates a server instance', () => {
        const server = createMcpServer();
        assert.ok(server);
    });
});

describe('MCP tools (in-memory)', () => {
    it('lists registered tools', async () => {
        await withMcpClient(async client => {
            const {tools} = await client.listTools();

            const names = tools.map(t => t.name).sort();
            assert.deepEqual(names, ['list_voices', 'ping', 'say', 'say_to_audio', 'say_to_file']);
        });
    });

    it('calls ping', async () => {
        await withMcpClient(async client => {
            const result = await client.callTool({name: 'ping', arguments: {}});

            assert.equal(result.isError, undefined);
            assert.deepEqual(result.content, [{type: 'text', text: 'pong'}]);
        });
    });

    it('returns platform error for say on non-macOS', async () => {
        if (process.platform === 'darwin') {
            return;
        }

        await withMcpClient(async client => {
            const result = await client.callTool({name: 'say', arguments: {text: 'hello'}});

            assert.equal(result.isError, true);
            const text = result.content?.find(c => c.type === 'text');
            assert.match((text as {text: string})?.text ?? '', /only available on macOS/);
        });
    });
});
