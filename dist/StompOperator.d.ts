import { Client as StompClient } from '@stomp/stompjs';
import { connectCallback, closeCallback, errorCallback, stompErrorCallback, IInterceptors, ISendOptions, IResponseEvent } from './types';
import { StompConfig } from "@stomp/stompjs/esm5/stomp-config";
export interface MessageContext {
    onReceive: (responseEvent: IResponseEvent) => any;
    onError: (e: any, responseEvent: IResponseEvent) => void;
    timeout: any;
    sendOptions: ISendOptions;
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
    conf: StompConfig;
    interceptors: IInterceptors;
    onStompError: stompErrorCallback | null;
    onError: errorCallback | null;
    onConnect: connectCallback | null;
    onClose: closeCallback | null;
    private _stomp;
    private _connected;
    private _pool;
    private _remoteVersion;
    private _subscribeList;
    private _oldSubscribeList;
    constructor(url?: string, conf?: StompConfig);
    connect(onConnect?: () => any): void;
    forceDisconnect(): void;
    deactivate(): void;
    isSubscribe(endPoint: string): any[];
    subscribe(endPoint: string, callback?: (responseEvent: IResponseEvent) => any, error?: (err: any, responseEvent?: IResponseEvent) => any, isUniqueEndpoint?: boolean): import("@stomp/stompjs").StompSubscription | null | undefined;
    send(endPoint: string, data: any, header?: any, sendOptions?: ISendOptions): Promise<any>;
}
export default StompOperator;
