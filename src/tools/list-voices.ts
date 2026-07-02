import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {assertMacOS, run} from '../lib/run.js';
import {parseVoices} from '../lib/voices.js';

function platformError() {
    return {content: [{type: 'text' as const, text: 'The `say` command is only available on macOS.'}], isError: true};
}

export function registerListVoices(server: McpServer) {
    server.registerTool(
        'list_voices',
        {
            description:
                'List all TTS voices installed on the system. Returns name, locale, and a sample phrase for each voice. Pass a locale filter (e.g. "zh", "en_US") to narrow results.',
            inputSchema: {
                locale: z
                    .string()
                    .optional()
                    .describe(
                        'Optional locale/language filter, e.g. "zh", "en_US", "ja". Case-insensitive prefix match.'
                    )
            }
        },
        async ({locale}) => {
            try {
                assertMacOS();
            } catch {
                return platformError();
            }

            const {stdout, stderr, code} = await run('say', ['-v', '?']);
            if (code !== 0) {
                return {content: [{type: 'text', text: `Failed to list voices: ${stderr}`}], isError: true};
            }

            let voices = parseVoices(stdout);
            if (locale) {
                const filter = locale.toLowerCase();
                voices = voices.filter(
                    v => v.locale.toLowerCase().startsWith(filter) || v.name.toLowerCase().includes(filter)
                );
            }

            const lines = voices.map(v => `${v.name.padEnd(32)} ${v.locale.padEnd(10)} ${v.description}`);
            const header = `${'NAME'.padEnd(32)} ${'LOCALE'.padEnd(10)} SAMPLE`;
            const separator = '─'.repeat(80);
            return {
                content: [
                    {
                        type: 'text',
                        text: [header, separator, ...lines, separator, `Total: ${voices.length} voice(s)`].join('\n')
                    }
                ]
            };
        }
    );
}
