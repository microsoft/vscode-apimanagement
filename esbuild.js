/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

"use strict";

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const distDir = path.join(__dirname, 'dist');

// Modules that must NOT be bundled into extension.bundle.js:
// - vscode: provided by the extension host at runtime.
// - bufferutil / utf-8-validate: optional native addons for `ws`; left external so `ws` uses its JS
//   fallback when they are not present (they are excluded from the VSIX via .vscodeignore).
// - open: ESM-only and locates its platform helper scripts relative to its own files, so bundling it
//   would break browser-launch on Linux. It is kept external and copied into dist/node_modules together
//   with its dependency closure, matching the previous webpack build.
const external = ['vscode', 'bufferutil', 'utf-8-validate', 'open'];

// Copies `open` and its transitive dependency closure into dist/node_modules so that the external
// `require('open')` in the bundle resolves at runtime. Nested (non-hoisted) dependencies travel with
// their parent package because each package directory is copied whole.
function copyExternalRuntimeModules() {
    const srcRoot = path.join(__dirname, 'node_modules');
    const destRoot = path.join(distDir, 'node_modules');
    const copied = new Set();
    const stack = ['open'];

    while (stack.length > 0) {
        const name = stack.pop();
        if (copied.has(name)) {
            continue;
        }
        const srcDir = path.join(srcRoot, name);
        if (!fs.existsSync(srcDir)) {
            continue; // hoisted under a parent package; already copied with that package
        }
        copied.add(name);

        const destDir = path.join(destRoot, name);
        fs.rmSync(destDir, { recursive: true, force: true });
        fs.mkdirSync(path.dirname(destDir), { recursive: true });
        fs.cpSync(srcDir, destDir, { recursive: true });

        const pkg = JSON.parse(fs.readFileSync(path.join(srcDir, 'package.json'), 'utf8'));
        for (const dep of Object.keys(pkg.dependencies || {})) {
            stack.push(dep);
        }
    }

    console.log(`[esbuild] copied ${copied.size} external runtime module(s) into dist/node_modules`);
}

/** @type {import('esbuild').Plugin} */
const buildReporterPlugin = {
    name: 'build-reporter',
    setup(build) {
        build.onEnd((result) => {
            for (const err of result.errors) {
                console.error(`✘ [ERROR] ${err.text}${err.location ? ` (${err.location.file}:${err.location.line})` : ''}`);
            }
            console.log(`[esbuild] build finished: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`);
        });
    },
};

// `tas-client` (pulled in transitively by @microsoft/vscode-azext-utils for the experimentation
// service) is published as `"type": "module"` but ships a single UMD file, dist/tas-client.min.js.
// Because the package is flagged as ESM, esbuild wraps that file in an `__esm` initializer, which shares
// the bundle's top-level scope. The UMD body then runs `module.exports = factory()`, writing to the
// bundle's REAL top-level `module.exports` and clobbering the extension's own exports — leaving only
// `ExperimentationService`, which makes `require('./dist/extension.bundle').activateInternal` undefined
// and breaks activation.
//
// Loading the file through a custom namespace bypasses the package.json `type: module` classification, so
// esbuild treats it as CommonJS and gives it its own local `module`/`exports`. This matches how the
// previous webpack build wrapped every module and keeps the UMD's writes local to its own module.
function resolveTasClientEntry() {
    try {
        return require.resolve('tas-client');
    } catch {
        const fallback = path.join(__dirname, 'node_modules', 'tas-client', 'dist', 'tas-client.min.js');
        if (fs.existsSync(fallback)) {
            return fallback;
        }
        throw new Error('Unable to locate the tas-client package entry for the CommonJS shim.');
    }
}

/** @type {import('esbuild').Plugin} */
const tasClientCommonJsPlugin = {
    name: 'tas-client-umd-as-cjs',
    setup(build) {
        const tasClientNamespace = 'tas-client-cjs';
        const tasEntry = resolveTasClientEntry();

        build.onResolve({ filter: /^tas-client(\/bundle)?$/ }, () => ({
            path: tasEntry,
            namespace: tasClientNamespace,
        }));

        build.onLoad({ filter: /.*/, namespace: tasClientNamespace }, () => ({
            contents: fs.readFileSync(tasEntry),
            loader: 'js',
            resolveDir: path.dirname(tasEntry),
        }));
    },
};

async function main() {
    fs.rmSync(distDir, { recursive: true, force: true });

    const ctx = await esbuild.context({
        entryPoints: ['extension.bundle.ts'],
        outfile: 'dist/extension.bundle.js',
        bundle: true,
        format: 'cjs',
        platform: 'node',
        target: 'node20',
        external,
        sourcemap: !production,
        sourcesContent: false,
        minify: production,
        keepNames: true,
        logLevel: 'warning',
        plugins: [tasClientCommonJsPlugin, buildReporterPlugin],
    });

    await ctx.rebuild();
    copyExternalRuntimeModules();

    if (watch) {
        await ctx.watch();
    } else {
        await ctx.dispose();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
