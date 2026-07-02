import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {assertMacOS, run} from '../lib/run.js';

const SAY_DESCRIPTION = `
Convert text to speech and play it through the system audio output using macOS \`say\`.

**Basic usage**
  text: "Hello, World"

**Selecting a voice**
  Use \`list_voices\` to find available voices, then pass the name:
  voice: "Tingting"       (Mandarin)
  voice: "Kyoko"          (Japanese)
  voice: "Daniel"         (British English)

**Adjusting speed**
  rate: 180               (words per minute; default ~200, range 80–500)

**Inline speech markup**  ([[…]] syntax, Apple Speech Synthesis)
  Pause (silence N ms):   "Hello, [[slnc 500]] World"
  Change rate inline:     "Normal [[rate 80]] slow [[rate 200]] fast"
  Adjust pitch:           "[[pbas +10]] Higher pitch"
  Adjust volume:          "[[volm 0.3]] Quieter now"
  Emphasise a word:       "This is [[emph +]] very [[emph -]] important"

Note: inline markup is voice-dependent; not all synthesisers honour every tag.
`.trim();

function platformError() {
    return {content: [{type: 'text' as const, text: 'The `say` command is only available on macOS.'}], isError: true};
}

export function registerSay(server: McpServer) {
    server.registerTool(
        'say',
        {
            description: SAY_DESCRIPTION,
            inputSchema: {
                text: z
                    .string()
                    .min(1)
                    .describe('The text to speak. Supports [[…]] inline markup for pauses, rate, pitch, and volume.'),
                voice: z
                    .string()
                    .optional()
                    .describe('Voice name. Use list_voices to see available options. Defaults to the system voice.'),
                rate: z
                    .number()
                    .int()
                    .min(80)
                    .max(500)
                    .optional()
                    .describe("Speech rate in words per minute (80–500). Default is the voice's natural rate (~200).")
            }
        },
        async ({text, voice, rate}) => {
            try {
                assertMacOS();
            } catch {
                return platformError();
            }

            const args: string[] = [];
            if (voice) args.push('-v', voice);
            if (rate !== undefined) args.push('-r', String(rate));
            args.push(text);

            const {stderr, code} = await run('say', args, 120_000);
            if (code !== 0) {
                return {content: [{type: 'text', text: `say failed (exit ${code}): ${stderr.trim()}`}], isError: true};
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: `Spoke: "${text}"${voice ? ` (voice: ${voice})` : ''}${rate ? ` at ${rate} wpm` : ''}`
                    }
                ]
            };
        }
    );
}
