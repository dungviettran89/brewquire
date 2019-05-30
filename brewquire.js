window.brewquire = async (url, options = {}) => {
    //phase 1: prepare options
    options.extensions = ['js', 'mjs'];
    options.transform = await loadTransform(options);
    options.packageLock = await loadPackageLock(options);
    //phase 2: download all code
    let codes = await downloadCode(url, options);
};

const loadTransform = async ({transform}) => {
    if (typeof transform === 'function') return transform;
    await fetch('https://unpkg.com/@babel/standalone')
        .then(r => r.text())
        .then(babel => eval(babel));
    return (code) => {
        return Babel.transform(code,
            {presets: ["es2015", ["stage-2", {decoratorsLegacy: true, loose: true}]]}
        );
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
        console.log(baseUrl);
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

const downloadCode = async (url, {packageLock, extensions, transform}, codes = {}) => {
    //resolve url
    let resolvedUrl;
    let urlParts = url.split('/');
    let dependencyName = url.startsWith('@') ? (urlParts[0] + urlParts[1]) : urlParts[0];
    if (packageLock.dependencies.hasOwnProperty(dependencyName)) {
        //resolve using dependency
        let dependency = packageLock.dependencies[dependencyName];
        let {baseUrl, packageJson} = dependency;
        resolvedUrl = `${baseUrl}/index`;
    }


    return codes;
};