/*
 * The Primary file for the API
 *
 */

 // Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
var fs = require('fs');

// Instantiate the HTTP server
const httpServer = http.createServer((req, res) => {
    unifiedServer(req, res);
});

// Start the HTTP server
httpServer.listen(config.httpPort, () =>
    console.log('The server is listening on port: ' + config.httpPort));

// Instantiate the HTTPS server
const httpsServerOptions = {
    'key' : fs.readFileSync('./https/key.pem'),
    'cert' : fs.readFileSync('./https/cert.pem')
};
const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
    unifiedServer(req, res);
});

// Start the HTTPS server
httpsServer.listen(config.httpsPort, () =>
    console.log('The server is listening on port: ' + config.httpsPort));

// All the server logi for both http and https servers
const unifiedServer = (req, res) => {

    // Get the url and parse it
    const parsedUrl = url.parse(req.url, true);

    // Get the path from that url
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '')

    // Get the query string as an object
    const queryStringObject = parsedUrl.query;

    // Get the HTTP Method
    const method = req.method.toLowerCase();

    // Get the headers as an object
    const headers = req.headers;

    // Get the payload, if any
    const decoder = new StringDecoder('utf-8');
    let buffer = '';
    // payload comes in strange format, so decoder decodes it and make is readable
    req.on('data', data => buffer += decoder.write(data));
    req.on('end', () => {
        buffer += decoder.end();

        // Choose the handler this request should go to. If one is not found, use the not found handler
        const choseHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

        // Counstruct the data object to send to the handler
        const data  = {
            'trimmedPath' : trimmedPath,
            'queryStringObject' : queryStringObject,
            'method' : method,
            'headers' : headers,
            'payload' : buffer
        }

        // Route the request to the handler specified in the router
        // This was not clear from the beginning,
        // But here we are actually create a response to the client
        // with the new header, status and payload(body)
        choseHandler(data, (statusCode, payload) => {
            // Use the status code called back by the handler, or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            // Use the payload called back by the handler, or default to an empty object
            payload = typeof(payload) == 'object' ? payload : {}

            // Conver the payload to a string
            const payloadString = JSON.stringify(payload);

            // Return the response
            res.setHeader('Content-Type', 'applicaiton/json');
            res.writeHead(statusCode);
            res.end(payloadString);

            // Log the request path
            console.log('Returning this response: ' + statusCode, payloadString);
        });
    });
}

// Define the handlers
const handlers = {};

// Ping handler
handlers.ping = (data, callback) => {
    callback(200);
}

handlers.hello = (data, callback) => {
    if (data.method == 'post' && Object.keys(data.payload).length !== 0)
        callback(200, {'message': 'hello from server'});
    else
        callback(406);
}

// Not found handler
handlers.notFound = (data, callback) => {
    callback(404);
}

// Define a requiest router
const router = {
    'ping' : handlers.ping,
    'hello' : handlers.hello
};
