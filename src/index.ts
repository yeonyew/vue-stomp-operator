import _Vue, {PluginFunction} from 'vue';
import StompOperator from './StompOperator'

export * from './StompOperator'
export * from './types'

export default class VueStompOperator extends StompOperator {
    public static install (Vue: typeof _Vue, args: {name: string, url: string}): void {
        const protoName = args.name ? ('$' + args.name) : '$stomp';
        if (!Vue.prototype[protoName]) {
            const VSO = new VueStompOperator(args.url);
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

    constructor(url: string) {
        super(url);
        return this;
    }
}
