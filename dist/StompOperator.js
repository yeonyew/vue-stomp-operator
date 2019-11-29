import { __assign } from "tslib";
import SockJS from 'sockjs-client';
import { Client as StompClient } from '@stomp/stompjs';
import * as uuid from 'uuid';
function getProtocol(url) {
    var pos = url.indexOf(':');
    if (pos < 0)
        return false;
    return url.substr(0, pos);
}
var StompOperator = /** @class */ (function () {
    function StompOperator(url) {
        this.url = null;
        this.ws = null;
        this.timeout = 5000;
        this.onStompError = null;
        this.onError = null;
        this.onConnect = null;
        this.onClose = null;
        this._stomp = null;
        this._connected = false;
        this._pool = {};
        this._subscribeList = [];
        this._oldSubscribeList = [];
        if (url) {
            this.url = url;
        }
        return this;
    }
    Object.defineProperty(StompOperator.prototype, "client", {
        get: function () {
            return this._stomp;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StompOperator.prototype, "connected", {
        get: function () {
            return this._connected;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StompOperator.prototype, "connection", {
        /**
         * @deprecated Use instead 'connected' of 'connection'.
         */
        get: function () {
            return this.connected;
        },
        enumerable: true,
        configurable: true
    });
    StompOperator.prototype.connect = function (onConnect) {
        var _this = this;
        var stomp = this._stomp = new StompClient();
        stomp.onConnect = function () {
            _this._connected = true;
            if (onConnect) {
                onConnect.call(stomp);
            }
            if (_this.onConnect) {
                _this.onConnect();
            }
        };
        stomp.onStompError = function (err) {
            if (_this.onStompError) {
                _this.onStompError(err, stomp);
            }
            if (_this.onError) {
                _this.onError(err);
            }
        };
        stomp.onWebSocketClose = function () {
            _this._connected = false;
            if (_this.onClose) {
                _this.onClose();
            }
            _this._oldSubscribeList = _this._subscribeList.slice();
            _this._subscribeList = [];
        };
        stomp.onWebSocketError = function (err) {
            if (_this.onError) {
                _this.onError(err);
            }
        };
        if (this.ws) {
            var ws_1 = this.ws;
            stomp.webSocketFactory = function () { return ws_1; };
        }
        else if (this.url) {
            var url_1 = this.url;
            var proto = url_1 ? getProtocol(url_1) : undefined;
            switch (proto) {
                case 'ws':
                    stomp.webSocketFactory = function () { return new WebSocket(url_1); };
                    break;
                case 'http':
                case 'https':
                    stomp.webSocketFactory = function () { return new SockJS(url_1); };
                    break;
                default:
                    throw Error('Unknown protocol: ' + proto);
            }
        }
        else {
            throw Error('Either ws or url must be present');
        }
        stomp.activate();
    };
    StompOperator.prototype.forceDisconnect = function () {
        if (this._stomp) {
            this._stomp.forceDisconnect();
        }
    };
    StompOperator.prototype.deactivate = function () {
        if (this._stomp) {
            this._connected = false;
            this._stomp.deactivate();
            this._stomp = null;
        }
    };
    StompOperator.prototype.isSubscribe = function (endPoint) {
        return this._subscribeList.filter(function (sub) {
            return sub.endpoint === endPoint;
        });
    };
    StompOperator.prototype.subscribe = function (endPoint, callback, error, isUniqueEndpoint) {
        var _this = this;
        if (this._stomp && this._stomp.connected) {
            var imi = this.isSubscribe(endPoint);
            if (isUniqueEndpoint && imi.length > 0) {
                return null;
            }
            var sub = this._stomp.subscribe(endPoint, function (message) {
                var body = JSON.parse(message.body);
                if (body === 'UNAUTHORIZED') {
                    if (error) {
                        error.call(null, 'UNAUTHORIZED');
                    }
                    return;
                }
                var mid = message.headers['_mid'];
                if (!mid && body.hasOwnProperty('_mid')) {
                    mid = body._mid;
                    Object.defineProperty(body, '_mid', {
                        enumerable: false,
                        configurable: false,
                        writable: false,
                        value: body._mid,
                    });
                }
                if (mid && _this._pool.hasOwnProperty(mid)) {
                    var unit = _this._pool[mid];
                    if (unit.timeout !== null) {
                        clearTimeout(unit.timeout);
                    }
                    unit.onReceive(Object.freeze(body));
                }
                if (callback) {
                    callback.call(null, Object.freeze(body), message);
                }
            });
            if (sub) {
                console.log('subscribe success: ' + endPoint);
                this._subscribeList.push(__assign({ endpoint: endPoint }, sub));
            }
            return sub;
        }
    };
    StompOperator.prototype.send = function (endPoint, data, header, timeout) {
        var _this = this;
        var ctxId = uuid.v4();
        var _header = header || {};
        var $stomp = this._stomp;
        var _timeout = timeout;
        if (_timeout === undefined) {
            _timeout = this.timeout;
        }
        return new Promise(function (resolve, reject) {
            if (!($stomp && $stomp.connected)) {
                reject('NOT CONNECTED');
                return null;
            }
            if (!_this._pool.hasOwnProperty(ctxId)) {
                $stomp.publish({
                    destination: endPoint,
                    headers: __assign({ _mid: ctxId }, _header),
                    body: JSON.stringify(__assign({ _mid: ctxId }, data)),
                });
                var timeoutId = null;
                if (_timeout !== null) {
                    timeoutId = setTimeout(function () {
                        reject('TIMEOUT');
                        delete _this._pool[ctxId];
                    }, _timeout);
                }
                _this._pool[ctxId] = {
                    onReceive: function (message) { return resolve(message); },
                    timeout: timeoutId,
                };
            }
        });
    };
    return StompOperator;
}());
export default StompOperator;
//# sourceMappingURL=StompOperator.js.map