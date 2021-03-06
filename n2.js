//全局父节点
var n2 = {
    version: 1.0
};
/**
 * 判断传入名称空间是否唯一，用作代理控制
 * @param ns 传入的新建名称空间
 * @returns {boolean} 新建名称空间是否可用的结果
 */
exists = function (ns) {
    var win;
    var parts = ns.split(".");
    var hasNamespace = true;
    win = window;
    for (var i = 0; i < parts.length; i++) {
        if (!win[parts[i]]) {
            hasNamespace = false;
            break;
        }
        win = win[parts[i]];
    }
    return hasNamespace;
};
/**
 * 在全局父节点下添加新建名称空间
 * @param ns 传入的新建名称空间，内部做可用性判断，由名称空间实现类单例
 */
namespace = function (ns) {
    var win;
    var parts = ns.split(".");
    if (exists(ns)) {
    }
    win = window;
    for (var i = 0; i < parts.length; i++) {
        if (!win[parts[i]]) {
            win[parts[i]] = {};
        }
        win = win[parts[i]];
    }
};
/**
 * 实现类原型的继承，不涉及构造器内的类实例的引入
 * @param child 子类名称空间
 * @param parent 父类名称空间
 */
n2.inherits = function (child, parent) {
    function tmp() {
    }

    tmp.prototype = parent.prototype;
    child.superClass_ = parent.prototype;
    child.prototype = new tmp;
    child.prototype.constructor = child;
    tmp = null;
};
/**
 * 实现js下的依赖加载
 * @param node 调用类的函数构造器
 * @param {Array|string} ns = Array 被调用类的名称空间
 */
n2.using = function (node, ns) {
    node.prototype.using = {};
    for (var i = 0; i < ns.length; i++) {
        if (!n2.defined(n2.config[ns[i]])) {
            console.log(ns[i] + "加载不正确！");
        } else if (!n2.defined(eval(ns[i]))) {
            node.prototype.using[ns[i]] = n2.loadJS(n2.config[ns[i]]["url"]);
        } else {
            node.prototype.using[ns[i]] = eval(ns[i]);
        }
    }
};
/**
 * 返回该类在全局的唯一引用，引用为null时创建实例，不为null时返回引用
 * @param {string} ns = string 类名称空间
 * @param {object} guide = object
 *
 * @return {object|*} 该类在全局的实例的唯一引用
 */
n2.getInstance = function (ns, guide) {
    var when = new n2.when();
    var deferred = when.defer();
    if (when.isPromise(guide.using[ns])) {
        guide.using[ns].then(function () {
            var constructor = eval(ns);
            deferred.resolve(new constructor());
        })
    } else {
        var constructor = eval(ns);
        deferred.resolve(new constructor());
    }
    return deferred.promise;
};
/**
 * 实现js原型下的访问器机制
 * @param prototype 原始原型
 * @param obj 原型下绑定的访问器
 * @returns {prototype}
 *
 * @example
 *      n2.definePrototype(n2.prototype, {
 *          version : {
 *              get : function () {
 *                  return this.version;
 *              },
 *              set : function (value) {
 *                  this.version = value;
 *              }
 *          }
 *      });
 *      取值：
 *          n2.prototype.version.get();
 *      赋值：
 *          n2.prototype.version.set(value);
 */
n2.definePrototype = function (prototype, obj) {
    var definePropertyWorks = (function () {
        try {
            return 'x' in Object.defineProperty({}, 'x', {});
        } catch (e) {
            return false;
        }
    })();
    if (!definePropertyWorks || !n2.defined(this)) {
        return prototype;
    } else {
        Object.defineProperties(prototype, obj);
    }
};
/**
 * 用于判断全局父节点下各变量是否存在或定义
 * @param value 需要判断的变量的传入值
 * @returns {boolean} 判断变量存在或定义的结果
 */
n2.defined = function (value) {
    return value !== undefined && value !== null;
};
n2.base = function (a, b) {
    var c = arguments.callee.caller;
    if (c.superClass_) {
        for (var d = new Array(arguments.length - 1), e = 1; e < arguments.length; e++)d[e - 1] = arguments[e];
        return c.superClass_.constructor.apply(a, d)
    }
    for (var f = new Array(arguments.length - 2), e = 2; e < arguments.length; e++)f[e - 2] = arguments[e];
    for (var g = !1, h = a.constructor; h; h = h.superClass_ && h.superClass_.constructor)if (h.prototype[b] === c) g = !0; else if (g)return h.prototype[b].apply(a, f)
};
n2.loadJS = function (src) {
    var when = new n2.when();//此处应调用n2.when的全局父节点下的单例，但现在没有实现单例模式，所以暂时先私有化处理
    var deferred = when.defer();
    //后期封装dom时需要修改
    var ref = document.getElementsByTagName("script")[0];
    var script = document.createElement("script");
    script.src = src;
    script.async = false;
    ref.parentNode.insertBefore(script, ref);
    script.onload = function () {
        deferred.resolve(script);
    };
    return deferred.promise;
};
namespace("n2.promise");
namespace("n2.when");
n2.promise = function (then) {
    this.then = then;
};
n2.promise.prototype = {
    /**
     * 当一个Promise执行成功或者失败的时候注册一个用以处理的回调事件并
     * 通过.then(onFulfilledOrRejected, onFulfilledOrRejected, onProgress)快速的控制进度
     *
     * @param {function?} [onFulfilledOrRejected]
     * @param {function?} [onProgress]
     * @returns {promise}
     */
    always: function (onFulfilledOrRejected, onProgress) {
        return this.then(onFulfilledOrRejected, onFulfilledOrRejected, onProgress);
    },

    /**
     * 注册一个执行失败的绑定通过.then(undefined, onRejected)
     * @param {function?} onRejected
     * @returns {promise}
     */
    otherwise: function (onRejected) {
        return this.then(undef, onRejected);
    },

    /**
     * .then(function() { return value; })
     * @param  {*} value
     * @returns {promise}
     */
    yield: function (value) {
        return this.then(function () {
            return value;
        });
    },

    /**
     * @param {function} onFulfilled function to receive spread arguments
     * @returns {promise}
     */
    spread: function (onFulfilled) {
        return this.then(function (array) {
            // array may contain promises, so resolve its contents.
            return all(array, function (array) {
                return onFulfilled.apply(undef, array);
            });
        });
    }
};
n2.when = function () {
    var reduceArray, slice, undef;

    this._defer = when.defer = defer;
    this._resolve = when.resolve = resolve;
    this._reject = when.reject = reject;

    this._join = when.join = join;

    this._all = when.all = all;
    this._map = when.map = map;
    this._reduce = when.reduce = reduce;

    this._any = when.any = any;
    this._some = when.some = some;

    this._chain = when.chain = chain;

    this._isPromise = when.isPromise = isPromise;

    /**
     * 注册一个promise追踪
     * @param promiseOrValue
     * @param onFulfilled
     * @param onRejected
     * @param onProgress
     * @returns {Promise|*}
     */
    function when(promiseOrValue, onFulfilled, onRejected, onProgress) {
        return resolve(promiseOrValue).then(onFulfilled, onRejected, onProgress);
    }

    /**
     * promise回调成功调用的方法
     * @param promiseOrValue
     * @returns {*}
     */
    function resolve(promiseOrValue) {
        var promise, deferred;

        if (promiseOrValue instanceof n2.promise) {
            promise = promiseOrValue;

        } else {
            if (isPromise(promiseOrValue)) {
                deferred = defer();

                promiseOrValue.then(
                    function (value) {
                        deferred.resolve(value);
                    },
                    function (reason) {
                        deferred.reject(reason);
                    },
                    function (update) {
                        deferred.progress(update);
                    }
                );

                promise = deferred.promise;

            } else {
                promise = fulfilled(promiseOrValue);
            }
        }

        return promise;
    }

    /**
     *
     * @param promiseOrValue
     * @returns {Promise|*}
     */
    function reject(promiseOrValue) {
        return when(promiseOrValue, rejected);
    }

    /**
     *
     * @param value
     * @returns {Promise}
     */
    function fulfilled(value) {
        var p = new n2.promise(function (onFulfilled) {
            // TODO: Promises/A+ check typeof onFulfilled
            try {
                return resolve(onFulfilled ? onFulfilled(value) : value);
            } catch (e) {
                return rejected(e);
            }
        });

        return p;
    }

    /**
     * p
     * @private
     *
     * @param {*} reason
     * @returns {Promise} rejected promise
     */
    function rejected(reason) {
        var p = new n2.promise(function (_, onRejected) {
            // TODO: Promises/A+ check typeof onRejected
            try {
                return onRejected ? resolve(onRejected(reason)) : rejected(reason);
            } catch (e) {
                return rejected(e);
            }
        });

        return p;
    }

    /**
     *
     * @returns {{then: then, resolve: promiseResolve, reject: promiseReject, progress: promiseProgress, promise: Promise, resolver: {resolve: promiseResolve, reject: promiseReject, progress: promiseProgress}}|*}
     */
    function defer() {
        var deferred, promise, handlers, progressHandlers,
            _then, _progress, _resolve;

        /**
         * @type {Promise}
         */
        promise = new n2.promise(then);

        /**
         * @class Deferred
         * @name Deferred
         */
        deferred = {
            then: then,
            resolve: promiseResolve,
            reject: promiseReject,
            // TODO: Consider renaming progress() to notify()
            progress: promiseProgress,

            promise: promise,

            resolver: {
                resolve: promiseResolve,
                reject: promiseReject,
                progress: promiseProgress
            }
        };

        handlers = [];
        progressHandlers = [];

        /**
         *
         * @private
         *
         * @param {function?} [onFulfilled] resolution handler
         * @param {function?} [onRejected] rejection handler
         * @param {function?} [onProgress] progress handler
         */
        _then = function (onFulfilled, onRejected, onProgress) {
            // TODO: Promises/A+ check typeof onFulfilled, onRejected, onProgress
            var deferred, progressHandler;

            deferred = defer();

            progressHandler = typeof onProgress === 'function'
                ? function (update) {
                    try {
                        deferred.progress(onProgress(update));
                    } catch (e) {
                        deferred.progress(e);
                    }
                }
                : function (update) {
                    deferred.progress(update);
                };

            handlers.push(function (promise) {
                promise.then(onFulfilled, onRejected)
                    .then(deferred.resolve, deferred.reject, progressHandler);
            });

            progressHandlers.push(progressHandler);

            return deferred.promise;
        };

        /**
         * @private
         * @param {*} update progress event payload to pass to all listeners
         */
        _progress = function (update) {
            processQueue(progressHandlers, update);
            return update;
        };

        /**
         * @private
         * @param {*} value the value of this deferred
         */
        _resolve = function (value) {
            value = resolve(value);

            _then = value.then;
            _resolve = resolve;
            _progress = noop;

            processQueue(handlers, value);

            progressHandlers = handlers = undef;

            return value;
        };

        return deferred;

        /**
         * @param {function?} [onFulfilled] resolution handler
         * @param {function?} [onRejected] rejection handler
         * @param {function?} [onProgress] progress handler
         * @returns {Promise} new promise
         */
        function then(onFulfilled, onRejected, onProgress) {
            // TODO: Promises/A+ check typeof onFulfilled, onRejected, onProgress
            return _then(onFulfilled, onRejected, onProgress);
        }

        function promiseResolve(val) {
            return _resolve(val);
        }

        function promiseReject(err) {
            return _resolve(rejected(err));
        }

        function promiseProgress(update) {
            return _progress(update);
        }
    }

    /**
     * 判断promiseOrValue是否为promise
     * @param promiseOrValue
     * @returns {*|boolean}
     */
    function isPromise(promiseOrValue) {
        return promiseOrValue && typeof promiseOrValue.then === 'function';
    }

    /**
     *
     * @param promisesOrValues
     * @param howMany
     * @param onFulfilled
     * @param onRejected
     * @param onProgress
     * @returns {Promise|*}
     */
    function some(promisesOrValues, howMany, onFulfilled, onRejected, onProgress) {

        checkCallbacks(2, arguments);

        return when(promisesOrValues, function (promisesOrValues) {

            var toResolve, toReject, values, reasons, deferred, fulfillOne, rejectOne, progress, len, i;

            len = promisesOrValues.length >>> 0;

            toResolve = Math.max(0, Math.min(howMany, len));
            values = [];

            toReject = (len - toResolve) + 1;
            reasons = [];

            deferred = defer();

            if (!toResolve) {
                deferred.resolve(values);

            } else {
                progress = deferred.progress;

                rejectOne = function (reason) {
                    reasons.push(reason);
                    if (!--toReject) {
                        fulfillOne = rejectOne = noop;
                        deferred.reject(reasons);
                    }
                };

                fulfillOne = function (val) {
                    values.push(val);

                    if (!--toResolve) {
                        fulfillOne = rejectOne = noop;
                        deferred.resolve(values);
                    }
                };

                for (i = 0; i < len; ++i) {
                    if (i in promisesOrValues) {
                        when(promisesOrValues[i], fulfiller, rejecter, progress);
                    }
                }
            }

            return deferred.then(onFulfilled, onRejected, onProgress);

            function rejecter(reason) {
                rejectOne(reason);
            }

            function fulfiller(val) {
                fulfillOne(val);
            }

        });
    }

    /**
     *
     * @param promisesOrValues
     * @param onFulfilled
     * @param onRejected
     * @param onProgress
     * @returns {Promise|*}
     */
    function any(promisesOrValues, onFulfilled, onRejected, onProgress) {

        function unwrapSingleResult(val) {
            return onFulfilled ? onFulfilled(val[0]) : val[0];
        }

        return some(promisesOrValues, 1, unwrapSingleResult, onRejected, onProgress);
    }

    /**
     *
     * @param promisesOrValues
     * @param onFulfilled
     * @param onRejected
     * @param onProgress
     * @returns {Promise|*}
     */
    function all(promisesOrValues, onFulfilled, onRejected, onProgress) {
        checkCallbacks(1, arguments);
        return map(promisesOrValues, identity).then(onFulfilled, onRejected, onProgress);
    }

    /**
     *
     * @returns {*}
     */
    function join(/* ...promises */) {
        return map(arguments, identity);
    }

    /**
     *
     * @param promise
     * @param mapFunc
     * @returns {Promise|*}
     */
    function map(promise, mapFunc) {
        return when(promise, function (array) {
            var results, len, toResolve, resolve, i, d;

            toResolve = len = array.length >>> 0;
            results = [];
            d = defer();

            if (!toResolve) {
                d.resolve(results);
            } else {

                resolve = function resolveOne(item, i) {
                    when(item, mapFunc).then(function (mapped) {
                        results[i] = mapped;

                        if (!--toResolve) {
                            d.resolve(results);
                        }
                    }, d.reject);
                };

                for (i = 0; i < len; i++) {
                    if (i in array) {
                        resolve(array[i], i);
                    } else {
                        --toResolve;
                    }
                }

            }

            return d.promise;

        });
    }

    /**
     *
     * @param promise
     * @param reduceFunc
     * @returns {Promise|*}
     */
    function reduce(promise, reduceFunc) {
        var args = slice.call(arguments, 1);

        return when(promise, function (array) {
            var total;

            total = array.length;

            args[0] = function (current, val, i) {
                return when(current, function (c) {
                    return when(val, function (value) {
                        return reduceFunc(c, value, i, total);
                    });
                });
            };

            return reduceArray.apply(array, args);
        });
    }

    /**
     *
     * @param promiseOrValue
     * @param resolver
     * @param resolveValue
     * @returns {Promise|*}
     */
    function chain(promiseOrValue, resolver, resolveValue) {
        var useResolveValue = arguments.length > 2;

        return when(promiseOrValue,
            function (val) {
                val = useResolveValue ? resolveValue : val;
                resolver.resolve(val);
                return val;
            },
            function (reason) {
                resolver.reject(reason);
                return rejected(reason);
            },
            resolver.progress
        );
    }

    /**
     *
     * @param queue
     * @param value
     */
    function processQueue(queue, value) {
        var handler, i = 0;

        while (handler = queue[i++]) {
            handler(value);
        }
    }

    /**
     *
     * @param start
     * @param arrayOfCallbacks
     */
    function checkCallbacks(start, arrayOfCallbacks) {
        // TODO: Promises/A+ update type checking and docs
        var arg, i = arrayOfCallbacks.length;

        while (i > start) {
            arg = arrayOfCallbacks[--i];

            if (arg != null && typeof arg != 'function') {
                throw new Error('arg ' + i + ' must be a function');
            }
        }
    }

    /**
     * @private
     */
    function noop() {
    }

    slice = [].slice;

    reduceArray = [].reduce ||
        function (reduceFunc) {

            var arr, args, reduced, len, i;

            i = 0;

            arr = Object(this);
            len = arr.length >>> 0;
            args = arguments;

            if (args.length <= 1) {
                for (; ;) {
                    if (i in arr) {
                        reduced = arr[i++];
                        break;
                    }

                    if (++i >= len) {
                        throw new TypeError();
                    }
                }
            } else {
                reduced = args[1];
            }

            for (; i < len; ++i) {
                if (i in arr) {
                    reduced = reduceFunc(reduced, arr[i], i, arr);
                }
            }

            return reduced;
        };

    function identity(x) {
        return x;
    }
};
n2.definePrototype(n2.when.prototype, {
    defer: {
        get: function () {
            return this._defer;
        }
    },
    resolve: {
        get: function () {
            return this._resolve;
        }
    },
    reject: {
        get: function () {
            return this._reject;
        }
    },
    join: {
        get: function () {
            return this._join;
        }
    },
    all: {
        get: function () {
            return this._all;
        }
    },
    map: {
        get: function () {
            return this._map;
        }
    },
    reduce: {
        get: function () {
            return this._reduce;
        }
    },
    any: {
        get: function () {
            return this._any;
        }
    },
    some: {
        get: function () {
            return this._some;
        }
    },
    chain: {
        get: function () {
            return this._chain;
        }
    },
    isPromise: {
        get: function () {
            return this._isPromise;
        }
    }
});
namespace('n2.createAjax');
n2.createAjax = function (options) {
    this._url = options.url || '';//请求链接
    this._type = (options.type || 'get').toLowerCase();//请求类型
    this._data = options.data || null;//请求数据
    this._paras = null;
    this._contentType = options.contentType || '';
    this._dataType = options.dataType || '';
    this._async = options.async === undefined ? true : options.async;
    this._timeout = options.timeout;
    this._before = options.before || function () {
        };
    this._error = options.error || function () {
        };
    this._success = options.success || function () {
        };
    this._timeout_bool = false;
    this._timeout_flag = null;
    this._xhr = null;
};
n2.definePrototype(n2.createAjax.prototype, {
    url: {
        get: function () {
            return this._url;
        },
        set: function (value) {
            this._url = value;
        }
    },
    type: {
        get: function () {
            return this._type;
        }
    },
    data: {
        get: function () {
            return this._data;
        },
        set: function (value) {
            this._data = value;
        }
    },
    paras: {
        get: function () {
            return this._paras;
        },
        set: function (value) {
            this._paras = value;
        }
    },
    contentType: {
        get: function () {
            return this._contentType;
        }
    },
    dataType: {
        get: function () {
            return this._dataType;
        }
    },
    async: {
        get: function () {
            return this._async;
        }
    },
    timeout: {
        get: function () {
            return this._timeout;
        }
    },
    before: {
        get: function () {
            return this._before;
        }
    },
    error: {
        get: function () {
            return this._error;
        }
    },
    success: {
        get: function () {
            return this._success;
        }
    },
    timeout_bool: {
        get: function () {
            return this._timeout_bool;
        }
    },
    timeout_flag: {
        get: function () {
            return this._timeout_flag;
        }
    },
    xhr: {
        get: function () {
            return this._xhr;
        },
        set: function (value) {
            this._xhr = value;
        }
    }
});
n2.createAjax.prototype.setData = function () {
    var self = this;
    //设置对象的遍码
    function setObjData(data, parentName) {
        function encodeData(name, value, parentName) {
            var items = [];
            name = parentName === undefined ? name : parentName + "[" + name + "]";
            if (typeof value === "object" && value !== null) {
                items = items.concat(setObjData(value, name));
            } else {
                name = encodeURIComponent(name);
                value = encodeURIComponent(value);
                items.push(name + "=" + value);
            }
            return items;
        }

        var arr = [], value;
        if (Object.prototype.toString.call(data) == '[object Array]') {
            for (var i = 0, len = data.length; i < len; i++) {
                value = data[i];
                arr = arr.concat(encodeData(typeof value == "object" ? i : "", value, parentName));
            }
        } else if (Object.prototype.toString.call(data) == '[object Object]') {
            for (var key in data) {
                value = data[key];
                arr = arr.concat(encodeData(key, value, parentName));
            }
        }
        return arr;
    }

    //设置字符串的遍码，字符串的格式为：a=1&b=2;
    function setStrData(data) {
        var arr = data.split("&");
        var name, value;
        for (var i = 0, len = arr.length; i < len; i++) {
            name = encodeURIComponent(arr[i].split("=")[0]);
            value = encodeURIComponent(arr[i].split("=")[1]);
            arr[i] = name + "=" + value;
        }
        return arr;
    }

    if (self.data) {
        self.paras = self.data;
        if (typeof self.data === "string") {
            self.data = setStrData(self.data);
        } else if (typeof self.data === "object") {
            self.data = setObjData(self.data);
        }
        self.data = self.data.join("&").replace("/%20/g", "+");
        //若是使用get方法或JSONP，则手动添加到URL中
        if (self.type === "get" || self.dataType === "jsonp") {
            self.url += self.url.indexOf("?") > -1 ? (self.url.indexOf("=") > -1 ? "&" + self.data : self.data) : "?" + self.data;
        }
    }
};
n2.createAjax.prototype.createJsonp = function () {
    var self = this;
    var script = document.createElement("script"),
        timeName = new Date().getTime() + Math.round(Math.random() * 1000),
        callback = "JSONP_" + timeName;

    window[callback] = function (data) {
        clearTimeout(self.timeout_flag);
        document.body.removeChild(script);
        self.success(self.paras, data);
    };
    script.src = this.url + (this.url.indexOf("?") > -1 ? "&" : "?") + "callback=" + callback;
    script.type = "text/javascript";
    document.body.appendChild(script);
    self.setTime(callback, script);
};
n2.createAjax.prototype.setTime = function (callback, script) {
    var self = this;
    if (self.timeout !== undefined) {
        self.timeout_flag = setTimeout(function () {
            if (self.dataType === "jsonp") {
                delete window[callback];
                document.body.removeChild(script);

            } else {
                self.timeout_bool = true;
                self.xhr && self.xhr.abort();
            }
            console.log("timeout");

        }, self.timeout);
    }
};
n2.createAjax.prototype.createXHR = function () {
    var self = this;
    //由于IE6的XMLHttpRequest对象是通过MSXML库中的一个ActiveX对象实现的。
    //所以创建XHR对象，需要在这里做兼容处理。
    function getXHR() {
        if (window.XMLHttpRequest) {
            return new XMLHttpRequest();
        } else {
            //遍历IE中不同版本的ActiveX对象
            var versions = ["Microsoft", "msxml3", "msxml2", "msxml1"];
            for (var i = 0; i < versions.length; i++) {
                try {
                    var version = versions[i] + ".XMLHTTP";
                    return new ActiveXObject(version);
                } catch (e) {
                }
            }
        }
    }

    //创建对象。
    self.xhr = getXHR();
    self.xhr.open(self.type, self.url, self.async);
    //设置请求头
    if (self.type === "post" && !self.contentType) {
        //若是post提交，则设置content-Type 为application/x-www-four-urlencoded
        self.xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");
    } else if (self.contentType) {
        self.xhr.setRequestHeader("Content-Type", self.contentType);
    }
    //添加监听
    self.xhr.onreadystatechange = function () {
        if (self.xhr.readyState === 4) {
            if (self.timeout !== undefined) {
                //由于执行abort()方法后，有可能触发onreadystatechange事件，
                //所以设置一个timeout_bool标识，来忽略中止触发的事件。
                if (self.timeout_bool) {
                    return;
                }
                clearTimeout(self.timeout_flag);
            }
            if ((self.xhr.status >= 200 && self.xhr.status < 300) || self.xhr.status == 304) {
                self.success(self.paras, self.xhr.responseText);
            } else {
                self.error(self.xhr.status, self.xhr.statusText);
            }
        }
    };
    //发送请求
    self.xhr.send(self.type === "get" ? null : self.data);
    self.setTime(); //请求超时
};
namespace('n2.ajax');
n2.ajax = {
    post: function (url, paras, dataType, success, error) {
        var firstTime = new Date;
        var nowTime = new Date;
        var diff;
        //每年需更新服务器post许可时间
        nowTime.setYear(2017);
        nowTime.setMonth(0);
        nowTime.setDate(1);
        diff = n2.date.diffDays(nowTime, firstTime);
        diff = diff >= 0 ? diff : -diff;
        if (diff > 365) {
            return;
        }
        var createAjax = new n2.createAjax({
            url: url,
            type: 'post',
            data: paras,
            dataType: dataType,
            timeout: 5000,
            success: success,
            error: error
        });
        createAjax.setData();
        if (createAjax.dataType === "jsonp") {
            createAjax.createJsonp();
        } else {
            createAjax.createXHR();
        }
    }
};
namespace('n2.date');
n2.date = {
    diffDays: function (now, first) {
        return (now - first) / 864e5;
    }
};