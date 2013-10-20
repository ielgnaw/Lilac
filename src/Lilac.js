
var define, require;

(function(global, undefined) {

    var DOC = global.document;
    var HEAD = DOC.getElementsByTagName('head')[0] || DOC.body;
    var OBJ_EVT_KEY = '__objEvtKey__';
    var SCRIPTFRAG = document.createDocumentFragment();

    var MODULES_STATUS_UNDEFINE   = 'undefine'; // 模块初始状态
    var MODULES_STATUS_DEFINED    = 'defined';  // 模块 define 的状态
    var MODULES_STATUS_LOADING    = 'loading';  // 模块正在加载
    var MODULES_STATUS_ANALYSE    = 'analyse';  // 模块解析的状态，解析当前模块的依赖的时候，当前模块的状态值
    var MODULES_STATUS_SUCCESS    = 'success';  // 模块加载并解析完毕并输出exports
    var MODULE_STATUS_FAIL_CIRCLE = 'circle';   // 模块加载失败，存在循环依赖

    var currentlyAddingScript; // @see requirejs

    /**
     * 先要得到相对于 config.baseUrl 的绝对地址，
     * 然后根据这个绝对地址，去得到模块的地址
     * @type {String}
     */
    var baseAbsolutePath = '';
    var idUrlMap = {}; // moduleId moduleUrl 映射
    var moduleMap = {}; // 存储模块信息的共享变量
    var requireMap = {}; // 记录调用require

    /**
     * 具有 localRequireDep 或者 Dep的 module，
     * 要等 localRequireDep 或者 Dep 加载完后再加载 module
     * @type {Object}
     */
    var delayLoadModuleMap = {};
    var ERRORFLAG = false; // 错误的标志位

    var REG = {
        SUFFIX_JS       : /(\.js)$/,                           // js 文件后缀
        PREFIX_1DOT     : /^\.\//,                             // './' 开头的模块前缀
        PREFIX_2DOT     : /^\.\.\//,                           // '../' 开头的模块前缀
        PREFIX_SLASH    : /^\//,                               // '/' 开头的模块前缀
        URI_PROTOCOL    : /^(https:\/\/|http:\/\/|file:\/\/)/, // 包含URL协议
        PREFIX_RELATIVE : /^\.+\/|^\//                         // 相对路径前缀
    };

    /**
     * 等待加载的模块，在define的时候放入到数组中，script load后调用
     * @type {Array}
     */
    var waitLoadModule = [];

    function arrIndexOf(arr, value) {
        if (arr.indexOf) {
            return arr.indexOf(value);
        }

        for (var i = 0, len = arr.length; i < len; i++) {
            if (arr[i] === item) {
                return i;
            }
        }

        return -1;
    }

    /**
     * 从 SCRIPTFRAG 中移除 script 标签
     */
    function removeScriptInFrag(moduleIndentity) {
        var i             = SCRIPTFRAG.childNodes.length - 1;
        var curScriptFrag = null;
        if (!moduleIndentity) {
            // SCRIPTFRAG全部append到head上后清空 SCRIPTFRAG
            for ( ; curScriptFrag = SCRIPTFRAG.childNodes[i]; i--) {
                HEAD.removeChild(curScriptFrag);
            }
        }
        else {
            // 移除指定的那个
            for ( ; curScriptFrag = SCRIPTFRAG.childNodes[i]; i--) {
                if (
                    curScriptFrag.getAttribute('module-indentity')
                    ===
                    moduleIndentity
                ) {
                    SCRIPTFRAG.removeChild(curScriptFrag);
                }
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
        var isHttp   = pageHref.slice(0, 4) === 'http';
        if (/^http:\/\//.test(url)) {
            return url;
        }
        var p1 = pageHref.replace(/^http:\/\/|\?.*$|\/$/g, '').split('/');
        if (p1.length > 1 && /\w+\.\w+$/.test(p1[p1.length - 1])) {
            p1.pop();
        }
        if (url.charAt(0) === '/') {
            return isHttp
                    ?
                    'http://' + p1[0] + url
                    :
                     p1.join('/') + url;
        }
        if (!/^\.\.\//.test(url)) {
            if (/^\.\//.test(url)) {
                return (isHttp ? 'http://' : '')
                        + p1.join('/')
                        + '/'
                        + url.replace(/\.\//g, '');
            }
            return (isHttp ? 'http://' : '')
                    + p1.join('/')
                    + '/'
                    + url;
        }
        var p2 = url.split('/');
        for (var i = 0, len = p2.length; i < len; i++) {
            if (p2[i] === '..' && p1.length > 1) {
                p1.pop();
            }
            else {
                break;
            }
        }
        p2.splice(0, i);
        return (isHttp ? 'http://' : '')
                + p1.join('/')
                + '/'
                + p2.join('/').replace(/\.\.\//g, '');
    }

    /**
     * 根据 moduleId 以及当前环境的 baseId 得到 moduleUrl
     * @param  {string}     id
     * @param  {string}     baseId
     * @return {string}     moduleUrl
     */
    function normalizeModuleId(id, baseId) {
        var dirs  = [];
        var idDir = [];
        var len   = 0;
        var val   = '';
        var tmp   = [];
        var ret   = {};
        var flag  = true;
        var sTmp  = '';

        if (REG.URI_PROTOCOL.test(id) || REG.SUFFIX_JS.test(id)) {
            var url = id.replace(REG.SUFFIX_JS, '');
            for (var key in requireConf.paths) {
                if (requireConf.paths[key] === id){
                    id = key;
                    url = requireConf.paths[key];
                    break;
                }
            }
            ret = {
                id: id,
                url: url
            };
        }
        else {
            if (REG.PREFIX_2DOT.test(id)) {
                // ../ 开头
                dirs  = baseId.replace(/\/$/, '').split('/');
                idDir = id.split('/');
                len   = idDir.length;
                for (var i = 0; i < len; i++) {
                    val = idDir[i];
                    if(val === '..'){
                        dirs.pop();
                    }
                    else {
                        tmp.push(val);
                    }
                }
                sTmp = dirs.join('/') + '/' + tmp.join('/');
                ret = {
                    id: sTmp.replace(REG.PREFIX_RELATIVE,''),
                    url: sTmp
                };
            }
            else if (REG.PREFIX_1DOT.test(id)) {
                // ./ 开头
                dirs  = baseId.replace(/\/$/, '').split('/');
                idDir = id.split('/');
                len   = idDir.length;
                for (var i = 0; i < len; i++) {
                    val = idDir[i];
                    if (val === '.') {
                        dirs.pop();
                    }
                    else {
                        tmp.push(val);
                    }
                }
                sTmp = baseId.replace(/\/$/, '') + '/' + tmp.join('/');
                ret = {
                    id: sTmp.replace(REG.PREFIX_RELATIVE,''),
                    url: sTmp
                };
            }else if(REG.PREFIX_SLASH.test(id)){
                // moduleId以"/"开头，/a/b/c
                // 会避开 baseUrl+paths 规则，
                // 直接将其加载为一个相对于当前HTML文档的脚本
                id    = id.slice(1);
                idDir = id.split('/');
                len   = idDir.length;
                for (var i = 0; i < len; i++) {
                    val = idDir[i];
                    tmp.push(val);
                }
                sTmp = '/' + tmp.join('/');
                ret = {
                    id: sTmp.replace(REG.PREFIX_RELATIVE,''),
                    url: sTmp
                };
            }else{
                // a/b/c，使用 baseUrl+paths 规则
                idDir = id.split('/');
                len   = idDir.length;
                for (var i = 0; i < len; i++) {
                    val = idDir[i];
                    if (i === 0) {
                        if (requireConf.paths.hasOwnProperty(val)) {
                            // 检测paths是否包含URL协议和是否已"/"开头
                            if(
                                REG.URI_PROTOCOL.test(requireConf.paths[val])
                                ||
                                REG.PREFIX_SLASH.test(requireConf.paths[val])
                            ) {
                                flag = false;
                            }
                            tmp.push(requireConf.paths[val]);
                        }
                        else {
                            tmp.push(val);
                        }
                    }
                    else {
                        tmp.push(val);
                    }
                }
                if (flag) {
                    sTmp = baseId.replace(/\/$/, '') + '/' + tmp.join('/');
                    ret = {
                        id: sTmp.replace(REG.PREFIX_RELATIVE,''),
                        url: sTmp
                    };
                }
                else {
                    sTmp = tmp.join('/');
                    if (REG.URI_PROTOCOL.test(sTmp)) {
                        ret = {
                            id: id,
                            url: sTmp
                        };
                    }
                    else {
                        ret = {
                            id: sTmp.replace(REG.PREFIX_RELATIVE,''),
                            url: sTmp
                        };
                    }
                }
            }
        }
        return ret;
    }

    /**
     * 在 moduleMap 中检测模块是否存在
     * 我认为 url 一致的模块，无论名字是否一致，它们都是相同的模块
     * 名字不同可能由于相对路径不同而已
     * @return {[type]}     [description]
     */
    function checkModuleByUrl(url) {
        for (var i in moduleMap) {
            if (moduleMap[i].url === url) {
                return true;
            }
        }
        return false;
    }

    /**
     * 判断 module 是否加载完毕，
     * 如果加载完毕，会返回模块的exports
     * 如果没有加载完毕，返回false
     * @param  {Array} moduleIds 模块 id 集合
     * @return {[type]}           [description]
     */
    function modulesIsSuccess(moduleIds) {
        var normalizeObj = {};
        if (isEmptyObject(moduleMap)) {
            return false;
        }
        else {
            var ret          = [];
            var modNormalize = null;
            var mod          = null;
            for (var i = 0, len = moduleIds.length; i < len; i++) {
                normalizeObj = normalizeModuleId(
                    moduleIds[i], requireConf.baseUrl
                );

                mod = moduleMap[moduleIds[i]];
                modNormalize = moduleMap[normalizeObj.id];
                if (
                    (!mod || mod.status !== MODULES_STATUS_SUCCESS)
                    &&
                    (!modNormalize
                        || modNormalize.status !== MODULES_STATUS_SUCCESS)
                ) {
                    return false;
                }
                else {
                    ret.push(
                        mod ? mod.exports : modNormalize.exports
                    );
                }
            }
            return ret;
        }
    }

    function require() {
        ERRORFLAG = false;
        var tmpWaitLoadModule = [];
        for (var i = 0, len = waitLoadModule.length; i < len; i++) {
            if (waitLoadModule[i].status !== MODULES_STATUS_SUCCESS) {
                tmpWaitLoadModule.push(waitLoadModule[i]);
            }
        }
        waitLoadModule = tmpWaitLoadModule;
        // 得到相对于 config.baseUrl 的绝对地址
        baseAbsolutePath =
            baseAbsolutePath
                ?
                baseAbsolutePath
                :
                parseUrl(requireConf.baseUrl);

        var ids      = null;
        var callback = null;
        var opts     = {};
        var params   = Array.prototype.slice.call(arguments);
        while (params.length) {
            var param = params.shift();
            var cls = Object.prototype.toString.call(param).slice(8, -1);
            switch (cls) {
                case 'String':
                case 'Array':
                    ids = param;
                    break;
                case 'Function':
                    callback = param;
                    break;
                case 'Object':
                    opts = param;
                    break;
                default:
                    break;
            }
        }

        if (!isArray(ids)) {
            ids = [ids];
        }

        var ret = modulesIsSuccess(ids);

        if (ret) {
            if (callback) {
                callback.apply(null, ret);
                return;
            }
            else {
                var localRequireExports = {};
                if (ids.length === 1) {
                    localRequireExports = moduleMap[ids].exports;
                }
                else {
                    for (var j = 0, l = ids.length; j < l; j++) {
                        localRequireExports[ids[j]] = moduleMap[ids[j]];
                    }
                }
                return localRequireExports;
            }
        }

        var requireId    = '';
        var moduleUrl    = '';
        var moduleId     = '';
        var moduleUrls   = [];
        var moduleIds    = [];
        var normalizeObj = {};

        for (var i = 0, len = ids.length; i < len; i++) {
            moduleId     = ids[i];
            normalizeObj = normalizeModuleId(moduleId, requireConf.baseUrl);

            if (
                REG.URI_PROTOCOL.test(moduleId)
                    || REG.SUFFIX_JS.test(moduleId)
            ) {
                for (var key in requireConf.paths) {
                    if (requireConf.paths[key] === moduleId){
                        moduleId = key;
                        break;
                    }
                }
            }
            moduleUrl    = normalizeObj.url + '.js';
            if (!checkModuleByUrl(moduleUrl)) {
                idUrlMap[moduleId]  = parseUrl(moduleUrl);
                moduleMap[moduleId] = {
                    id          : moduleId,
                    normalizeId : normalizeObj.id,
                    url         : moduleUrl,
                    baseUrl     : requireConf.baseUrl,
                    status      : MODULES_STATUS_UNDEFINE
                }
                moduleUrls.push(moduleUrl);
                moduleIds.push(moduleId);

                // 给每个module注册 moduleLoad事件
                register(
                    moduleMap[moduleId],
                    'moduleLoad',
                    moduleLoadListener
                );
            }
        }

        var requireId = ''
            + 'Lilac_'
            + new Date().getTime()
            + Math.floor(Math.random() * 100 + 1)
            + '_'
            + ids.join('_');

        requireMap[requireId] = {
            moduleIds         : moduleIds,
            moduleUrls        : moduleUrls,
            callback          : callback,
            callbackArgs      : deepClone([], moduleIds),
            analyseModuleList : []
        };

        register(requireMap[requireId], 'requireSuccess', function(d){
            // console.log(moduleMap);
            callback && callback.apply(null, d.args);
        });

        load(requireId);
    }

    /**
     * 加载脚本
     */
    function load(requireId) {
        var curRequireData  = requireMap[requireId];
        var moduleUrls      = curRequireData.moduleUrls;
        var moduleIds       = curRequireData.moduleIds;

        while (moduleUrls.length) {
            var url = moduleUrls.pop();
            var id  = moduleIds.pop();
            append2Frag(id, url, requireId);
        }
        HEAD.appendChild(SCRIPTFRAG);
        removeScriptInFrag();
    }

    /**
     * 添加 script 标签到 documentfrag 中
     * @param  {string} moduleId  模块id
     * @param  {string} moduleUrl 模块url
     */
    function append2Frag(moduleId, moduleUrl, requireId, func) {
        var curMod       = moduleMap[moduleId];
        curMod.status    = MODULES_STATUS_LOADING;
        curMod.requireId = requireId;
        var el           = DOC.createElement('script');
        el.type          = 'text/javascript';
        el.src           = moduleUrl;
        el.async         = true;
        el.defer         = false;
        el.onerror       = error;
        el.setAttribute('module-indentity', moduleId);
        if (el.readyState) {
            el.onreadystatechange = process;
        }
        else {
            el.onload = process;
        }

        currentlyAddingScript = el;
        SCRIPTFRAG.appendChild(el);
        currentlyAddingScript = null;

        function process(e) {
            if (typeof el.readyState == 'undefined'
                    || (/loaded|complete/.test(el.readyState))) {
                el.onload = el.onreadystatechange = null;
                el = null;
                handleWaitLoadModule(requireId);
                // func && isFunction(func) && func.call();
            }
        }
        //TODO: IE不支持onerror，加载一个不存在脚本怎么处理
        function error() {
            el.onerror = el.onload = null;
            setTimeout(function (){
                HEAD.removeChild(el);
                el = null; // 处理旧式IE循环引用问题
            });
            ERRORFLAG = true;
            throw new Error(''
                + '加载 ' + moduleId + ' 模块错误，'
                + moduleId + '的url为：'+ moduleUrl
            );
        }
    }

    function handleWaitLoadModule(requireId) {
        var curMod;
        var normalizeObj;
        var moduleUrl;
        for (var i = 0, len = waitLoadModule.length; i < len; i++) {
            // debugger
            curMod = waitLoadModule[i];
            if (curMod.status === MODULES_STATUS_SUCCESS) {
                continue;
            }
            if (moduleMap[curMod.id]) {
                moduleUrl          = moduleMap[curMod.id].url;
                curMod.normalizeId = moduleMap[curMod.id].normalizeId;
                curMod.status      = moduleMap[curMod.id].status;
            }
            else {
                normalizeObj = normalizeModuleId(curMod.id, requireConf.baseUrl);
                moduleUrl    = normalizeObj.url + '.js';
                idUrlMap[curMod.id] = parseUrl(moduleUrl);
                curMod.normalizeId  = normalizeObj.id;
                curMod.status       = MODULES_STATUS_LOADING;
            }
            curMod.requireId    = requireId;
            curMod.url = moduleUrl;
            if (REG.URI_PROTOCOL.test(curMod.url)) {
                curMod.baseUrl = requireConf.baseUrl;
            }
            else {
                curMod.baseUrl =
                    curMod.url.substring(0, curMod.url.lastIndexOf('/'));
            }

            if (isFunction(curMod.factory)) {
                curMod.realDeps = getDependencies(curMod.factory.toString());
            }

            moduleMap[curMod.id] = curMod;
            if (
                !moduleMap[curMod.id][OBJ_EVT_KEY]
                ||
                !moduleMap[curMod.id][OBJ_EVT_KEY]['moduleLoad']
            ) {
                register(
                    moduleMap[curMod.id],
                    'moduleLoad',
                    moduleLoadListener
                );
            }
            // debugger
            if (!curMod.deps || !curMod.deps.length) {
                if (!curMod.realDeps || !curMod.realDeps.length) {
                    curMod.exports = getExports(curMod);
                    fire(curMod, {
                        type: 'moduleLoad',
                        data: {
                            curModule: curMod
                        }
                    });
                }
                else {
                    curMod.exports = getExports(curMod);
                }
            }
            else {
                if (!curMod.realDeps || !curMod.realDeps.length) {
                    curMod.realDeps = curMod.deps;
                }
                else {
                    curMod.realDeps =
                        curMod.realDeps.concat(curMod.deps);
                }
                curMod.exports = getExports(curMod);
            }
        }

        // console.log(moduleMap);
    }

    /**
     * 获取当前运行脚本的文件的名称，用于获取匿名模块的模块名
     * 标准浏览器(IE10、Chrome、Opera、Safari、Firefox)通过强制捕获错误(e.stack)来确定为当前运行的脚本
     *
     * @see http://www.cnblogs.com/rubylouvre/archive/2013/01/23/2872618.html
     */
    function getCurrentScript() {
        if (currentlyAddingScript) {
            return currentlyAddingScript.getAttribute('module-indentity');
        }

        var scripts = HEAD.getElementsByTagName('script');
        for (var i = 0, script; script = scripts[i++];) {
            if (script.readyState === 'interactive') {
                return script.getAttribute('module-indentity');
            }
        }

        // 取得正在解析的script节点
        if (DOC.currentScript) { //firefox 4+
            return DOC.currentScript.getAttribute('module-indentity');
        }

        var stack;
        try {
            Ielgnaw(); //强制报错,以便捕获e.stack
        }
        catch (e) { //safari的错误对象只有line,sourceId,sourceURL
            stack = e.stack;
            if (!stack && global.opera) {
                //opera 9没有e.stack,但有e.Backtrace,但不能直接取得,需要对e对象转字符串进行抽取
                stack = (String(e).match(/of linked script \S+/g) || [])
                            .join(' ');
            }
        }
        if (stack) {
            //取得最后一行,最后一个空格或@之后的部分
            stack = stack.split(/[@ ]/g).pop();
            // 去掉换行符
            stack = stack[0] == '(' ? stack.slice(1, -1) : stack; //.replace(/\s/, '');
            //去掉行号与或许存在的出错字符起始位置
            return stack.replace(/(:\d+)?:\d+$/i, '');
        }
    }

    /**
     * 根据 normalizeId 获取 module
     * @param  {[type]} normalizeId [description]
     */
    function findModuleByNormalizeId(normalizeId){
        for (var key in moduleMap){
            if (moduleMap[key].normalizeId === normalizeId){
                return moduleMap[key];
            }
        }
        return null;
    }

    function define() {
        if (ERRORFLAG) {
            return;
        }
        var id      = '';
        var deps    = null;
        var factory = null;
        var params  = Array.prototype.slice.call(arguments);
        while (params.length) {
            var param = params.shift();
            var cls = Object.prototype.toString.call(param).slice(8, -1);
            switch (cls) {
                case 'String':
                    id = param;
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

        if (!id) {
            var curScript = getCurrentScript();
            for (var key in idUrlMap) {
                if (key === curScript || idUrlMap[key] === curScript) {
                    id = key;
                    break;
                }
            }
        }

        waitLoadModule.push({
            id      : id,
            deps    : deps,
            factory : factory,
            status  : MODULES_STATUS_DEFINED
        });
        return;

        /**
         * define 这一块的逻辑有点混乱，日后改进
         * 处理 combine 会有问题
         * 暂时仅支持 一个文件定义一个模块
         */
        /*var curMod =
            moduleMap[id]
            ?
            moduleMap[id]
            :
            findModuleByNormalizeId(id);

        if (!curMod) {
            // console.log(moduleMap, id, normalizeModuleId(id, requireConf.baseUrl));
            // delete moduleMap[curMod.id];
            ERRORFLAG = true;
            throw new Error('[MODULE_NOTFOUND]: '
                + 'module id '
                + id
                + ' is not found'
            );
        }

        curMod.deps    = deps;
        curMod.factory = factory;
        curMod.status  = MODULES_STATUS_DEFINED;

        if (REG.URI_PROTOCOL.test(curMod.url)) {
            curMod.baseUrl = requireConf.baseUrl;
        }
        else {
            curMod.baseUrl =
                curMod.url.substring(0, curMod.url.lastIndexOf('/'));
        }

        if (isFunction(factory)) {
            curMod.realDeps = getDependencies(factory.toString());
        }

        // console.error(curMod);
        // debugger

        // 现在的处理是，循环依赖会抛出错误，
        // 日后会改善对循环依赖的处理
        if (
            checkCircle(curMod.id, curMod.deps)
            ||
            checkCircle(curMod.id, curMod.realDeps)
        ) {
            delete moduleMap[curMod.id];
            ERRORFLAG = true;
            for (var i = 0; i < curMod.deps.length; i++){
                delete moduleMap[curMod.deps[i]];
            }
            for (var i = 0; i < curMod.realDeps.length; i++){
                delete moduleMap[curMod.realDeps[i]];
            }
            throw new Error('[MODULE_CIRCLE]: '
                + 'The Module '
                + curMod.id
                + ' occur circle dependencies'
            );
        }

        if (!curMod.deps || !curMod.deps.length) {
            if (!curMod.realDeps || !curMod.realDeps.length) {
                curMod.exports = getExports(curMod);
                fire(curMod, {
                    type: 'moduleLoad',
                    data: {
                        curModule: curMod
                    }
                });
            }
            else {
                curMod.exports = getExports(curMod);
            }
        }
        else {
            if (!curMod.realDeps || !curMod.realDeps.length) {
                curMod.realDeps = curMod.deps;
            }
            else {
                curMod.realDeps =
                    curMod.realDeps.concat(curMod.deps);
            }
            curMod.exports = getExports(curMod);
        }*/
    }

    /**
     * 获取模块的 exports
     * @param  {[type]} module  [description]
     */
    function getExports(module) {
        var factory   = module.factory;
        var requireId = module.requireId;
        var realDeps  = module.realDeps;
        if (realDeps && realDeps.length) {
            delayLoadModuleMap[module.id] = module;
            for (var i = 0, len = realDeps.length; i < len; i++){
                (function(index, requireId, curMod){
                    setTimeout(function() {
                        handleRealDeps(
                            realDeps[index],
                            requireId,
                            curMod
                        );
                    }, 0);
                })(i, requireId, module);
            }
        }
        else {
            if (!module.exports) {
                // var args = [require],
                var args = [];
                var deps = module.deps;
                if (deps && deps.length) {
                    var tmpName = '';
                    var dep     = null;
                    for (var i = 0; i < deps.length; i++) {
                        dep = deps[i];
                        if (moduleMap[dep].exports) {
                            args.push(moduleMap[dep].exports);
                        }
                        else {
                            args.push(getExports(dep));
                        }
                    }
                }
                args.push(require); // require 为factory的最后一个参数
                module.exports = isFunction(module.factory)
                                 ?
                                 module.factory.apply(null, args)
                                 :
                                 module.factory;
                module.status  = MODULES_STATUS_SUCCESS;
            }
            return module.exports;
        }
    }

    /**
     * 处理 realDeps
     */
    function handleRealDeps(realDep, requireId, curModule) {
        var realDepUrl   = '';
        var normalizeObj = {};
        if (REG.PREFIX_RELATIVE.test(realDep)) {
            normalizeObj = normalizeModuleId(realDep, curModule.baseUrl);
            realDepUrl = normalizeObj.url + '.js';
        }
        else {
            normalizeObj = normalizeModuleId(realDep, requireConf.baseUrl);
            realDepUrl = normalizeObj.url + '.js';
        }
        if (!checkModuleByUrl(realDepUrl)) {
            idUrlMap[realDep]  = parseUrl(realDepUrl);
            moduleMap[realDep] = {
                id          : realDep,
                normalizeId : normalizeObj.id,
                url         : realDepUrl,
                baseUrl     : requireConf.baseUrl,
                // baseUrl     : curModule.baseUrl,
                status      : MODULES_STATUS_UNDEFINE
            }
            register(
                moduleMap[realDep],
                'moduleLoad',
                moduleLoadListener
            );
            append2Frag(
                realDep,
                realDepUrl,
                requireId,
                checkDelayLoadModule
            );

            HEAD.appendChild(SCRIPTFRAG);
            removeScriptInFrag();
        }
        else {
            checkDelayLoadModule();
        }
    }

    /**
     * 检测具有 realDep 的 module 中的 realDep 是否加载成功
     * 如果加载成功则获取 module 的 exports，并触发 module 的 moduleLoad 事件
     * @return {[type]} [description]
     */
    function checkDelayLoadModule(){
        var normalizeObj = {};
        for (var i in delayLoadModuleMap) {
            var mod                = delayLoadModuleMap[i];
            var localRequireLoaded = true;
            var tmp                = null;
            for (
                var j = 0, len = mod.realDeps.length;
                j < len;
                j++
            ) {
                if (REG.PREFIX_RELATIVE.test(mod.realDeps[j])) {
                    normalizeObj = normalizeModuleId(mod.realDeps[j], mod.baseUrl);
                    tmp = findModuleByNormalizeId(normalizeObj.id);
                    if (!tmp || tmp.status !== MODULES_STATUS_SUCCESS) {
                        localRequireLoaded = false;
                        break;
                    }
                }
                else {
                    if (
                        !moduleMap[mod.realDeps[j]]
                            ||
                            moduleMap[mod.realDeps[j]].status
                                !==
                                MODULES_STATUS_SUCCESS
                    ) {
                        localRequireLoaded = false;
                        break;
                    }
                }
            }
            if (localRequireLoaded) {
                if (!mod.exports) {
                    // var args = [require],
                    var args = [];
                    var deps = mod.deps;
                    if (deps && deps.length) {
                        var tmpName = '';
                        var dep     = null;
                        for (var i = 0; i < deps.length; i++) {
                            dep = deps[i];
                            if (moduleMap[dep].exports) {
                                args.push(moduleMap[dep].exports);
                            }
                            else {
                                args.push(getExports(dep));
                            }
                        }
                    }
                    args.push(require); // require 为factory的最后一个参数
                    mod.exports = isFunction(mod.factory)
                                     ?
                                     mod.factory.apply(null, args)
                                     :
                                     mod.factory;
                    mod.status  = MODULES_STATUS_SUCCESS;
                    fire(mod, {
                        type: 'moduleLoad',
                        data: {
                            curModule: mod
                        }
                    });
                    delete delayLoadModuleMap[mod.id];
                    if (!isEmptyObject(delayLoadModuleMap)) {
                        checkDelayLoadModule();
                    }
                }
            }
        }
    }

    /**
     * moudleLoad 事件监听处理
     */
    function moduleLoadListener(d) {
        // debugger
        var curAnalyseMod     = d.curModule;
        var callback          = d.callback;
        var requireId         = curAnalyseMod.requireId;
        var curRequireData    = requireMap[requireId];
        var moduleUrls        = curRequireData.moduleUrls;
        var moduleIds         = curRequireData.moduleIds;
        var analyseModuleList = curRequireData.analyseModuleList;
        var isAllLoad         = true;

        for (var key in moduleMap) {
            var mod = moduleMap[key];
            if (mod.status != MODULES_STATUS_SUCCESS) {
                isAllLoad = false;
                break;
            }
            else {
                // callback && callback();
            }
        }

        if (isAllLoad) {
            var args = [];
            var item = null;
            var len  = curRequireData.callbackArgs.length;
            for (var i = 0; i < len; i++) {
                item = curRequireData.callbackArgs[i];
                args[args.length++] = moduleMap[item].exports;
            }
            fire(requireMap[requireId], {
                type: 'requireSuccess',
                data: {
                    args: args
                }
            });
        }
        // else {
        //     if (!isEmptyObject(delayLoadModuleMap)) {
        //         checkDelayLoadModule();
        //     }
        // }
    }

    /**
     * 检测是否循环依赖
     * @param  {String} name   模块标识
     * @param  {Array} deps 模块依赖集合
     * @return {[type]}      [description]
     */
    function checkCircle(id, deps) {
        if (deps) {
            var curMod = null;
            var len    = deps.length;
            for (var i = 0; i < len; i++) {
                curMod = moduleMap[deps[i]];
                if (curMod) {
                    if (
                        curMod.id === id
                        ||
                            (curMod.deps && curMod.deps.length)
                            &&
                                checkCircle(id, curMod.deps)
                    ) {
                        return true;
                    }
                }
            }
        }
    }

    function isEmptyObject(obj) {
        for ( var name in obj ) {
            return false;
        }
        return true;
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
        if (isArray(source)) {
            var item = null;
            var len  = source.length;
            for (var i = 0; i < len; i++) {
                item = source[i];
                if (isArray(item)) {
                    target[i] = [];
                    deepClone(target[i], item);
                }
                else if (isObject(item)) {
                    target[i] = {};
                    deepClone(target[i], item);
                }
                else {
                    target[i] = item;
                }
            }
        }else if (isObject(source)) {
            for (var key in source) {
                if (isArray(source[key])) {
                    target[key] = [];
                    deepClone(target[key], source[key]);
                }
                else if (isObject(source[key])) {
                    target[key] = {};
                    deepClone(target[key], source[key]);
                }
                else {
                    target[key] = source[key];
                }
            }
        }
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

            if (!obj[OBJ_EVT_KEY]) { // 当前对象还未绑过自定义事件
                obj[OBJ_EVT_KEY] = {};
                obj[OBJ_EVT_KEY][type] = [me];
            }
            else { // 已经绑定过自定义事件
                if (!obj[OBJ_EVT_KEY].hasOwnProperty(type)) {
                    obj[OBJ_EVT_KEY][type] = [me];
                }
                else {
                    obj[OBJ_EVT_KEY][type].push(me);
                }
            }
        }
    }

    /**
     * 触发自定义事件
     * @param  {Obiect} obj 触发事件对象
     * @param  {string | Object} params 触发事件的参数，包括类型和数据
     * @return {[type]} [description]
     */
    function fire(obj, params) {
        var arr          = null;
        var func         = null;
        var evtType      = null;
        var callbackArgs = null;
        if (isObject(params)) {
            evtType = params.type;
            callbackArgs = params.data;
        }
        else if (isString(params)) {
            evtType = params;
        }

        if (!obj[OBJ_EVT_KEY] || !obj[OBJ_EVT_KEY].hasOwnProperty(evtType)) {
            ERRORFLAG = true;
            throw new Error('对象未绑定 ' + evtType + ' 事件')
        }

        arr = obj[OBJ_EVT_KEY][evtType];
        var i;
        var item;
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

    /**
     * 分析factory中的require
     * @param  {string} s factory.toString()
     * @return {[type]}   [description]
     */
    function getDependencies(factoryStr) {

        /**
         * 获取下一个字符
         */
        function getNextChar() {
            peek = factoryStr.charAt(index++);
        }

        /**
         * 是否是空格
         */
        function isBlank() {
            return /\s/.test(peek);
        }

        /**
         * 是否是引号
         */
        function isQuote() {
            return peek === '"' || peek === "'";
        }

        /**
         * 是否是字母
         */
        function isWord() {
            return /[\w$.]/.test(peek);
        }

        /**
         * 处理引号的情况
         */
        function dealQuote() {
            var start = index;
            var c     = peek;
            var end   = factoryStr.indexOf(c, start);

            if (!inBracket) {
                if (factoryStr.charAt(end - 1) !== '\\') {
                    index = end + 1;
                }
                else {
                    while (index < length) {
                        getNextChar();
                        if (peek == '\\') {
                            index++;
                        } else if (peek === c) {
                            break;
                        }
                    }
                }
                if (modName) {
                    /*var tmpName = factoryStr.slice(start, index - 1);
                    if (
                        REG.URI_PROTOCOL.test(tmpName)
                        ||
                        REG.SUFFIX_JS.test(tmpName)
                    ) {
                        tmpName = tmpName.replace(REG.SUFFIX_JS, '');
                        for (var key in requireConf.paths) {
                            if (
                                tmpName === key
                                ||
                                requireConf.paths[key] === tmpName
                            ) {
                                tmpName = key;
                                break;
                            }
                        }
                    }
                    res.push(tmpName);*/
                    res.push(factoryStr.slice(start, index - 1));
                    modName = false;
                }
            }
            else {
                modName = true;
                if (factoryStr.charAt(end - 1) != '\\') {
                    index = end + 1;
                }
                else {
                    while (index < length) {
                        getNextChar();
                        if (peek == '\\') {
                            index++;
                        }
                        else if (peek == c) {
                            break;
                        }
                    }
                }
                if (modName) {
                    /*var tmpName = factoryStr.slice(start, index - 1);
                    if (
                        REG.URI_PROTOCOL.test(tmpName)
                        ||
                        REG.SUFFIX_JS.test(tmpName)
                    ) {
                        tmpName = tmpName.replace(REG.SUFFIX_JS, '');
                        for (var key in requireConf.paths) {
                            if (
                                tmpName === key
                                ||
                                requireConf.paths[key] === tmpName
                            ) {
                                tmpName = key;
                                break;
                            }
                        }
                    }
                    res.push(tmpName);*/
                    res.push(factoryStr.slice(start, index - 1));
                    modName = false;
                }
            }
        }

        /**
         * 处理字母
         */
        function dealWord() {
            if (/[\w$.]/.test(factoryStr.charAt(index))) {
                var r   = /^[\w$.]+/.exec(factoryStr.slice(index - 1))[0];
                modName = (/^require(\s*\.\s*async)?$/.test(r));
                index   += r.length - 1;
                parentheseState = arrIndexOf(['if', 'for', 'while'], r) !== -1;
                isReg = arrIndexOf(
                    [
                        'else',
                        'in',
                        'return',
                        'typeof',
                        'delete'
                    ],
                    r
                ) !== -1;
            }
            else {
                modName = false;
                isReg = false;
            }
        }

        /**
         * 处理正则
         */
        function dealReg() {
            index--;
            while (index < length) {
                getNextChar();
                if (peek === '\\') {
                    index++;
                }
                else if (peek === '/') {
                    break;
                }
                else if (peek === '[') {
                    while (index < length) {
                        getNextChar();
                        if (peek === '\\') {
                            index++;
                        }
                        else if (peek === ']') {
                            break;
                        }
                    }
                }
            }
        }

        var startIndex = factoryStr.indexOf('{');
        if (factoryStr.indexOf('require', startIndex) == -1) {
            return [];
        }
        var index           = startIndex;
        var peek            = null;
        var length          = factoryStr.length;
        var isReg           = true;
        var modName         = false;
        var parentheseState = false;
        var parentheseStack = [];
        var inBracket       = false;
        var res             = [];
        while (index < length) {
            getNextChar();
            // debugger
            if (!isBlank()){
                if (isQuote()) {
                    dealQuote();
                    isReg = true;
                }
                else if (peek === '/') {
                    getNextChar();
                    if (peek === '/') {
                        index = factoryStr.indexOf('\n', index);
                        if (index === -1) {
                            index = factoryStr.length;
                        }
                        isReg = true;
                    }
                    else if (peek === '*') {
                        index = factoryStr.indexOf('*/', index) + 2;
                        isReg = true;
                    }
                    else if (isReg) {
                        dealReg();
                        isReg = false;
                    }
                    else {
                        index--;
                        isReg = true;
                    }
                }
                else if (isWord()) {
                    dealWord();
                }
                else if (peek === '(') {
                    parentheseStack.push(parentheseState);
                    isReg = true;
                }
                else if (peek === ')') {
                    isReg = parentheseStack.pop();
                }
                else if (peek === '[') {
                    parentheseStack.push(parentheseState);
                    isReg = true;
                    if (modName) {
                        inBracket = true;
                    }
                }
                else if (peek === ',') {
                    if(inBracket){
                        parentheseStack.push(parentheseState);
                        isReg = true;
                    }
                }
                else if (peek === ']') {
                    isReg = parentheseStack.pop();
                    // if (modName) {
                        inBracket = false;
                    // }
                }
                else {
                    isReg = peek !== ']';
                    modName = false;
                }
            }
        }

        return res;
    }

    var requireConf = {
        baseUrl: './',
        paths: {}
    };

    require.config = function(opts){
        for(var key in requireConf){
            if(opts.hasOwnProperty(key)){
                requireConf[key] = opts[key];
            }
        }
    };

    define.amd = {
        jQuery: true
    };
    global.define = define;
    global.require = require;

})(window);

/**
 * 2013-10-20
 * 1. 修复waitLoadModule的一个bug
 *
 * 2013-10-09
 * 1. 改变分析模块的顺序，由原先的在define处分析改为在script load后分析
 * 2. 支持combine
 * 3. 去掉重写的 Array.prototype.indexOf
 *
 * 2013-09-25
 * 修复
 * 1. 获取factory内部require时，分析中括号的时候应该加上modName的判断，
 * 否则会把所有的中括号都当作require的模块来处理
 *
 * 2013-09-24
 * 1. 修复一个笔误～～～
 * 2. 去掉单 var，规范代码
 *
 * 个人认为，技术上造轮子其实是一件很有意义的事情。很多东西，看似简单，
 * 原理貌似也的确简单，但如果你不亲自动手去实现，那么你不可能知道实现
 * 起来里面到底有多少坑，经历的坑越多，你得到的成长就越大。真正的动手
 * 去实现，真正的站在开发者的角度来考虑，这样，你的技艺才能不断的提高！
 */

/********************************************************************************************
 *
 *
 *
 *                                          111111110000001111111
 *                                   1111100000000000000000000000001111
 *                                11100000000000000000000000000000000001111
 *                             1110000000011111             11111000000000011
 *                           11100000111                           1110000000111
 *                         110000011                                   11000000011
 *                        10000011                                        110000001
 *                      11000011                                             10000011
 *                     11000011                                               11000011
 *                    1100011                                                   1000011
 *                    100001                                                     100001
 *                  1100001                                                       100001
 *                  100011                                                         100011
 *                 100001                                                           10001
 *                 100011                                                           110011
 *                110001                                                             10001
 *                110001                                                             100011
 *                110011           11111                                             100011
 *                110011           10011                                             110011
 *                110011           10011                                              10011
 *                110011           10011                                              10011
 *                 10001           10111                                          11 110001
 *                 100011          10111                                     1111111 110001
 *                  00011          10111                                  1111111111  10011
 *                  10001          10111                                11111111      10011
 *                  110001         10111                               1110111       100011
 *                   100011        10111                               1111          100011
 *                    100001       10111                              1111          1100011
 *                     100001     110111             11101111111111   1111          110011
 *                      1000011   11011              11100000000111    111          110011
 *                       1100001 111011                       1        1111         110011
 *                         100001111011                                1111         10001
 *                           1111111011                                1111         10001
 *                               11101                                 11111       110001
 *                               11101                                 11111       100001
 *                               11101                                  1111       100011
 *                               11101                                  1111       100011
 *                               11101                                  11111     1100111
 *                               10111                           1    1111111     110011
 *                               10111                       111111111111111      11001
 *                               10011                        11111111111        110001
 *                               10111                                           100011
 *                               1111                                           110001
 *                                                                              110011
 *                                                                             110001
 *                                    11111                                    100001
 *                                   1100000111                               110001
 *                                   1100000001111                           1100011
 *                                       1100000011                         110001
 *                                          110000011                      1100011
 *                                            110000011                   100001
 *                                               100000111              1100001
 *                                                 100000011          11000001
 *                                                   10000000111111110000001
 *                                                    111000000000000000011
 *                                                       1110000000000011
 *                                                           111111111
 *
 *
 *
 *******************************************************************************************/
