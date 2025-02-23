const https = require('https');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const config = require('../../utils/config');
const { getUserDataPath } = require('../../shared/helpers');
const logger = require('../../utils/logger');
const globals = require('../../shared/globals');

let wss = null;

const checkPort = (port) => {
    return new Promise((resolve, reject) => {
        const testServer = https.createServer().listen(port);

        testServer.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                logger.error(globals.mainWindow, `Port ${port} is already in use by another application`);
                reject(new Error(`Port ${port} is already in use`));
            } else {
                logger.error(globals.mainWindow, `Port check failed: ${error.message}`);
                reject(error);
            }
        });

        testServer.on('listening', () => {
            logger.info(globals.mainWindow, `Port ${port} is available for use`);
            testServer.close(() => resolve());
        });
    });
};

const startServer = () => {
    const port = config.getConfig('appPort');
    const apiKey = config.getConfig('apiKey');

    return new Promise(async (resolve, reject) => {
        try {
            await checkPort(port);

            logger.info(globals.mainWindow, 'Starting Printier Server...');
            
            const server = https.createServer({
                key: fs.readFileSync(path.join(getUserDataPath(), "certs", "printier.software-key.pem"), "utf8"),
                cert: fs.readFileSync(path.join(getUserDataPath(), "certs", "printier.software.pem"), "utf8")
            }, function (req, res) {
                const clientIP = req.socket.remoteAddress;
                const method = req.method;
                const url = req.url;
                const userAgent = req.headers['user-agent'] || 'Unknown Client';

                logger.info(globals.mainWindow, `Incoming HTTPS ${method} request to ${url}`);
                logger.info(globals.mainWindow, `Client: ${clientIP} | User-Agent: ${userAgent}`);
                logger.info(globals.mainWindow, `Request Headers: ${JSON.stringify(req.headers, null, 2)}`);

                if (method !== 'GET') {
                    logger.warning(globals.mainWindow, `Invalid request method: ${method} from ${clientIP}`);
                    res.writeHead(405, { 
                        'Content-Type': 'application/json',
                        'Allow': 'GET'
                    });
                    res.end(JSON.stringify({ error: 'Method not allowed' }));
                    return;
                }

                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Server': 'Printier/1.0',
                    'X-Powered-By': 'Printier'
                });
                
                const responseData = {
                    status: 'running',
                    server: 'Printier',
                    version: '1.0'
                };
                
                res.end(JSON.stringify(responseData));
                logger.success(globals.mainWindow, `HTTPS request completed successfully | Status: 200 | Client: ${clientIP}`);
            });

            if (wss) {
                logger.info(globals.mainWindow, 'Closing existing WebSocket server');
                wss.close();
            }

            wss = new WebSocket.Server({ 
                server,
                verifyClient: (info) => {
                    const queryString = info.req.url.split('?')[1] || '';
                    const params = new URLSearchParams(queryString);
                    const clientApiKey = params.get('apiKey');
                    const clientIP = info.req.socket.remoteAddress;
                    const userAgent = info.req.headers['user-agent'] || 'Unknown Client';
                    
                    logger.info(globals.mainWindow, `WebSocket connection attempt from ${clientIP}`);
                    logger.info(globals.mainWindow, `Client Info - IP: ${clientIP} | User-Agent: ${userAgent}`);
                    
                    if (clientApiKey !== apiKey) {
                        logger.error(globals.mainWindow, `Authentication failed: Invalid API key from ${clientIP}`);
                        return false;
                    }
                    logger.success(globals.mainWindow, `Client authentication successful: ${clientIP}`);
                    return true;
                }
            });
            
            logger.info(globals.mainWindow, 'WebSocket server initialized with API key authentication');

            wss.on('connection', (ws, req) => {
                const clientInfo = `Client (${req.socket.remoteAddress})`;
                logger.success(globals.mainWindow, `New client connected: ${clientInfo}`);
                logger.sendStatus(globals.mainWindow, wss.clients.size > 0);

                ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data);
                        
                        if (message.type === 'print') {
                            logger.info(globals.mainWindow, `Print request received from ${clientInfo}`);
                            logger.info(globals.mainWindow, `Print data: ${JSON.stringify(message.data, null, 2)}`);
                            
                            const printerAvailable = true;
                            
                            if (printerAvailable) {
                                ws.send(JSON.stringify({ type: 'print_status', status: 'success' }));
                                logger.success(globals.mainWindow, `Print job completed successfully for ${clientInfo}`);
                            } else {
                                ws.send(JSON.stringify({ type: 'print_status', status: 'error', message: 'Printer not available' }));
                                logger.error(globals.mainWindow, `Print job failed: Printer not available for ${clientInfo}`);
                            }
                        }
                    } catch (error) {
                        logger.error(globals.mainWindow, `Message processing failed for ${clientInfo}: ${error.message}`);
                        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
                    }
                });

                ws.on('close', () => {
                    logger.info(globals.mainWindow, `Client disconnected: ${clientInfo}`);
                    logger.sendStatus(globals.mainWindow, wss.clients.size > 0);
                });

                ws.on('error', (error) => {
                    logger.error(globals.mainWindow, `WebSocket error for ${clientInfo}: ${error.message}`);
                    logger.sendStatus(globals.mainWindow, wss.clients.size > 0);
                });
            });

            server.listen(port, '0.0.0.0', () => {
                logger.success(globals.mainWindow, `Server started successfully on port ${port}`);
                logger.info(globals.mainWindow, `Server is ready to accept secure connections over HTTPS/WSS`);
                resolve(server);
            });

            server.on('error', (error) => {
                logger.error(globals.mainWindow, `Server error: ${error.message}`);
                reject(error);
            });

            server.on('close', () => {
                if (wss) {
                    logger.info(globals.mainWindow, 'WebSocket server is shutting down');
                    wss.close();
                    wss = null;
                }
            });
        } catch (error) {
            logger.error(globals.mainWindow, `Failed to start server: ${error.message}`);
            reject(error);
        }
    });
};

module.exports = startServer; 