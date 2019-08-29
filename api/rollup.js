import {performance} from 'perf_hooks';

import {rollup} from 'rollup';

// TODO: use warning callback from class to configure skipping warnings
// per object
let _showDeprecated;

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

	if (!_showDeprecated && warning.code === 'DEPRECATED_FEATURE') {
		return;
	}

	console.warn (warning.code, warning);
}

const CACHE = {};

export function building (inputOptions, outputOptions) {

	if (!outputOptions)
		outputOptions = inputOptions.output;

	let code;

	const sizePlugin = {
		name: "size",
		generateBundle (options, bundle, isWrite) {
			const bundleFileId = Object.keys (bundle).filter (bundledFile => (
				!bundle[bundledFile].isAsset && bundle[bundledFile].facadeModuleId === inputOptions.input // new rollup
				|| bundle[bundledFile].isEntry && options.file === outputOptions.file // old rollup
			))[0];
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

/**
 * @typedef RollupAPIOptions
 * @property {string} httpRoot http server root folder
 * @property {Object} configFiles configuration files to import
 * @property {boolean=} showDeprecated show deprecated warnings (global as of now)
 */
"";

export default class Rollup {

	/**
	 * 
	 * @param {RollupAPIOptions} options rollup API options
	 */
	constructor ({httpRoot, configFiles, showDeprecated}) {
		this.httpRoot = httpRoot;
		this.configFiles = configFiles;
		this.configs = [];
		_showDeprecated = showDeprecated;
	}

	static get prefix () {
		return "rollup";
	}

	buildingAll () {
		// console.log (arguments, rollupConfig);
		return Promise.all (this.configs.map (config => {
	
			const rollStartTime = performance.now();
			return building (config).then (result => {
	
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
					err.code === 'PLUGIN_ERROR'
						? `PLUGIN ${err.plugin} HOOK ${err.hook} MESSAGE`
						: err.code,
					err.message
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

	configuring () {
		return Promise.all (this.configFiles.map (configPath => {
			return import (configPath);
		})).then (modules => {
			// console.log (module._cache);
			// console.log (modules);
			// console.log (Object.keys (require.cache));
			// https://github.com/standard-things/esm/issues/287
			this.configs = [].concat.apply([], modules.map (mod => mod.default));
			return this.buildingAll();
		}).catch (err => {
			console.error (err);
		});
	}

	starting () {
		return this.configuring ();
	}
	
}

