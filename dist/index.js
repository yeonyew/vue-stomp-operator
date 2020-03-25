import { __extends } from "tslib";
import StompOperator from './StompOperator';
export * from './StompOperator';
var VueStompOperator = /** @class */ (function (_super) {
    __extends(VueStompOperator, _super);
    function VueStompOperator(url, conf) {
        var _this = _super.call(this, url, conf) || this;
        return _this;
    }
    VueStompOperator.install = function (Vue, args) {
        var protoName = args.name ? ('$' + args.name) : '$stomp';
        if (!Vue.prototype[protoName]) {
            var VSO_1 = new VueStompOperator(args.url, args.conf);
            Object.defineProperty(Vue.prototype, protoName, {
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