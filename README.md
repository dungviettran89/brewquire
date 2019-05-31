Browser require, bringing the power of npm into your browser.

[Demo](https://dungviettran89.github.io/brewquire/demo/index.html)
## Getting started
Prepare package.json and package-lock.json like normal.
By default, brewquire will looks for package-lock.json in the current path and resolve all dependencies from there.
```html
<script src="https://dungviettran89.github.io/brewquire/brewquire.js"></script>
<script>brewquire("./index")</script>
```

You can also, points to a remote package-lock.json. Brewquire will resolve from node_modules folder on the same path 
as package-lock.json
```html
<script src="https://dungviettran89.github.io/brewquire/brewquire.js"></script>
<script>brewquire("./index", {packageLock: "vue-demo/package-lock.json"})</script>
```

You can also use cdn to load all dependencies. (See [Demo](https://dungviettran89.github.io/brewquire/demo/index.html) 
source for a complete example)
```html
<script src="https://dungviettran89.github.io/brewquire/brewquire.js"></script>
<script>brewquire("./index", {cdn: "https://unpkg.com"})</script>
```

If you need to configure babel, please provide a transform method
```html
<script src="https://dungviettran89.github.io/brewquire/brewquire.js"></script>
<script src="https://unpkg.com/@babel/standalone"></script>
<script>
    let transform = (code) => {
        return Babel.transform(code,
            {presets: ["es2015", ["stage-2", {decoratorsLegacy: true, loose: true}]]}
        ).code;
    };
    brewquire("./index", {transform})
</script>
```

