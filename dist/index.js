import { __extends } from "tslib";
import StompOperator from './StompOperator';
export * from './StompOperator';
var VueStompOperator = /** @class */ (function (_super) {
    __extends(VueStompOperator, _super);
    function VueStompOperator(url) {
        var _this = _super.call(this, url) || this;
        return _this;
    }
    VueStompOperator.install = function (Vue, args) {
        var name = args.name ? ('$' + args.name) : '$stomp';
        if (!Vue.prototype[name]) {
            var VSO_1 = new VueStompOperator(args.url);
            Object.defineProperty(Vue.prototype, name, {
                get: function () {
                    return VSO_1;
                },
            });
            Vue.mixin({
                beforeCreate: function () {
                    Vue.observable(VSO_1);
                },
            });
        }
    };
    return VueStompOperator;
}(StompOperator));
export default VueStompOperator;
//# sourceMappingURL=index.js.map