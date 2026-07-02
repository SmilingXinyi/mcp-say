import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {assertMacOS} from '../lib/run.js';
import {synthesizeToBuffer} from '../lib/synthesize.js';

const SAY_TO_AUDIO_DESCRIPTION = `
Synthesise text to audio and return it as MCP audio content (base64-encoded).

Ideal for remote SSE clients that need audio data without access to the server filesystem.
For local playback, use \`say\` instead. To write a file on the server, use \`say_to_file\`.

**Default format**: mp3 (smallest payload). Also supports wav, aac, ogg, opus, pcm.

**Inline speech markup**  ([[…]] syntax)
  Pause:          "Hello, [[slnc 500]] World"
  Rate change:    "[[rate 80]] slow [[rate 200]] back to normal"
  Pitch:          "[[pbas +10]] Higher"
  Volume:         "[[volm 0.5]] Half volume"
  Emphasis:       "This is [[emph +]] critical [[emph -]]"
`.trim();

function platformError() {
    return {content: [{type: 'text' as const, text: 'The `say` command is only available on macOS.'}], isError: true};
}

export function registerSayToAudio(server: McpServer) {
    server.registerTool(
        'say_to_audio',
        {
            description: SAY_TO_AUDIO_DESCRIPTION,
            inputSchema: {
                text: z.string().min(1).describe('Text to synthesise. Supports [[…]] inline markup.'),
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
                    .describe('Output audio format. Defaults to mp3 for smaller payload size.')
            }
        },
        async ({text, voice, rate, format}) => {
            try {
                assertMacOS();
            } catch {
                return platformError();
            }

            try {
                const {
                    buffer,
                    mimeType,
                    format: outFormat,
                    sizeBytes
                } = await synthesizeToBuffer({
                    text,
                    voice,
                    rate,
                    format
                });

                return {
                    content: [
                        {
                            type: 'text',
                            text: [
                                `Synthesized ${(sizeBytes / 1024).toFixed(1)} KB`,
                                `Format: ${outFormat}`,
                                voice ? `Voice: ${voice}` : null,
                                rate ? `Rate: ${rate} wpm` : null
                            ]
                                .filter(Boolean)
                                .join('\n')
                        },
                        {
                            type: 'audio',
                            data: buffer.toString('base64'),
                            mimeType
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
