import { VueConstructor } from 'vue';
import StompOperator from './StompOperator';
import { StompConfig } from "@stomp/stompjs/esm5/stomp-config";
export * from './StompOperator';
export * from './types';
export default class VueStompOperator extends StompOperator {
    static install(Vue: VueConstructor, args: {
        name?: string;
        url: string;
        conf?: StompConfig;
    }): void;
    constructor(url: string, conf?: StompConfig);
}
