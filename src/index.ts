import Vue, {VueConstructor} from 'vue';
import {StompOperator} from '@/plugins/VueStompOperator/StompOperator';
import {CombinedVueInstance} from 'vue/types/vue';

export default class VueStompOperator extends StompOperator {
    static vso: StompOperator;

    public static install(Vue: VueConstructor, args: {url: string}) {
        const url = args.url;
        if (Vue.prototype.$stomp) { return; }
        // Vue.prototype.$stomp = new StompOperator(url);
        const VSO = new VueStompOperator(url);
        Object.defineProperty(Vue.prototype, '$stomp', {
            get() {
                return VSO;
            },
        });
        Vue.mixin({
            beforeCreate(): void {
                Vue.observable(VSO);
            },
        });
    }

    constructor(url: string) {
        super(url);
        return this;
    }
}
