import {
    Client as StompClient, IMessage
} from "@stomp/stompjs";

export type errorCallback = (err: any) => void;
export type stompErrorCallback = (err: any, stomp: StompClient) => void;
export type connectCallback = () => void;
export type closeCallback = () => void;

export interface IResponseEvent {
    raw: IMessage;
    status: number;
    headers: Record<string, string>;
    body: any;
}

export type responseInterceptorCallback = (responseEvent: IResponseEvent) => Promise<IResponseEvent> | IResponseEvent;
export type validateStatusInterceptorCallback = (responseEvent: IResponseEvent) => Promise<boolean> | boolean;

export interface IInterceptors {
    response?: responseInterceptorCallback;
    validateStatus?: validateStatusInterceptorCallback;
}

export interface ISendOptions extends IInterceptors {
    timeout?: number;
}
