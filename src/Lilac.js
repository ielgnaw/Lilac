var define, require;

(function(global, undefined) {

    var DOC = global.document,

        HEAD = DOC.getElementsByTagName('head')[0] || DOC.body,

        /**
         * 存放script标签的文档碎片
         * @type {HTMLElement}
         */
        SCRIPTFRAG = document.createDocumentFragment(),

        /**
         * 自定义事件对象存储自定义事件type的key
         * @type {Object}
         */
        OBJ_EVT_KEY = '__objEvtKey__',

        /**
         * 存储模块信息的共享变量
         * @type {Object}
         */
        moduleMap = {},

        /**
         * 刚刚require时
         * @type {Number}
         */
        MODULES_STATUS_UNDEFINE = 'undefine',

        MODULES_STATUS_DEFINED = 'defined',

        /**
         * 模块正在加载
         * @type {Number}
         */
        MODULES_STATUS_LOADING = 'loading',

        /**
         * 模块加载完毕，即加载模块js文件执行define时
         * @type {Number}
         */
        MODULES_STATUS_LOADED = 'loaded',

        /**
         * 解析模块，解析并加载模块的依赖，在加载依赖模块时，
         * 当前模块的状态是不变的，状态变的模块是依赖的那个模块
         * @type {Number}
         */
        MODULES_STATUS_ANALYSE = 'analyse',

        /**
         * 模块加载并解析完毕
         * @type {Number}
         */
        MODULES_STATUS_SUCCESS = 'success',

        /**
         * 先要得到相对于 config.baseUrl 的绝对地址，
         * 然后根据这个绝对地址，去得到模块的地址
         * @type {String}
         */
        absolutePath = '',


        /**
         * 记录调用require
         * @type {Object}
         */
        requireMap = {};



    /**
     * 获取当前运行脚本的文件的名称，用于获取匿名模块的模块名
     * 标准浏览器(IE10、Chrome、Opera、Safari、Firefox)通过强制捕获错误(e.stack)来确定为当前运行的脚本
     *
     * @see http://www.cnblogs.com/rubylouvre/archive/2013/01/23/2872618.html
     */
    function getCurrentScript() {
        // 取得正在解析的script节点
        if (DOC.currentScript) { //firefox 4+
            return DOC.currentScript.src;
        }

        var stack;
        try {
            Ielgnaw(); //强制报错,以便捕获e.stack
        }
        catch (e) { //safari的错误对象只有line,sourceId,sourceURL
            stack = e.stack;
            if (!stack && global.opera) {
                //opera 9没有e.stack,但有e.Backtrace,但不能直接取得,需要对e对象转字符串进行抽取
                stack = (String(e).match(/of linked script \S+/g) || []).join(" ");
            }
        }
        if (stack) {
            //取得最后一行,最后一个空格或@之后的部分
            stack = stack.split(/[@ ]/g).pop();
            // 去掉换行符
            stack = stack[0] == "(" ? stack.slice(1, -1) : stack; //.replace(/\s/, '');
            //去掉行号与或许存在的出错字符起始位置
            return stack.replace(/(:\d+)?:\d+$/i, "");
        }

        var scripts = HEAD.getElementsByTagName("script");
        for (var i = 0, script; script = scripts[i++];) {
            if (script.readyState === "interactive") {
                return script.src;
            }
        }
    }

    /**
     * 得到 url 相对于 baseUrl 的绝对路径
     * @param  {string} url     url
     * @param  {string} baseUrl baseUrl
     * @return {[type]}         [description]
     */
    function parseUrl(url, baseUrl) {
        var pageHref = baseUrl || window.location.href;
        var isHttp = pageHref.slice(0, 4) === 'http';
        if (/^http:\/\//.test(url)) {
            return url;
        }
        var p1 = pageHref.replace(/^http:\/\/|\?.*$|\/$/g, '').split("/");
        if (p1.length > 1 && /\w+\.\w+$/.test(p1[p1.length - 1])) {
            p1.pop();
        }
        if (url.charAt(0) == '/') {
            return isHttp ? 'http://' + p1[0] + url : p1.join('/') + url;
        }
        if (!/^\.\.\//.test(url)) {
            if (/^\.\//.test(url)) {
                return (isHttp ? 'http://' : '') + p1.join('/') + '/' + url.replace(/\.\//g, '');
            }
            return (isHttp ? 'http://' : '') + p1.join('/') + '/' + url;
        }
        var p2 = url.split('/');
        for (var i = 0, len = p2.length; i < len; i++) {
            if (p2[i] == '..' && p1.length > 1) {
                p1.pop();
            }
            else {
                break;
            }
        }
        p2.splice(0, i);
        return (isHttp ? 'http://' : '') + p1.join('/') + '/' + p2.join('/').replace(/\.\.\//g, '');
    }


    function define() {
        var name, deps, factory,
            urlPath;
        var params = Array.prototype.slice.call(arguments);
        while (params.length) {
            var param = params.shift();
            var cls = Object.prototype.toString.call(param).slice(8, -1);
            switch (cls) {
                case 'String':
                    name = param;
                    break;
                case 'Object':
                    factory = param;
                    break;
                case 'Array':
                    deps = param;
                    break;
                case 'Function':
                    factory = param;
                    break;
                default:
                    break;
            }
        }

        if(!name){
            name = getCurrentScript();
            if(!name){
                return;
            }
            name = name.replace(/\.js$/, '');
        }else{
            name = parseUrl(name, absolutePath).replace(/\.js$/, '');
        }


        var curMod = moduleMap[name];

        if(curMod){
            curMod.deps = deps;
            curMod.realDeps = deepClone([], deps);
            curMod.factory = factory;
            curMod.status = MODULES_STATUS_DEFINED;
            curMod.baseUrl = curMod.url.substring(0, curMod.url.lastIndexOf('/'))
        }


        var requireId       = curMod.requireId,
            curRequireData  = requireMap[requireId],
            moduleUrls      = curRequireData.moduleUrls,
            moduleNames     = curRequireData.moduleNames;


        if(!curMod.deps){
            curMod.exports = getExports(curMod.name);
            curMod.status  = MODULES_STATUS_SUCCESS;
            for(var i = 0, name; name = moduleNames[i]; i++){
                if(name == curMod.name){
                    curRequireData.moduleNames = delArray(moduleNames, i);
                    curRequireData.moduleUrls  = delArray(moduleUrls, i);
                }
            }
            moduleNames = curRequireData.moduleNames;
            moduleUrls  = curRequireData.moduleUrls;
        }else{
            curMod.status = MODULES_STATUS_ANALYSE;

            for(var i = 0, dep; dep = curMod.deps[i]; i++){
                var depModuleUrl, depModuleName, depModule;

                if(/^\.+|^\//.test(dep)){
                    depModuleUrl  = parseUrl(dep, curMod.baseUrl)
                                        .replace(/\.js$/, '') + '.js',
                    depModuleName = depModuleUrl.replace(/\.js$/, ''),
                    depModule     = moduleMap[depModuleName];
                }else{
                    depModuleUrl  = parseUrl(dep, absolutePath)
                                        .replace(/\.js$/, '') + '.js',
                    depModuleName = depModuleUrl.replace(/\.js$/, ''),
                    depModule     = moduleMap[depModuleName];
                }

                if(!depModule){
                    curMod.realDeps.splice(i, 1);
                    curMod.realDeps.splice(i, 0, depModuleName);

                    depModule = moduleMap[depModuleName] = {
                        name      : depModuleName,
                        url       : depModuleUrl,
                        status    : MODULES_STATUS_UNDEFINE
                    }
                    moduleNames.unshift(depModuleName);
                    moduleUrls.unshift(depModuleUrl);
                }
            }
            curRequireData.analyseModuleList.push(curMod);
            for(var i = 0, name; name = moduleNames[i]; i++){
                if(name == curMod.name){
                    curRequireData.moduleNames = delArray(moduleNames, i);
                    curRequireData.moduleUrls = delArray(moduleUrls, i);
                }
            }
            moduleNames = curRequireData.moduleNames;
            moduleUrls  = curRequireData.moduleUrls;
        }
    }

    function getExports(modName){
        var module = moduleMap[modName];
        if (!module.exports) {
            var args = [];
            var deps = module.realDeps;
            if(deps && deps.length){
                for(var i = 0, dep; dep = deps[i]; i++){
                    var tmpName = parseUrl(dep, absolutePath).replace(/\.js$/, '');
                    if(moduleMap[tmpName].exports){
                        args.push(moduleMap[tmpName].exports);
                    }else{
                        args.push(getExports(tmpName));
                    }
                }
            }

            module.exports = isFunction(module.factory)
                             ?
                             module.factory.apply(null, args)
                             :
                             module.factory;
        }
        return module.exports;
    }

    function parseModuleName(name){
        var prefix    = [],
            prefixStr = '',
            dirs      = [],
            idDir     = [],
            oldId     = name;
        if(/^\.\./.test(name)){
            // 以 .. 开头
            dirs = name.split('/');
            for(var j = 0, dir; dir = dirs[j]; j++){
                if(dir == '..'){
                    prefix.push(dir);
                }else if(dir != '.'){
                    idDir.push(dir);
                }
            }
            prefixStr = prefix.join('/');
            if(prefixStr){
                prefixStr = prefixStr + '/';
            }
            name = idDir.join('/');
        }else if(/^\./.test(name)){
            // 以 . 开头
            dirs = name.split('/');
            for(var j = 0, dir; dir = dirs[j]; j++){
                if(dir == '.'){
                    prefix.push(dir);
                }else{
                    idDir.push(dir);
                }
            }
            prefixStr = prefix.join('/');
            if(prefixStr){
                prefixStr = prefixStr + '/';
            }
            name = idDir.join('/');
        }else if(/^\//.test(name)){
            // 以 / 开头
            prefixStr = name.charAt(0);
            name = name.substring(1);
        }

        return [name, prefixStr, oldId];
    }

    function require(ids, callback){
        // 先要得到相对于 config.baseUrl 的绝对地址，
        // 然后根据这个绝对地址，去得到模块的地址
        absolutePath = parseUrl(require.config.baseUrl);
        if(!isArray(ids)){
            ids = [ids];
        }

        var isAllLoaded = true,
            moduleUrl   = '',
            moduleUrls  = [],
            moduleNames = [],
            realName    = '',
            tmp         = [],
            tmpName     = '';

        for(var i = 0, name; name = ids[i]; i++){
            moduleUrl = parseUrl(name, absolutePath).replace(/\.js$/, '') + '.js';
            tmpName   = moduleUrl.replace(/\.js$/, '');
            tmp       = parseModuleName(name);
            realName  = tmp[2];
            if(!moduleMap[tmpName]){
                isAllLoaded = false;
                moduleMap[tmpName] = {
                    realName  : realName,
                    name      : tmpName,
                    prefix    : tmp[1],
                    url       : moduleUrl,
                    status    : MODULES_STATUS_UNDEFINE
                }
                moduleUrls.push(moduleUrl);
                moduleNames.push(tmpName);
            }
        }

        if(isAllLoaded){
            var args       = [],
                isLoad     = true,
                invalidRet = [];

            for(var i = 0, item; item = ids[i]; i++){
                var tmpName = parseUrl(item, absolutePath).replace(/\.js$/, '');
                if(moduleMap[tmpName].status != MODULES_STATUS_SUCCESS){
                    isLoad = false;
                    invalidRet.push(moduleMap[tmpName]);
                }else{
                    args[args.length++] = moduleMap[tmpName].exports;
                }
            }
            if(isLoad){
                callback.apply(null, args);
            }else{
                var invalidRetStr = '';
                for(var i = 0, invalid; invalid = invalidRet[i]; i++){
                    invalidRetStr += invalid.realName;
                    if(i != invalidRet.length - 1){
                        invalidRetStr += ' and ';
                    }
                }
                throw new Error('[MODULE_UNSUCCESS] '
                    + invalidRetStr
                    + ' \'S STATUS IS UNSUCCESS'
                );
            }

            return;
        }

        var requireId = new Date().getTime()
            + '_'
            + Math.floor(Math.random() * 100 + 1)
            + '_'
            + ids.join('_');

        requireMap[requireId] = {
            moduleNames         : moduleNames,
            moduleUrls          : moduleUrls,
            callback            : callback,
            callbackArgs        : deepClone([], moduleNames),
            analyseModuleList   : []
        };

        register(requireMap[requireId], 'loadSuccess', function(d){
            callback.apply(null, d.args);
        });
        load(requireId);
    }

    function load(requireId){
        var curRequireData  = requireMap[requireId],
            moduleUrls      = curRequireData.moduleUrls,
            moduleNames     = curRequireData.moduleNames,
            len             = moduleUrls.length;
            index           = len - 1;

        for(var url, name; name = moduleNames[index], url = moduleUrls[index]; index--){
            append2Frag(name, url, requireId, index);
        }

        setTimeout(function(){
            HEAD.appendChild(SCRIPTFRAG);
            removeScriptInFrag();
        }, 0);
    }

    function append2Frag(moduleName, modulePath, requireId, index){
        var curMod = moduleMap[moduleName];
        curMod.status = MODULES_STATUS_LOADING;
        curMod.requireId = requireId;
        var el = DOC.createElement('script');
        el.type = 'text/javascript';
        el.src = modulePath;
        el.async = true;
        el.setAttribute('module-indentity', moduleName);
        el.onerror = error;
        if (el.readyState) {
            el.onreadystatechange = process;
        }
        else {
            el.onload = process;
        }
        SCRIPTFRAG.appendChild(el);

        function process(e){
            if (typeof el.readyState == 'undefined'
                    || (/loaded|complete/.test(el.readyState))) {
                el.onload = el.onreadystatechange = null;
                if(index == 0){
                    loadComplete(requireId);
                }
            }
        }
        //TODO: IE不支持onerror，加载一个不存在脚本怎么处理
        function error() {
            el.onerror = el.onload = null;
            setTimeout(function (){
                HEAD.removeChild(el);
                el = null; // 处理旧式IE循环引用问题
            });
            throw new Error('加载 ' + moduleName + ' 模块错误，' + moduleName + '的url为：'+ modulePath);
        }
    }

    function loadComplete(requireId){
        var curRequireData      = requireMap[requireId],
            moduleUrls          = curRequireData.moduleUrls,
            moduleNames         = curRequireData.moduleNames,
            analyseModuleList   = curRequireData.analyseModuleList,
            index               = moduleUrls.length - 1,
            isAllLoad           = true;

        for(var name, url; name = moduleNames[index], url = moduleUrls[index]; index--){
            append2Frag(name, url, requireId, index);
        }

        setTimeout(function(){
            HEAD.appendChild(SCRIPTFRAG);
            removeScriptInFrag();
        }, 0);


        if(!moduleNames.length){
            handleAnalyseModule(analyseModuleList);
            var args = [];
            for(var i = 0, item; item = curRequireData.callbackArgs[i]; i++){
                args[args.length++] = moduleMap[item].exports;
            }

            fire(requireMap[requireId], {
                type: 'loadSuccess',
                data: {
                    args: args
                }
            });
        }
    }

    function handleAnalyseModule(analyseModuleList){
        var len = analyseModuleList.length;
        for(var i = len - 1, analyseModule; analyseModule = analyseModuleList[i]; i--){
            var isDepLoad = true;
            var depLen = analyseModule.realDeps.length;
            for(var j = 0, analyseModuleDep; analyseModuleDep = analyseModule.realDeps[j]; j++){
                var tmpName = parseUrl(analyseModuleDep, absolutePath).replace(/\.js$/, '');
                if(moduleMap[tmpName].status != MODULES_STATUS_SUCCESS){
                    isDepLoad = false;
                }
            }
            if(isDepLoad){
                analyseModule.status = MODULES_STATUS_SUCCESS;
                analyseModule.exports = getExports(analyseModule.name);
            }
        }

        // console.log(moduleMap);
    }

    function removeScriptInFrag(moduleIndentity){
        var i = SCRIPTFRAG.childNodes.length - 1, curScriptFrag;
        if(!moduleIndentity){
            // SCRIPTFRAG全部append到head上后清空 SCRIPTFRAG
            for( ; curScriptFrag = SCRIPTFRAG.childNodes[i]; i--) {
                HEAD.removeChild(curScriptFrag);
            }
        }else{
            // 移除指定的那个
            for( ; curScriptFrag = SCRIPTFRAG.childNodes[i]; i--) {
                if(curScriptFrag.getAttribute('module-indentity') == moduleIndentity){
                    SCRIPTFRAG.removeChild(curScriptFrag);
                }
            }
        }
    }

    function delArray(arr, index){
        if(isNaN(index) || index < 0){
            return arr;
        }else{
            return arr.slice(0, index).concat(arr.slice(index + 1, arr.length));
        }
    }

    function each(items, callback, isReverse) {
        if (!items) {
            return;
        }
        if (!isArray(items)) {
            if (isObject(items)) {
                for (var key in items) {
                    if (callback.call(null, items[key], key) === false) {
                        break;
                    }
                }
            }
            else {
                try {
                    items = Array.prototype.slice.call(items);
                }
                catch (e) {
                    throw new Error(e);
                }
            }
        }
        else {
            var i, item;
            if(isReverse){
                var len = items.length;
                for (i = len - 1; item = items[i]; i--) {
                    if (callback.call(null, item, i) === false) {
                        break;
                    }
                }
            }else{
                for (i = 0; item = items[i]; i++) {
                    if (callback.call(null, item, i) === false) {
                        break;
                    }
                }
            }
        }
    }

    function is(type, obj) {
        var cls = Object.prototype.toString.call(obj).slice(8, -1);
        return obj !== undefined && obj !== null && cls === type;
    }

    function isArray(obj) {
        return is('Array', obj);
    }

    function isObject(obj) {
        return is('Object', obj);
    }

    function isString(obj) {
        return is('String', obj);
    }

    function isFunction(obj) {
        return is('Function', obj);
    }

    function deepClone(target, source){
        each(source, function(item, key){
            if(isArray(item)){
                target[key] = [];
                deepClone(target[key], source[key]);
            }else if(isObject(item)){
                target[key] = {};
                deepClone(target[key], source[key]);
            }else{
                target[key] = source[key];
            }
        });
        return target;
    }

    /**
     * 注册自定义事件
     * @param  {Object}   obj      要绑定事件的对象
     * @param  {String}   type     事件类型
     * @param  {Function} callback 回调函数
     * @return {[type]}            [description]
     */
    function register(obj, type, callback) {
        if (obj && isString(type) && isFunction(callback)) {
            var me = {
                callback: callback
            };

            // 当前对象还未绑过自定义事件
            if (!obj[OBJ_EVT_KEY]) {
                obj[OBJ_EVT_KEY] = {};
                obj[OBJ_EVT_KEY][type] = [me];
            }
            // 已经绑定过自定义事件
            else {
                if (!obj[OBJ_EVT_KEY].hasOwnProperty(type)) {
                    obj[OBJ_EVT_KEY][type] = [me];
                } else {
                    obj[OBJ_EVT_KEY][type].push(me);
                }
            }
        }
    }


    /**
     * 触发自定义事件
     * @param  {Obiect}            obj 触发事件对象
     * @param  {string | Object}   params 触发事件的参数，包括类型和数据
     * @return {[type]}      [description]
     */
    function fire(obj, params) {
        var arr, func, evtType, callbackArgs;
        if (isObject(params)) {
            evtType = params.type;
            callbackArgs = params.data;
        } else if (isString(params)) {
            evtType = params;
        }

        if (!obj[OBJ_EVT_KEY] || !obj[OBJ_EVT_KEY].hasOwnProperty(evtType)) {
            throw new Error('对象未绑定 ' + evtType + ' 事件')
        }

        arr = obj[OBJ_EVT_KEY][evtType];
        var i, item;
        for (i = 0; item = arr[i]; i++) {
            func = item.callback;
            if (isFunction(func)) {
                if (!isArray(callbackArgs)) {
                    callbackArgs = [callbackArgs];
                }
                func.apply(null, callbackArgs);
            }
        }
    }

    require.config = {
        baseUrl: './'
    }

    define.amd = {};
    global.define = define;
    global.require = require;

})(window);