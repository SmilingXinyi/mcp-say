import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerListVoices} from './list-voices.js';
import {registerSay} from './say.js';
import {registerSayToAudio} from './say-to-audio.js';
import {registerSayToFile} from './say-to-file.js';

export function registerSayTools(server: McpServer) {
    registerListVoices(server);
    registerSay(server);
    registerSayToFile(server);
    registerSayToAudio(server);
}
