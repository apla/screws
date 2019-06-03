import {performance} from 'perf_hooks';

import {rollup} from 'rollup';

function onwarn (warning, warn) {
	// { loc, frame, message } = warning;
	// if (loc) {
	//	console.warn(`${loc.file} (${loc.line}:${loc.column}) ${message}`);
	//    	if (frame) console.warn(frame);

	// skip certain warnings
	// if (warning.code === 'UNUSED_EXTERNAL_IMPORT')
	//	return;

	// throw on others
	// if (warning.code === 'NON_EXISTENT_EXPORT')
	//	throw new Error(warning.message);

	// Use default for everything else
	console.warn (warning.code, warning);
}

const CACHE = {};

export function build (inputOptions, outputOptions) {

	if (!outputOptions)
		outputOptions = inputOptions.output;

	let code;

	const sizePlugin = {
		name: "size",
		generateBundle (options, bundle, isWrite) {
			const bundleFileId = Object.keys (bundle).filter (bundledFile =>
				!bundle[bundledFile].isAsset && bundle[bundledFile].facadeModuleId === inputOptions.input
			)[0];
			code = bundle[bundleFileId].code;
			// console.log(bundle.file, Buffer.byteLength(code));
		}
	};

	// create a bundle
	return rollup (Object.assign ({
		onwarn,
		cache: CACHE[inputOptions.input]
	}, inputOptions, {
		plugins: [...inputOptions.plugins, sizePlugin]
	})).then (bundle => {

		// console.log (Object.keys(bundle));

		// console.log ('IMPORTS', bundle.imports); // an array of external dependencies
		// console.log ('EXPORTS', bundle.exports); // an array of names exported by the entry point
		// console.log ('MODULES', bundle.modules); // an array of module objects

		// generate code and a sourcemap
		// return bundle.generate (outputOptions);

		// use cache for buble plugin https://github.com/rollup/rollup/pull/2382
		// not works: https://github.com/rollup/rollup/pull/2386
		CACHE[inputOptions.input] = bundle;


		// writing bundle to disk using path in outputOptions
		return bundle.write (outputOptions).then (
			() => ({bundle, code})
		);

	});

}

export default class Rollup {

	constructor ({httpRoot, configFiles}) {
		this.httpRoot = httpRoot;
		this.configFiles = configFiles;
		this.configs = [];
	}

	static get prefix () {
		return "rollup";
	}

	buildAll () {
		// console.log (arguments, rollupConfig);
		Promise.all (this.configs.map (config => {
	
			const rollStartTime = performance.now();
			return build (config).then (result => {
	
				const rollEndTime = performance.now();
				// bundle generated
	
				/*
				if (result.bundle.getTimings)
					console.log (result.bundle.getTimings());
				*/
	
				console.log (
					'BUNDLED',
					config.output.file.replace (this.httpRoot, ''),
					'=>',
					Buffer.byteLength(result.code),
					'(' + Math.trunc (rollEndTime - rollStartTime) + 'ms)'
				);
	
			}, err => {
				console.error (
					'BUNDLE ERROR FOR', 
					config.output.file.replace (this.httpRoot, ''),
					'=>',
					err.code
				);
				if (err.loc) {
					console.error (
						err.loc.file.replace (this.httpRoot, '') + ':' + err.loc.line + ':' + err.loc.column,
					);
					if (err.frame) {
						console.error (err.frame);
					}
				} else {
					console.error (Object.assign({}, err), err.stack);
				}
			});
		}));
	}

	configure () {
		Promise.all (this.configFiles.map (configPath => {
			return import (configPath);
		})).then (modules => {
			// console.log (module._cache);
			// console.log (modules);
			// console.log (Object.keys (require.cache));
			// https://github.com/standard-things/esm/issues/287
			this.configs = [].concat.apply([], modules.map (mod => mod.default));
			this.buildAll();
		}).catch (err => {
			console.error (err);
		});
	}
	
}

