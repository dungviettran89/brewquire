let resolved = {};
let downloaded = {};
let packages = undefined;
const packagesLockdotJson = async (options) => {
    if (packages) return packages;
    let path = options.path || ".";
    let response = await fetch(`${path}/package-lock.json`);
    let packagesLock = response.ok ? await response.json() : {dependencies: {}};
    for (let name in packagesLock.dependencies) {
        const dependency = packagesLock.dependencies[name];
        let packageUrl = `${path}/node_modules/${name}`;
        if (options.cdn === true) {
            packageUrl = `https://unpkg.com/${name}@${dependency.version}/`;
        }
        dependency.packageUrl = packageUrl;
        dependency.promise = fetch(`${packageUrl}/package.json`).then(r => r.ok ? r.json() : {});
    }
    for (let name in packagesLock.dependencies) {
        const dependency = packagesLock.dependencies[name];
        let dependencyJson = await dependency.promise;
        dependency.json = dependencyJson;
        dependency.main = await tryFetch(`${dependency.packageUrl}/${dependencyJson.main}`) ||
            await tryFetch(`${dependency.packageUrl}/index.js`) ||
            await tryFetch(`${name.split("/").pop()}.js`);
    }
    return (packages = packagesLock);
};
const tryFetch = async (url) => {
    return fetch(url).then(r => r.status === 200 ? url : undefined);
};
const brewquire = async (url, referer, options = {resolved: []}) => {
    let packagesLock = await packagesLockdotJson(options);
    const depParts = url.split("/");
    let dep = depParts[0].startsWith("@") ? `${depParts[0]}/${depParts[1]}` : depParts[0];
    if (packagesLock.dependencies[dep]) {
        return await brewquire(packagesLock.dependencies[dep].main, null, options);
    }
    let resolvedUrl = url.endsWith(".js") ? url : `${url}.js`;
    resolvedUrl = referer ? `${referer}/../${resolvedUrl}` : resolvedUrl;
    let href = location.href.split('#')[0];
    resolvedUrl = resolvedUrl.startsWith("http") ? resolvedUrl : `${href}/../${resolvedUrl}`;
    resolvedUrl = new URL(resolvedUrl).href;
    if (resolved.hasOwnProperty(resolvedUrl)) {
        return resolved[resolvedUrl];
    }
    let codeResponse = await fetch(resolvedUrl);
    if (!codeResponse.ok) {
        throw `Can not load ${resolvedUrl}`;
    }
    let code = await codeResponse.text();
    if (options.transform) code = options.transform(code).code;
    return await (async () => {
        let exports = {};
        let require = async (u) => brewquire(u, resolvedUrl, options);
        try {
            code = code.replace(/require\(/g, "await require(");
            await new Promise((resolve, reject) => {
                eval(`(async ()=>{try{${code};resolve();}catch(e){reject(e)}})()`);
            });
        } catch (e) {
            console.log(`Error parsing ${resolvedUrl}`, e, code);
        }
        resolved[resolvedUrl] = exports;
        return exports;
    })();
};

window.brewquire = brewquire;
