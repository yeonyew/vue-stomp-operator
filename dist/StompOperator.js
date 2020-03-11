import { __assign, __awaiter, __generator } from "tslib";
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
        this.interceptors = {};
        this.onStompError = null;
        this.onError = null;
        this.onConnect = null;
        this.onClose = null;
        this._stomp = null;
        this._connected = false;
        this._pool = {};
        this._remoteVersion = 0;
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
        var _error = function (unit, err, responseEvent) {
            var handled = false;
            if (unit) {
                if (unit.onError) {
                    unit.onError(err, responseEvent);
                    handled = true;
                }
            }
            if (error) {
                error(err, responseEvent);
                handled = true;
            }
            if (!handled) {
                throw err;
            }
        };
        if (this._stomp && this._stomp.connected) {
            var imi = this.isSubscribe(endPoint);
            if (isUniqueEndpoint && imi.length > 0) {
                return null;
            }
            var sub = this._stomp.subscribe(endPoint, function (message) { return __awaiter(_this, void 0, void 0, function () {
                var version, body, responseEvent, mid, unit, interceptors, unit, mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            version = message.headers['x-version'] ? parseInt(message.headers['x-version']) : 0;
                            body = JSON.parse(message.body);
                            responseEvent = {
                                raw: message,
                                status: 0,
                                headers: message.headers,
                                body: body
                            };
                            if (!this._remoteVersion && version)
                                this._remoteVersion = version;
                            if (!(version == 0)) return [3 /*break*/, 1];
                            if (body === 'UNAUTHORIZED') {
                                _error(undefined, Error('UNAUTHORIZED'), responseEvent);
                                return [2 /*return*/];
                            }
                            mid = message.headers['_mid'];
                            if (!mid && body.hasOwnProperty('_mid')) {
                                mid = body._mid;
                                Object.defineProperty(body, '_mid', {
                                    enumerable: false,
                                    configurable: false,
                                    writable: false,
                                    value: body._mid,
                                });
                            }
                            if (mid && this._pool.hasOwnProperty(mid)) {
                                unit = this._pool[mid];
                                if (unit.timeout !== null) {
                                    clearTimeout(unit.timeout);
                                }
                                unit.onReceive(Object.freeze(responseEvent));
                            }
                            return [3 /*break*/, 5];
                        case 1:
                            if (!(version == 1)) return [3 /*break*/, 5];
                            interceptors = void 0;
                            unit = undefined;
                            mid = message.headers['x-mid'];
                            responseEvent.status = parseInt(message.headers['x-status']);
                            if (mid && this._pool.hasOwnProperty(mid)) {
                                unit = this._pool[mid];
                                delete this._pool[mid];
                                interceptors = unit.sendOptions;
                            }
                            else {
                                interceptors = this.interceptors;
                            }
                            if (!interceptors.response) return [3 /*break*/, 3];
                            return [4 /*yield*/, interceptors.response(responseEvent)];
                        case 2:
                            responseEvent = _a.sent();
                            _a.label = 3;
                        case 3:
                            if (!interceptors.validateStatus) {
                                interceptors.validateStatus = function (r) { return ((r.status >= 200) && (r.status < 400)); };
                            }
                            return [4 /*yield*/, interceptors.validateStatus(responseEvent)];
                        case 4:
                            if (!(_a.sent())) {
                                _error(unit, Error('Received failed response'), responseEvent);
                                return [2 /*return*/];
                            }
                            if (unit) {
                                unit.onReceive(Object.freeze(responseEvent));
                            }
                            _a.label = 5;
                        case 5:
                            if (callback) {
                                callback.call(null, Object.freeze(responseEvent));
                            }
                            return [2 /*return*/];
                    }
                });
            }); });
            if (sub) {
                this._subscribeList.push(__assign({ endpoint: endPoint }, sub));
            }
            return sub;
        }
    };
    StompOperator.prototype.send = function (endPoint, data, header, sendOptions) {
        var _this = this;
        var ctxId = uuid.v4();
        var _header = header || {};
        var $stomp = this._stomp;
        var _sendOptions = sendOptions || {
            timeout: this.timeout
        };
        return new Promise(function (resolve, reject) {
            if (!($stomp && $stomp.connected)) {
                reject('NOT CONNECTED');
                return null;
            }
            if (!_this._pool.hasOwnProperty(ctxId)) {
                var timeoutId = void 0;
                if (_sendOptions.timeout) {
                    timeoutId = setTimeout(function () {
                        reject(Error('TIMEOUT'));
                        delete _this._pool[ctxId];
                    }, _sendOptions.timeout);
                }
                _this._pool[ctxId] = {
                    onReceive: function (message) { return resolve(message); },
                    onError: function (e) { return reject(e); },
                    timeout: timeoutId,
                    sendOptions: _sendOptions
                };
                var transformedBody = (_this._remoteVersion > 0) ? data : __assign({ _mid: ctxId }, data);
                $stomp.publish({
                    destination: endPoint,
                    headers: __assign({ 'x-mid': ctxId }, _header),
                    body: JSON.stringify(transformedBody),
                });
            }
        });
    };
    return StompOperator;
}());
export default StompOperator;
//# sourceMappingURL=StompOperator.js.map