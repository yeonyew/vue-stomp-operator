import _Vue, { VueConstructor } from 'vue';
import StompOperator from './StompOperator'
import {StompConfig} from "@stomp/stompjs/esm5/stomp-config";

export * from './StompOperator'
export * from './types'

export default class VueStompOperator extends StompOperator {
    public static install (Vue: VueConstructor, args: {name?: string, url: string, conf?: StompConfig}) {
        const protoName = args.name ? ('$' + args.name) : '$stomp';
        if (!Vue.prototype[protoName]) {
            const VSO = new VueStompOperator(args.url, args.conf);
            Object.defineProperty(Vue.prototype, protoName, {
                get () {
                    return VSO;
                },
            });
            Vue.mixin({
                beforeCreate (): void {
                    Vue.observable(VSO);
                },
            });
        }
    }

    constructor(url: string, conf?: StompConfig) {
        super(url, conf);
        return this;
    }
}
