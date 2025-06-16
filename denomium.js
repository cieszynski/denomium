// MIT License

// Copyright (c) 2025 Stephan Cieszynski

Object.defineProperty(globalThis, 'denomium', {
    value: globalThis?.denomium ?? new class Denomium {

        constructor() {

            const websocket = new WebSocket(`ws://localhost:${location.port}`);

            websocket.onopen = (event) => {
                console.debug('websocket.onopen');
            }

            websocket.onclose = (event) => {
                console.debug('websocket.onclose');
            }

            websocket.onerror = (event) => {
                console.error(event.data);
            }

            websocket.addEventListener('message', (event)=>{
                console.debug(event.data);
            });

            this.send = (lib, verb, obj = {}) => {
                const uuid = crypto.randomUUID();
                const json = JSON.stringify(
                    Object.assign(obj, {
                        lib: lib,
                        verb: verb,
                        uuid: uuid
                    }));

                websocket.send(json);

                return new Promise((resolve, reject) => {
                    const func = (event) => {

                        const obj = JSON.parse(event.data)

                        if (obj.uuid && obj.uuid === uuid) {

                            if (event.data.error) {
                                reject(event.data);
                            } else {
                                resolve(event.data);
                            }

                            websocket.removeEventListener('message', func);
                        }
                    }

                    websocket.addEventListener('message', func);
                });
            }
        }
    }
});