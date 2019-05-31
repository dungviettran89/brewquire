window.brewquire = async (url, options = {}) => {
    //phase 1: prepare options
    options.transform = await loadTransform(options);
    options.packageLock = await loadPackageLock(options);
    //phase 2: download all code
    let currentHtml = location.href.replace(location.hash, "");
    let context = await downloadCode(url, currentHtml, options);
    //phase 3: run eval
    let resolved = {};
    let evalRequire = (url, referrer, context) => {
        let actualUrl = context.requires[`${referrer}->${url}`];
        if (resolved.hasOwnProperty(actualUrl)) return resolved[actualUrl];
        let require = (r) => evalRequire(r, actualUrl, context);
        let code = context.codes[actualUrl];
        try {
            let exports = {};
            let module = {};
            eval(code);
            resolved[actualUrl] = module.exports || exports;
            // console.log(`Processed ${actualUrl}`, resolved[actualUrl]);
            return resolved[actualUrl];
        } catch (e) {
            console.log(`Can not handle ${url} from ${referrer}`, resolved, context, code);
            throw e;
        }
    };

    return evalRequire(url, currentHtml, context);
};

const loadTransform = async ({transform}) => {
    if (typeof transform === 'function') return transform;
    await fetch('https://unpkg.com/@babel/standalone')
        .then(r => r.text())
        .then(babel => eval(babel));
    return (code) => {
        return Babel.transform(code,
            {presets: ["es2015", ["stage-2", {decoratorsLegacy: true, loose: true}]]}
        ).code;
    }
};

const loadPackageLock = async ({packageLock, cdn}) => {
    //download lock file
    packageLock = packageLock || "./package-lock.json";
    let packageLockUrl = packageLock;
    packageLock = await fetch(packageLock).then(r => r.status === 200 ? r.json() : {});
    if (!packageLock.dependencies) return packageLock;
    //resolve all dependencies
    let {dependencies} = packageLock;
    //load package.json in parallel
    for (let name in dependencies) {
        if (!dependencies.hasOwnProperty(name)) continue;
        let dependency = dependencies[name];
        let {version} = dependency;
        let baseUrl = resolveUrl(packageLockUrl, '..', '..', 'node_modules', name);
        if (cdn) baseUrl = `${cdn}/${name}@${version}`;
        dependency.baseUrl = baseUrl;
        dependency.packageJson = fetch(`${baseUrl}/package.json`)
            .then(r => r.status === 200 ? r.json() : {});
    }
    for (let name in dependencies) {
        if (!dependencies.hasOwnProperty(name)) continue;
        let dependency = dependencies[name];
        dependency.packageJson = await dependency.packageJson;
    }
    return packageLock;
};

const resolveUrl = (...args) => {
    if (!args[0].startsWith('http')) args = [location.href.replace(location.hash, "")].concat(args);
    return new URL(args.join('/')).href;
};

const downloadCode = async (url, referrer, {packageLock, extensions, transform}, context = {
    codes: {},
    requires: {}
}) => {
    //resolve url
    let resolvedUrl;
    let urlParts = url.split('/');
    let scoped = url.startsWith('@');
    let dependencyName = scoped ? (urlParts[0] + urlParts[1]) : urlParts[0];
    if (packageLock.dependencies.hasOwnProperty(dependencyName)) {
        //resolve using dependency
        let dependency = packageLock.dependencies[dependencyName];
        let {baseUrl, packageJson} = dependency;
        let subPaths = scoped ? urlParts.splice(2) : urlParts.splice(1);
        if (subPaths.length > 0) {
            resolvedUrl = resolveUrl(baseUrl, ...subPaths);
            if (!resolvedUrl.endsWith('.js')) resolvedUrl += '.js';
        } else if (packageJson.main) {
            resolvedUrl = `${baseUrl}/${packageJson.main}`;
        } else {
            let candidates = [
                `${baseUrl}/index.js`,
                `${baseUrl}/index.mjs`,
                `${baseUrl}/${dependencyName.split('/').pop()}.js`,
                `${baseUrl}/${dependencyName.split('/').pop()}.mjs`
            ];
            for (let i = 0; i < candidates.length; i++) {
                resolvedUrl = await fetch(candidates[i]).then(r => r.status === 200 ? candidates[i] : undefined);
                if (resolvedUrl) break;
            }
        }
    } else {
        resolvedUrl = resolveUrl(referrer, '..', ...urlParts);
        if (!resolvedUrl.endsWith('.js')) resolvedUrl += '.js';
    }
    context.requires[`${referrer}->${url}`] = resolvedUrl;
    if (context.codes.hasOwnProperty(resolvedUrl)) return context;
    let codeResponse = await fetch(resolvedUrl);
    if (codeResponse.status !== 200) throw `Cannot load from ${resolvedUrl}`;
    let code = transform(await codeResponse.text());
    context.codes[resolvedUrl] = code;
    let regex = /require\(["'](.*?)["']\)/g, promises = [], match;
    while (match = regex.exec(code)) {
        promises.push(downloadCode(match[1], resolvedUrl, {packageLock, extensions, transform}, context));
    }
    for (let i = 0; i < promises.length; i++) {
        await promises[i];
    }
    return context;
};