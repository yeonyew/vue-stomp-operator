import Vue, {PluginFunction} from 'vue';
import VueStompOperator from './VueStompOperator';
import {StompOperator} from './StompOperator';

export default VueStompOperator;

declare module 'vue/types/vue' {
    interface Vue {
        $stomp: StompOperator;
    }
}
