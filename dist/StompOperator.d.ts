import { Client as StompClient, IMessage } from '@stomp/stompjs';
import { connectCallback, closeCallback, errorCallback, stompErrorCallback } from './types';
export interface MessageContext {
    [id: string]: {
        onReceive: (msg: IMessage | any) => any;
        timeout: number | null;
    };
}
declare class StompOperator {
    get client(): StompClient | null;
    get connected(): boolean;
    /**
     * @deprecated Use instead 'connected' of 'connection'.
     */
    get connection(): boolean;
    url: string | null;
    ws: WebSocket | null;
    timeout: number;
    onStompError: stompErrorCallback | null;
    onError: errorCallback | null;
    onConnect: connectCallback | null;
    onClose: closeCallback | null;
    private _stomp;
    private _connected;
    private _pool;
    private _subscribeList;
    private _oldSubscribeList;
    constructor(url?: string);
    connect(onConnect?: () => any): void;
    forceDisconnect(): void;
    deactivate(): void;
    isSubscribe(endPoint: string): any[];
    subscribe(endPoint: string, callback?: (body: any, message?: IMessage) => any, error?: (err: any) => any, isUniqueEndpoint?: boolean): import("@stomp/stompjs").StompSubscription | null | undefined;
    send(endPoint: string, data: any, header?: any, timeout?: number | null): Promise<any>;
}
export default StompOperator;
