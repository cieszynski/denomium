import { DatabaseSync } from 'node:sqlite';

const database = new DatabaseSync(':memory:');

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
        break;
}

Deno.serve({
    port: 0,
    async handler(request) {
        if (request.headers.get("upgrade") !== "websocket") {
            const url = new URL(request.url);

            if (url.pathname.endsWith('/')) {
                url.pathname += 'index.html';
            }

            console.log(import.meta.dirname + url.pathname);

            try {
                const file = await Deno.open(import.meta.dirname + url.pathname, { 
                    read: true 
                });
                
                return new Response(file.readable);
            } catch({name, message}) {
                switch(name) {
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
            socket.send("pong");
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
    }
});