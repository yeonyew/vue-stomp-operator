import { VueConstructor } from 'vue';
import StompOperator from './StompOperator';
export * from './StompOperator';
export * from './types';
export default class VueStompOperator extends StompOperator {
    static install(Vue: VueConstructor, args: {
        name?: string;
        url: string;
    }): void;
    constructor(url: string);
}
