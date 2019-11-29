import SockJS from 'sockjs-client';

import {
    Client as StompClient, IMessage
} from '@stomp/stompjs';
import * as uuid from 'uuid';

import {
    connectCallback,
    closeCallback,
    errorCallback,
    stompErrorCallback
} from './types'

export interface MessageContext {
    [id: string]: {
        onReceive: (msg: IMessage | any) => any,
        // timeout: ReturnType<typeof setTimeout> | null,
        timeout: number | null,
    };
}

function getProtocol (url: string): string | false {
    const pos = url.indexOf(':');
    if(pos < 0)
        return false;
    return url.substr(0, pos);
}

class StompOperator {
    public get client (): StompClient | null {
        return this._stomp;
    }

    public get connected (): boolean {
        return this._connected;
    }

    /**
     * @deprecated Use instead 'connected' of 'connection'.
     */
    public get connection (): boolean {
        return this.connected;
    }

    public url: string | null = null;
    public ws: WebSocket | null = null;
    public timeout: number = 5000;

    public onStompError: stompErrorCallback | null = null;
    public onError: errorCallback | null = null;
    public onConnect: connectCallback | null = null;
    public onClose: closeCallback | null = null;

    private _stomp: StompClient | null = null;
    private _connected: boolean = false;
    private _pool: MessageContext = {};
    private _subscribeList: any[] = [];
    private _oldSubscribeList: any[] = [];

    constructor (url?: string) {
        if(url) {
            this.url = url;
        }
        return this;
    }

    public connect (onConnect?: () => any) {
        const stomp = this._stomp = new StompClient();
        stomp.onConnect = () => {
            this._connected = true;
            if (onConnect) {
                onConnect.call(stomp);
            }
            if(this.onConnect) {
                this.onConnect();
            }
        };
        stomp.onStompError = (err) => {
            if (this.onStompError) {
                this.onStompError(err, stomp);
            }
            if (this.onError) {
                this.onError(err);
            }
        };
        stomp.onWebSocketClose = () => {
            this._connected = false;
            if (this.onClose) {
                this.onClose();
            }
            this._oldSubscribeList = this._subscribeList.slice();
            this._subscribeList = [];
        };
        stomp.onWebSocketError = (err) => {
            if(this.onError) {
                this.onError(err);
            }
        };
        if(this.ws) {
            const ws = this.ws;
            stomp.webSocketFactory = () => ws;
        } else if (this.url) {
            const url = this.url;
            const proto = url ? getProtocol(url) : undefined;
            switch (proto) {
            case 'ws':
                stomp.webSocketFactory = () => new WebSocket(url);
                break;
            case 'http':
            case 'https':
                stomp.webSocketFactory = () => new SockJS(url);
                break;
            default:
                throw Error('Unknown protocol: ' + proto);
            }
        } else {
            throw Error('Either ws or url must be present');
        }
        stomp.activate();
    }

    public forceDisconnect () {
        if (this._stomp) {
            this._stomp.forceDisconnect();
        }
    }

    public deactivate () {
        if (this._stomp) {
            this._connected = false;
            this._stomp.deactivate();
            this._stomp = null;
        }
    }

    public isSubscribe (endPoint: string) {
        return this._subscribeList.filter((sub) => {
            return sub.endpoint === endPoint;
        });
    }

    public subscribe (
        endPoint: string,
        callback?: (body: any, message?: IMessage) => any,
        error?: (err: any) => any,
        isUniqueEndpoint?: boolean) {
        if (this._stomp && this._stomp.connected) {
            const imi = this.isSubscribe(endPoint);
            if (isUniqueEndpoint && imi.length > 0) {
                return null;
            }
            const sub = this._stomp.subscribe(endPoint, (message) => {
                const body = JSON.parse(message.body);
                if (body === 'UNAUTHORIZED') {
                    if (error) { error.call(null, 'UNAUTHORIZED'); }
                    return;
                }
                let mid = message.headers['_mid'];
                if(!mid && body.hasOwnProperty('_mid')) {
                    mid = body._mid;
                    Object.defineProperty(body, '_mid', {
                        enumerable: false,
                        configurable: false,
                        writable: false,
                        value: body._mid,
                    });
                }
                if (mid && this._pool.hasOwnProperty(mid)) {
                    const unit = this._pool[mid];
                    if (unit.timeout !== null) { clearTimeout(unit.timeout); }
                    unit.onReceive(Object.freeze(body));
                }
                if (callback) {
                    callback.call(null, Object.freeze(body), message);
                }
            });
            if (sub) {
                console.log('subscribe success: ' + endPoint);
                this._subscribeList.push({ endpoint: endPoint, ...sub});
            }
            return sub;
        }
    }

    public send (endPoint: string, data: any, header?: any, timeout?: number | null): Promise<any> {
        const ctxId = uuid.v4();
        const _header = header || {};
        const $stomp = this._stomp;
        let _timeout = timeout;
        if (_timeout === undefined) {
            _timeout = this.timeout;
        }
        return new Promise<any>((resolve, reject) => {
            if (!($stomp && $stomp.connected)) {
                reject('NOT CONNECTED');
                return null;
            }
            if (!this._pool.hasOwnProperty(ctxId)) {
                $stomp.publish({
                    destination: endPoint,
                    headers: {_mid: ctxId, ..._header},
                    body: JSON.stringify({_mid: ctxId, ...data}), // For old version compatible
                });

                let timeoutId: number | null = null;
                if (_timeout !== null) {
                    timeoutId = setTimeout(() => {
                        reject('TIMEOUT');
                        delete this._pool[ctxId];
                    }, _timeout);
                }

                this._pool[ctxId] = {
                    onReceive: (message) => resolve(message),
                    timeout: timeoutId,
                };
            }
        });
    }
}

export default StompOperator;
