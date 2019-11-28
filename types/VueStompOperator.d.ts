import {PluginFunction} from 'vue';
import {StompOperator} from './StompOperator';

export declare class VueStompOperator extends StompOperator {
    public static install: PluginFunction<never>;
    constructor(url: string);
    public init(url: string): void;
}
