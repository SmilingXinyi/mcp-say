import {spawn} from 'child_process';
import Debug from 'debug';

const debug = Debug('mcp-say');

export function assertMacOS(): void {
    if (process.platform !== 'darwin') {
        throw new Error('The `say` command is only available on macOS.');
    }
}

/** Run a command and return {stdout, stderr, code}. Rejects on spawn error. */
export function run(
    cmd: string,
    args: string[],
    timeoutMs = 60_000
): Promise<{stdout: string; stderr: string; code: number}> {
    return new Promise((resolve, reject) => {
        debug('spawn %s %o', cmd, args);
        const proc = spawn(cmd, args, {stdio: ['ignore', 'pipe', 'pipe']});
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];

        proc.stdout.on('data', (d: Buffer) => stdout.push(d));
        proc.stderr.on('data', (d: Buffer) => stderr.push(d));

        const timer = setTimeout(() => {
            proc.kill();
            reject(new Error(`Command timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        proc.on('error', err => {
            clearTimeout(timer);
            reject(err);
        });
        proc.on('close', code => {
            clearTimeout(timer);
            resolve({
                stdout: Buffer.concat(stdout).toString(),
                stderr: Buffer.concat(stderr).toString(),
                code: code ?? 1
            });
        });
    });
}
