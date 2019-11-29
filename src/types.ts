import {Client as StompClient} from "@stomp/stompjs";

export type errorCallback = (err: any) => void;
export type stompErrorCallback = (err: any, stomp: StompClient) => void;
export type connectCallback = () => void;
export type closeCallback = () => void;
