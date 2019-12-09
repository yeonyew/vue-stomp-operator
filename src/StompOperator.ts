import SockJS from 'sockjs-client';

import {
    Client as StompClient, IMessage
} from '@stomp/stompjs';
import * as uuid from 'uuid';

import {
    connectCallback,
    closeCallback,
    errorCallback,
    stompErrorCallback,

    IInterceptors,
    ISendOptions,
    IResponseEvent
} from './types'

export interface MessageContext {
    onReceive: (responseEvent: IResponseEvent) => any,
    onError: (e: any, responseEvent: IResponseEvent) => void,
    // timeout: ReturnType<typeof setTimeout> | null,
    timeout: any,
    sendOptions: ISendOptions
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

    public interceptors: IInterceptors = {};

    public onStompError: stompErrorCallback | null = null;
    public onError: errorCallback | null = null;
    public onConnect: connectCallback | null = null;
    public onClose: closeCallback | null = null;

    private _stomp: StompClient | null = null;
    private _connected: boolean = false;
    private _pool: Record<string, MessageContext> = {};
    private _remoteVersion: number = 0;
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
        callback?: (responseEvent: IResponseEvent) => any,
        error?: (err: any, responseEvent?: IResponseEvent) => any,
        isUniqueEndpoint?: boolean) {
        const _error = (unit: MessageContext | undefined, err: any, responseEvent: IResponseEvent) => {
            let handled = false;
            if (unit) {
                if(unit.onError) {
                    unit.onError(err, responseEvent);
                    handled = true;
                }
            }
            if (error) {
                error(err, responseEvent);
                handled = true;
            }
            if (!handled) {
                throw err;
            }
        };
        if (this._stomp && this._stomp.connected) {
            const imi = this.isSubscribe(endPoint);
            if (isUniqueEndpoint && imi.length > 0) {
                return null;
            }
            const sub = this._stomp.subscribe(endPoint, async (message) => {
                const version = message.headers['x-version'] ? parseInt(message.headers['x-version']) : 0;
                const body = JSON.parse(message.body);
                let responseEvent: IResponseEvent = {
                    raw: message,
                    status: 0,
                    headers: message.headers,
                    body: body
                };

                if(!this._remoteVersion && version)
                    this._remoteVersion = version;

                if(version == 0) {
                    if (body === 'UNAUTHORIZED') {
                        _error(undefined, Error('UNAUTHORIZED'), responseEvent);
                        return;
                    }
                    let mid = message.headers['_mid'];
                    if (!mid && body.hasOwnProperty('_mid')) {
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
                        if (unit.timeout !== null) {
                            clearTimeout(unit.timeout);
                        }
                        unit.onReceive(Object.freeze(responseEvent));
                    }
                }
                else if(version == 1) {
                    let interceptors: IInterceptors;
                    let unit: MessageContext | undefined = undefined;

                    const mid = message.headers['x-mid'];
                    responseEvent.status = parseInt(message.headers['x-status']);

                    if (mid && this._pool.hasOwnProperty(mid)) {
                        unit = this._pool[mid];
                        delete this._pool[mid];
                        interceptors = unit.sendOptions;
                    } else {
                        interceptors = this.interceptors;
                    }

                    if(interceptors.response) {
                        responseEvent = await interceptors.response(responseEvent);
                    }
                    if(!interceptors.validateStatus) {
                        interceptors.validateStatus = (r) => ((r.status >= 200) && (r.status < 400));
                    }
                    if(!await interceptors.validateStatus(responseEvent)) {
                        _error(unit, Error('Received failed response'), responseEvent);
                        return ;
                    }
                    if(unit) {
                        unit.onReceive(Object.freeze(responseEvent));
                    }
                }
                if (callback) {
                    callback.call(null, Object.freeze(responseEvent));
                }
            });
            if (sub) {
                this._subscribeList.push({ endpoint: endPoint, ...sub});
            }
            return sub;
        }
    }

    public send (endPoint: string, data: any, header?: any, sendOptions?: ISendOptions): Promise<any> {
        const ctxId = uuid.v4();
        const _header = header || {};
        const $stomp = this._stomp;
        const _sendOptions: ISendOptions = sendOptions || {
            timeout: this.timeout
        };
        return new Promise<any>((resolve, reject) => {
            if (!($stomp && $stomp.connected)) {
                reject('NOT CONNECTED');
                return null;
            }
            if (!this._pool.hasOwnProperty(ctxId)) {
                let timeoutId: any;
                if (_sendOptions.timeout) {
                    timeoutId = setTimeout(() => {
                        reject(Error('TIMEOUT'));
                        delete this._pool[ctxId];
                    }, _sendOptions.timeout);
                }

                this._pool[ctxId] = {
                    onReceive: (message) => resolve(message),
                    onError: (e) => reject(e),
                    timeout: timeoutId,
                    sendOptions: _sendOptions
                };

                const transformedBody = (this._remoteVersion > 0) ? data : {_mid: ctxId, ...data};

                $stomp.publish({
                    destination: endPoint,
                    headers: {'x-mid': ctxId, ..._header},
                    body: JSON.stringify(transformedBody), // For old version compatible
                });
            }
        });
    }
}

export default StompOperator;
