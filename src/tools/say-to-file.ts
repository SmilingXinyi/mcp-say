import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {assertMacOS} from '../lib/run.js';
import {synthesizeToFile} from '../lib/synthesize.js';

const SAY_TO_FILE_DESCRIPTION = `
Synthesise text to an audio file using macOS \`say\`, with optional ffmpeg conversion for additional formats.

**Supported output formats**

Native (via \`say\` directly):
  .aiff / .aif  — AIFF PCM (default, best compatibility)
  .wav          — WAV PCM
  .m4a          — AAC in MPEG-4 container
  .flac         — FLAC lossless
  .caf          — Apple CAF (widest codec support)
  .aac          — AAC bare stream
  .ogg / .opus  — Ogg container

Via ffmpeg (automatic conversion from AIFF):
  mp3           — MP3 (libmp3lame, quality ~VBR V2)
  wav           — WAV PCM 16-bit signed LE (re-encoded)
  pcm           — Raw signed 16-bit LE mono 22050 Hz (.raw)
  ogg           — Ogg Vorbis
  opus          — Opus
  aac           — AAC

**Inline speech markup**  ([[…]] syntax)
  Pause:          "Hello, [[slnc 500]] World"
  Rate change:    "[[rate 80]] slow [[rate 200]] back to normal"
  Pitch:          "[[pbas +10]] Higher"
  Volume:         "[[volm 0.5]] Half volume"
  Emphasis:       "This is [[emph +]] critical [[emph -]]"

**audio_options** (native say formats only)
  Pass raw \`say\` audio option strings for fine-grained control, e.g.:
    ["--data-format=LEF32@44100"]
    ["--channels=1", "--bit-rate=128000"]
`.trim();

function platformError() {
    return {content: [{type: 'text' as const, text: 'The `say` command is only available on macOS.'}], isError: true};
}

export function registerSayToFile(server: McpServer) {
    server.registerTool(
        'say_to_file',
        {
            description: SAY_TO_FILE_DESCRIPTION,
            inputSchema: {
                text: z.string().min(1).describe('Text to synthesise. Supports [[…]] inline markup.'),
                output_path: z
                    .string()
                    .min(1)
                    .describe(
                        'Absolute path of the output file, including extension. Extension determines format (e.g. /tmp/out.mp3, /tmp/out.wav). ' +
                            'For raw PCM, use .raw extension or pass format: "pcm".'
                    ),
                voice: z.string().optional().describe('Voice name (see list_voices). Defaults to system voice.'),
                rate: z
                    .number()
                    .int()
                    .min(80)
                    .max(500)
                    .optional()
                    .describe('Speech rate in words per minute (80–500).'),
                format: z
                    .enum(['mp3', 'wav', 'pcm', 'ogg', 'opus', 'aac'])
                    .optional()
                    .describe(
                        'Explicit ffmpeg target format. Overrides extension inference. Use when the extension is ambiguous.'
                    ),
                audio_options: z
                    .array(z.string())
                    .optional()
                    .describe(
                        'Extra say audio option flags for native formats, e.g. ["--data-format=LEF32@44100"]. Ignored when ffmpeg conversion is used.'
                    )
            }
        },
        async ({text, output_path, voice, rate, format, audio_options}) => {
            try {
                assertMacOS();
            } catch {
                return platformError();
            }

            try {
                const result = await synthesizeToFile({
                    text,
                    outputPath: output_path,
                    voice,
                    rate,
                    format,
                    audioOptions: audio_options
                });

                return {
                    content: [
                        {
                            type: 'text',
                            text: [
                                `Saved: ${output_path}`,
                                `Format: ${result.format}${result.viaFfmpeg ? ' (via ffmpeg)' : ' (native)'}`,
                                `Size: ${(result.sizeBytes / 1024).toFixed(1)} KB`,
                                voice ? `Voice: ${voice}` : null,
                                rate ? `Rate: ${rate} wpm` : null
                            ]
                                .filter(Boolean)
                                .join('\n')
                        }
                    ]
                };
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                return {content: [{type: 'text', text: message}], isError: true};
            }
        }
    );
}
