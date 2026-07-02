import type {NextFunction, Request, Response} from 'express';
import {SSEServerTransport} from '@modelcontextprotocol/sdk/server/sse.js';
import {createMcpExpressApp} from '@modelcontextprotocol/sdk/server/express.js';
import {createMcpServer} from './server.js';

export type RemoteAppOptions = {
    host?: string;
    authToken?: string;
};

export type RemoteApp = {
    app: ReturnType<typeof createMcpExpressApp>;
    transports: Record<string, SSEServerTransport>;
    host: string;
    closeTransports: () => Promise<void>;
};

function createAuthMiddleware(expectedToken?: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!expectedToken) {
            next();
            return;
        }

        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;

        if (token !== expectedToken) {
            res.status(401).send('Unauthorized');
            return;
        }

        next();
    };
}

export function createRemoteApp(options: RemoteAppOptions = {}): RemoteApp {
    const host = options.host ?? '127.0.0.1';
    const authToken = options.authToken ?? process.env.MCP_AUTH_TOKEN;
    const app = createMcpExpressApp({host});
    const transports: Record<string, SSEServerTransport> = {};
    const requireAuth = createAuthMiddleware(authToken);

    const handleSseConnection = async (_req: Request, res: Response) => {
        try {
            const transport = new SSEServerTransport('/messages', res);
            const {sessionId} = transport;
            transports[sessionId] = transport;

            transport.onclose = () => {
                delete transports[sessionId];
            };

            const server = createMcpServer();
            await server.connect(transport);
        } catch (error) {
            console.error('Error establishing SSE stream:', error);
            if (!res.headersSent) {
                res.status(500).send('Error establishing SSE stream');
            }
        }
    };

    app.get('/mcp', requireAuth, handleSseConnection);
    app.get('/sse', requireAuth, handleSseConnection);

    app.post('/messages', requireAuth, async (req: Request, res: Response) => {
        const sessionId = req.query.sessionId as string | undefined;
        if (!sessionId) {
            res.status(400).send('Missing sessionId parameter');
            return;
        }

        const transport = transports[sessionId];
        if (!transport) {
            res.status(404).send('Session not found');
            return;
        }

        try {
            await transport.handlePostMessage(req, res, req.body);
        } catch (error) {
            console.error('Error handling MCP message:', error);
            if (!res.headersSent) {
                res.status(500).send('Error handling MCP message');
            }
        }
    });

    const closeTransports = async () => {
        for (const sessionId of Object.keys(transports)) {
            try {
                await transports[sessionId].close();
                delete transports[sessionId];
            } catch (error) {
                console.error(`Error closing transport for session ${sessionId}:`, error);
            }
        }
    };

    return {app, transports, host, closeTransports};
}
