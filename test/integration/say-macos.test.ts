import assert from 'node:assert/strict';
import {mkdtemp, readFile, unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {synthesizeToBuffer, synthesizeToFile} from '../../src/lib/synthesize.js';
import {isMacOS, withMcpClient} from '../helpers/mcp.js';

describe('macOS TTS integration', {skip: !isMacOS}, () => {
    it('lists voices via MCP tool', async () => {
        await withMcpClient(async client => {
            const result = await client.callTool({name: 'list_voices', arguments: {locale: 'zh'}});

            assert.notEqual(result.isError, true);
            const text = result.content?.find(c => c.type === 'text') as {text: string} | undefined;
            assert.ok(text?.text.includes('Total:'));
            assert.match(text?.text ?? '', /zh/i);
        });
    });

    it('synthesizes mp3 to buffer', async () => {
        const {buffer, mimeType, format, sizeBytes} = await synthesizeToBuffer({
            text: 'test',
            format: 'mp3'
        });

        assert.ok(buffer.length > 0);
        assert.equal(sizeBytes, buffer.length);
        assert.equal(mimeType, 'audio/mpeg');
        assert.equal(format, 'mp3');
    });

    it('synthesizes native aiff to file', async () => {
        const dir = await mkdtemp(join(tmpdir(), 'mcp-say-test-'));
        const outputPath = join(dir, 'out.aiff');

        try {
            const result = await synthesizeToFile({text: 'test', outputPath});

            assert.equal(result.format, 'aiff');
            assert.equal(result.viaFfmpeg, false);
            assert.ok(result.sizeBytes > 0);

            const file = await readFile(outputPath);
            assert.equal(file.length, result.sizeBytes);
        } finally {
            await unlink(outputPath).catch(() => {});
        }
    });

    it('returns audio content from say_to_audio', async () => {
        await withMcpClient(async client => {
            const result = await client.callTool({
                name: 'say_to_audio',
                arguments: {text: 'hello', format: 'mp3'}
            });

            assert.notEqual(result.isError, true);

            const audio = result.content?.find(c => c.type === 'audio') as
                | {type: 'audio'; data: string; mimeType: string}
                | undefined;
            assert.ok(audio);
            assert.equal(audio.mimeType, 'audio/mpeg');

            const decoded = Buffer.from(audio.data, 'base64');
            assert.ok(decoded.length > 0);
        });
    });
});
