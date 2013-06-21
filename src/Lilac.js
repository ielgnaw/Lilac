
/**
 * [ description]
 * @param  {window} win
 * @param  {Object} L     类库暴露在宿主环境（浏览器里指 window）的标识
 * @param  {[type]} undefined undefined
 */
(function(win, L, undefined){

    L = win[L] = win[L] || {};

    var doc = win.document,

        // dom加载完成后需要执行的函数集合
        domReadyFuncList = [],

        // dom是否加载完成的标识
        domLoadComplete = false,

        // 是否绑定 DOMContentLoaded 事件
        isBindDomContentLoaded = false,

        /**
         * 在IE中，任何DOM元素都有一个 doScroll 方法，无论它们是否支持滚动条。
         * 为了判断DOM树是否建成，我们只看看documentElement是否完整，因为，
         * 它作为最外层的元素，作为DOM树的根部而存在，
         * 如果documentElement完整的话，就可以调用doScroll方法了。
         * 当页面一加载JS时，我们就执行此方法，当然要如果documentElement还不完整就会报错，
         * 我们在catch块中重新调用它，一直到成功执行
         */
        scrollCheck = function(){
            try {
                doc.documentElement.doScroll("left");
            } catch (error) {
                setTimeout(scrollCheck, 25);
                return;
            }
        },

        /**
         * domLoad完成后执行回调函数
         */
        execDomLoadedFunc = function(){
            console.log(domReadyFuncList);
            for (var i = 0, len = domReadyFuncList.length; i < len; i++) {
                if (typeof (domReadyFuncList[i]) === 'function') {
                    try {
                        domReadyFuncList[i].call(null, L);
                    } catch (e) {
                        throw new Error(e);
                    }
                }
            }
            if(isBindDomContentLoaded){
                doc.removeEventListener("DOMContentLoaded", execDomLoadedFunc, false);
                isBindDomContentLoaded = false;
            }
        },

        ready = function(){
            console.log(domReadyFuncList);
            if (doc.addEventListener) {
                if(!isBindDomContentLoaded){
                    doc.addEventListener("DOMContentLoaded", execDomLoadedFunc, false);
                    isBindDomContentLoaded = true;
                }
            }else {
                if (doc.documentElement.doScroll && window == window.top){
                    scrollCheck();
                    execDomLoadedFunc();
                }
            }
        },

        util = L.util= {
            /**
             * from http://bonsaiden.github.com/JavaScript-Garden
             */
            is: function(type, obj) {
                var clas = Object.prototype.toString.call(obj).slice(8, -1);
                return obj !== undefined && obj !== null && clas === type;
            },

            isFunction: function(item) {
                return util.is("Function", item);
            },

            isArray: function(item) {
                return util.is("Array", item);
            },

            isObject: function(item) {
                return util.is("Object", item);
            },

            each: function(items, callback){
                if(!items){
                    return;
                }
                if(!util.isArray(items)){
                    if(util.isObject(items)){
                        for(var key in items){
                            callback.call(null, key, items[key]);
                        }
                    }else{
                        try{
                            items = Array.prototype.slice.call(items);
                        }catch(e){
                            throw new Error(e);
                        }
                    }
                }
                for (var index = 0, len = items.length; index < len; index++) {
                    callback.call(null, index, items[index]);
                }
            }
        };

    L.ready = function(oFunc){
        domLoadComplete = doc.readyState === 'complete' ? true: false;
        if(domLoadComplete){
            console.log(oFunc);
            if (typeof (oFunc) === 'function') {
                setTimeout(function(){
                    oFunc.call(null, L);
                }, 25);
            }
        }else{
            domReadyFuncList.push(oFunc);
            ready();
        }
    };

    L.browser = (function(){

        var ua = win.navigator.userAgent.toLowerCase();

        var browser = {
            ie: false,
            ie6: false,
            ie7: false,
            ie8: false,
            ie9: false,
            firefox: false,
            safari: false,
            opera: false,
            chrome: false,
            gecko: false,
            webkit: false,
            version: null
        };

        if(win.opera) {
            browser.version = win.opera.version();
            browser.opera = true;
        } else {
            var match = /(chrome)[ \/]([\w.]+)/.exec(ua) ||
                /(webkit)[ \/]([\w.]+)/.exec(ua) ||
                /ms(ie)\s([\w.]+)/.exec(ua) ||
                /(firefox)[ \/]([\w.]+)/.exec(ua) ||
                [];

            if(match[1]) {
                browser[match[1]] = true;
            }

            browser.version = match[2] || "0";

            if(browser.ie){
                var ieWithVer = 'ie' + parseInt(browser.version, 10);
                if(ieWithVer in browser){
                    browser[ieWithVer] = true;
                }
            }

            if(browser.webkit) {
                browser.safari = true;
                var safariMatch = /version\/([\w.]+)/.exec(ua);
                browser.version = safariMatch[1] || "0";
            }
            if(browser.chrome) {
                browser.webkit = true;
            }
            if(browser.firefox) {
                browser.gecko = true;
            }
        }

        return browser;
    })();



})(window, 'Lilac');