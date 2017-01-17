namespace('n2.createAjax');
n2.createAjax = function (options) {
    this._url = options.url || '';//请求链接
    this._type = (options.type || 'get').toLowerCase();//请求类型
    this._data = options.data || null;//请求数据
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
        }
    }
});
n2.createAjax.prototype.setData = function () {
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

    if (data) {
        if (typeof data === "string") {
            data = setStrData(data);
        } else if (typeof data === "object") {
            data = setObjData(data);
        }
        data = data.join("&").replace("/%20/g", "+");
        //若是使用get方法或JSONP，则手动添加到URL中
        if (type === "get" || this.dataType === "jsonp") {
            this.url += this.url.indexOf("?") > -1 ? (this.url.indexOf("=") > -1 ? "&" + data : data) : "?" + data;
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
        self.success(data);
    };
    script.src = this.url + (this.url.indexOf("?") > -1 ? "&" : "?") + "callback=" + callback;
    script.type = "text/javascript";
    document.body.appendChild(script);
    self.setTime(callback, script);
};

n2.createAjax.prototype.setTime = function (callback, script) {
    if (this.timeout !== undefined) {
        this.timeout_flag = setTimeout(function() {
            if (this.dataType === "jsonp") {
                delete window[callback];
                document.body.removeChild(script);

            } else {
                this.timeout_bool = true;
                this.xhr && this.xhr.abort();
            }
            console.log("timeout");

        }, this.timeout);
    }
};