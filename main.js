/* 
Deno compile -A --include index.html --include denomium.js --include manifest.json --include favicon-16x16.png --include favicon-32x32.png --include favicon-192x192.png --include favicon-512x512.png --icon android-chrome-512x512.ico main.js 
*/

/* icon: 8bpp, 1-bit alpha, 256-slot palette */

import { DatabaseSync } from 'node:sqlite';
const database = new DatabaseSync('test.sqlite');

let browser;

switch (Deno.build.os) {
    case 'linux':
        ['chromium', 'chromium-browser'].forEach(name => {
            const { code } = new Deno.Command('which', {
                args: [name]
            }).outputSync();

            if (code === 0) {
                browser = name
                return;
            }
        })
        break;
    case 'windows':
        browser = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
        break;
}

Deno.serve({
    hostname: '127.0.0.1',
    port: 9999,
    async handler(request) {
        if (request.headers.get("upgrade") !== "websocket") {
            const url = new URL(request.url);

            if (url.pathname.endsWith('/')) {
                url.pathname += 'index.html';
            }

            console.log('handler', import.meta.dirname + url.pathname);

            try {
                const file = await Deno.open(import.meta.dirname + url.pathname, {
                    read: true
                });

                return new Response(file.readable);
            } catch ({ name, message }) {
                switch (name) {
                    case 'NotFound':
                        return new Response(message, { status: 404 });
                    default:
                        return new Response(message, { status: 500 })
                }
            }
        }

        // If the request is a websocket upgrade,
        // we need to use the Deno.upgradeWebSocket helper
        const { socket, response } = Deno.upgradeWebSocket(request);

        socket.onopen = () => {
            console.log("CONNECTED");
        };
        socket.onmessage = (event) => {
            console.log(`RECEIVED: ${event.data}`);

            const obj = JSON.parse(event.data);

            setTimeout(() => {
                socket.send(event.data);
            }, obj?.ms ?? 1000);
        };
        socket.onclose = () => {
            console.log("DISCONNECTED");
            Deno.exit(0);
        };
        socket.onerror = (error) => console.error("ERROR:", error);

        return response;
    },
    onListen(event) {
        new Deno.Command(browser, {
            args: [
                `--app=http://localhost:${event.port}`
            ]
        }).spawn();
    },
    onfinished() {
        console.log('onfinished')
    }
});