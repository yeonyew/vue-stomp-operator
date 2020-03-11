import { Client as StompClient, IMessage } from "@stomp/stompjs";
export declare type errorCallback = (err: any) => void;
export declare type stompErrorCallback = (err: any, stomp: StompClient) => void;
export declare type connectCallback = () => void;
export declare type closeCallback = () => void;
export interface IResponseEvent {
    raw: IMessage;
    status: number;
    headers: Record<string, string>;
    body: any;
}
export declare type responseInterceptorCallback = (responseEvent: IResponseEvent) => Promise<IResponseEvent> | IResponseEvent;
export declare type validateStatusInterceptorCallback = (responseEvent: IResponseEvent) => Promise<boolean> | boolean;
export interface IInterceptors {
    response?: responseInterceptorCallback;
    validateStatus?: validateStatusInterceptorCallback;
}
export interface ISendOptions extends IInterceptors {
    timeout?: number;
}
