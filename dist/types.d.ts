import { Client as StompClient } from "@stomp/stompjs";
export declare type errorCallback = (err: any) => void;
export declare type stompErrorCallback = (err: any, stomp: StompClient) => void;
export declare type connectCallback = () => void;
export declare type closeCallback = () => void;
