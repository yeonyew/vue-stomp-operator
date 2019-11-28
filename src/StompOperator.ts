import SockJS from 'sockjs-client';
import {
    Client as StompClient,
    IMessage,
} from '@stomp/stompjs';
import uuid from 'uuid';
import {MessageContext} from './types/StompOperator';

export class StompOperator {
    get client(): StompClient | null {
        return this.stomp;
    }
    public connected: boolean = false;
    private url: string = '';
    private ws: WebSocket | null = null;
    private stomp: StompClient | null = null;
    private pool: MessageContext = {};
    private timeout: number = 5000;
    private subscribeList: any[] = [];
    private oldSubscribeList: any[] = [];

    constructor(url: string) {
        this.url = url;
        return this;
    }

    public connect(onConnect: () => any) {
        const url = this.url;
        const proto = url.split(':')[0].toLowerCase();
        const stomp = this.stomp = new StompClient();
        stomp.onConnect = () => {
            onConnect.call(this.stomp);
            this.connected = true;
        };
        stomp.onStompError = (err) => {
            console.error(err);
        };
        stomp.onWebSocketClose = () => {
            console.log('disconnected');
            this.connected = false;
            this.oldSubscribeList = this.subscribeList.slice();
            this.subscribeList = [];
        };
        stomp.onWebSocketError = (err) => {
            console.error('Websocket Error!', err);
        };
        if (url.split(':')[0] === 'ws') {
            stomp.webSocketFactory = () => new WebSocket(url);
        } else {
            if (this.ws === null && url) {
                stomp.webSocketFactory = () => new SockJS(url);
            }
        }
        let flag = false;
        switch (proto) {
            case 'ws':
                stomp.webSocketFactory = () => new WebSocket(url);
                flag = true;
                break;
            case 'http':
            case 'https':
                if (this.ws === null && url) {
                    stomp.webSocketFactory = () => new SockJS(url);
                    flag = true;
                }
                break;
        }
        if (flag) { this.stomp.activate(); }
    }

    public disconnect(onDisconnect: () => any) {

    }

    public isSubscribe(endPoint: string) {
        return this.subscribeList.filter((sub) => {
            return sub.endpoint === endPoint;
        });
    }

    public subscribe(
        endPoint: string,
        callback: (body: any) => any,
        error?: (err: any) => any,
        isUniqueEndpoint?: boolean) {
        if (this.stomp && this.stomp.connected) {
            const imi = this.isSubscribe(endPoint);
            if (isUniqueEndpoint && imi.length > 0) {
                return null;
            }
            const sub = this.stomp.subscribe(endPoint, (message) => {
                const body = JSON.parse(message.body);
                if (body === 'UNAUTHORIZED') {
                    if (error) { error.call(null, 'UNAUTHORIZED'); }
                    return;
                }
                // const body = JSON.parse(message.body);
                if (body.hasOwnProperty('_mid')) {
                    const _mid = body._mid;
                    Object.defineProperty(body, '_mid', {
                        enumerable: false,
                        configurable: false,
                        writable: false,
                        value: body._mid,
                    });
                    if (this.pool.hasOwnProperty(_mid)) {
                        const unit = this.pool[_mid];
                        if (unit.timeout !== null) { clearTimeout(unit.timeout); }
                        unit.onReceive(Object.freeze(body));
                    }
                }
                callback.call(null, Object.freeze(body));
            });
            if (sub) {
                console.log('subscribe success: ' + endPoint);
                this.subscribeList.push({ endpoint: endPoint, ...sub});
            }
            return sub;
        }
    }

    public send(endPoint: string, data: any, header?: any, timeout?: number | null) {
        const ctxId = uuid.v4();
        const _header = header || {};
        const $stomp = this.stomp;
        let _timeout = timeout;
        if (_timeout === undefined) {
            _timeout = this.timeout;
        }
        return new Promise((resolve, reject) => {
            if (!($stomp && $stomp.connected)) {
                reject('NOT CONNECTED');
                return null;
            }
            if (!this.pool.hasOwnProperty(ctxId)) {
                $stomp.publish({
                    destination: endPoint,
                    headers: {..._header},
                    body: JSON.stringify({_mid: ctxId, ...data}),
                });

                let timeoutId: number | null = null;
                if (_timeout !== null) {
                    timeoutId = setTimeout(() => {
                        reject('TIMEOUT');
                        delete this.pool[ctxId];
                    }, _timeout);
                }

                this.pool[ctxId] = {
                    onReceive: (message) => resolve(message),
                    timeout: timeoutId,
                };
            }
        });
    }
}
