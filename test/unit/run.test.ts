import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {assertMacOS, run} from '../../src/lib/run.js';

describe('run', () => {
    it('executes a command and captures stdout', async () => {
        const result = await run('echo', ['hello']);

        assert.equal(result.code, 0);
        assert.equal(result.stdout.trim(), 'hello');
    });

    it('captures non-zero exit codes', async () => {
        const result = await run('sh', ['-c', 'echo err >&2; exit 2']);

        assert.equal(result.code, 2);
        assert.match(result.stderr, /err/);
    });

    it('rejects when command is not found', async () => {
        await assert.rejects(() => run('mcp-say-nonexistent-cmd', []), /ENOENT|not found/i);
    });
});

describe('assertMacOS', () => {
    it(process.platform === 'darwin' ? 'does not throw on macOS' : 'throws on non-macOS', () => {
        if (process.platform === 'darwin') {
            assert.doesNotThrow(() => assertMacOS());
        } else {
            assert.throws(() => assertMacOS(), /only available on macOS/);
        }
    });
});
