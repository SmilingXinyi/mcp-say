import {promises as fs} from 'fs';
import {tmpdir} from 'os';
import {join, extname} from 'path';
import {FFMPEG_TARGET_FORMATS, SAY_NATIVE_EXTS, type FfmpegFormat, getMimeType} from './formats.js';
import {run} from './run.js';

export type SynthesizeOptions = {
    text: string;
    voice?: string;
    rate?: number;
};

export type SynthesizeToFileOptions = SynthesizeOptions & {
    outputPath: string;
    format?: FfmpegFormat;
    audioOptions?: string[];
};

export type SynthesizeResult = {
    format: string;
    sizeBytes: number;
    viaFfmpeg: boolean;
};

function buildSayArgs(
    text: string,
    voice?: string,
    rate?: number,
    outputPath?: string,
    audioOptions?: string[]
): string[] {
    const args: string[] = [];
    if (voice) args.push('-v', voice);
    if (rate !== undefined) args.push('-r', String(rate));
    if (outputPath) args.push('-o', outputPath);
    if (audioOptions?.length) args.push(...audioOptions);
    args.push(text);
    return args;
}

export async function synthesizeToFile(opts: SynthesizeToFileOptions): Promise<SynthesizeResult> {
    const {text, outputPath, voice, rate, format, audioOptions} = opts;
    const ext = extname(outputPath).toLowerCase();

    const ffmpegKey = format ?? (ext ? ext.slice(1) : '');
    const ffmpegSpec = FFMPEG_TARGET_FORMATS[ffmpegKey as FfmpegFormat];
    const needsFfmpeg = !!ffmpegSpec && (!SAY_NATIVE_EXTS.has(ext) || format !== undefined);

    if (needsFfmpeg) {
        const tmp = join(tmpdir(), `mcp-say-${Date.now()}.aiff`);
        try {
            const sayResult = await run('say', buildSayArgs(text, voice, rate, tmp), 120_000);
            if (sayResult.code !== 0) {
                throw new Error(`say failed (exit ${sayResult.code}): ${sayResult.stderr.trim()}`);
            }

            const ffmpegArgs = ['-y', '-i', tmp, ...ffmpegSpec.args, outputPath];
            const ffResult = await run('ffmpeg', ffmpegArgs, 60_000);
            if (ffResult.code !== 0) {
                throw new Error(`ffmpeg failed (exit ${ffResult.code}): ${ffResult.stderr.slice(-500)}`);
            }
        } finally {
            await fs.unlink(tmp).catch(() => {});
        }

        const stat = await fs.stat(outputPath);
        return {format: ffmpegKey, sizeBytes: stat.size, viaFfmpeg: true};
    }

    const sayResult = await run('say', buildSayArgs(text, voice, rate, outputPath, audioOptions), 120_000);
    if (sayResult.code !== 0) {
        throw new Error(`say failed (exit ${sayResult.code}): ${sayResult.stderr.trim()}`);
    }

    const stat = await fs.stat(outputPath);
    return {format: ext ? ext.slice(1) : 'aiff', sizeBytes: stat.size, viaFfmpeg: false};
}

export async function synthesizeToBuffer(
    opts: SynthesizeOptions & {format?: FfmpegFormat}
): Promise<{buffer: Buffer; mimeType: string; format: string; sizeBytes: number}> {
    const format = opts.format ?? 'mp3';
    const ffmpegSpec = FFMPEG_TARGET_FORMATS[format];
    const tmp = join(tmpdir(), `mcp-say-${Date.now()}${ffmpegSpec.ext}`);

    try {
        const result = await synthesizeToFile({...opts, outputPath: tmp, format});
        const buffer = await fs.readFile(tmp);
        return {
            buffer,
            mimeType: getMimeType(format),
            format: result.format,
            sizeBytes: result.sizeBytes
        };
    } finally {
        await fs.unlink(tmp).catch(() => {});
    }
}
