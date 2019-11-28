import {IMessage} from '@stomp/stompjs';
export interface MessageContext {
    [id: string]: {
        onReceive: (msg: IMessage | any) => any,
        // timeout: ReturnType<typeof setTimeout> | null,
        timeout: number | null,
    };
}
export declare class StompOperator {
    public url: string;
    public ws: any;
    public stomp: any;
    public connected: boolean;
    public pool: MessageContext;
    public connect(onConnect: (stompClient: any) => any): void;
    public subscribe(endPoint: string, onMessage: (message: IMessage) => any, onError?: (message: any) => any, isUniqueEndpoint?: boolean): void;
    public send(endPoint: string, data: any, header?: any, timeout?: number | null): Promise<any>;
    public get connection(): boolean;
}
