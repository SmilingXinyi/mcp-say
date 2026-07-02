// Formats that `say -o` can produce natively (inferred from extension)
export const SAY_NATIVE_EXTS = new Set([
    '.aiff',
    '.aif',
    '.aifc',
    '.wav',
    '.caf',
    '.caff',
    '.m4a',
    '.m4r',
    '.mp4',
    '.aac',
    '.flac',
    '.ogg',
    '.opus',
    '.snd',
    '.au'
]);

export type FfmpegFormat = 'mp3' | 'wav' | 'pcm' | 'ogg' | 'opus' | 'aac';

// Formats that need ffmpeg conversion (say → tmp AIFF → ffmpeg → output)
export const FFMPEG_TARGET_FORMATS: Record<FfmpegFormat, {ext: string; args: string[]}> = {
    mp3: {ext: '.mp3', args: ['-codec:a', 'libmp3lame', '-q:a', '2']},
    wav: {ext: '.wav', args: ['-codec:a', 'pcm_s16le']},
    pcm: {ext: '.raw', args: ['-f', 's16le', '-codec:a', 'pcm_s16le', '-ar', '22050', '-ac', '1']},
    ogg: {ext: '.ogg', args: ['-codec:a', 'libvorbis', '-q:a', '4']},
    opus: {ext: '.opus', args: ['-codec:a', 'libopus', '-b:a', '128k']},
    aac: {ext: '.aac', args: ['-codec:a', 'aac', '-b:a', '192k']}
};

const FORMAT_MIME_TYPES: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    opus: 'audio/opus',
    pcm: 'audio/pcm',
    aiff: 'audio/x-aiff',
    aif: 'audio/x-aiff',
    aifc: 'audio/x-aiff',
    caf: 'audio/x-caf',
    caff: 'audio/x-caf',
    m4a: 'audio/mp4',
    flac: 'audio/flac',
    raw: 'audio/pcm'
};

export function getMimeType(format: string): string {
    return FORMAT_MIME_TYPES[format.toLowerCase()] ?? 'application/octet-stream';
}
