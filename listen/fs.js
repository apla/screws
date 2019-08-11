import fs from 'fs';
import path from 'path';

import {EventEmitter} from 'events';

/**
 * @typedef WatchRules
 * @type {Object<RegExp[],Function>}
 */
"";

/**
 * Watch folders and run callbacks for matching files
 * @param {String|String[]} folders folders to watch
 * @param {WatchRules|Function} callbacks which callback to run for matching files
 */
export default function watch (folders, callbacks) {

	folders = [].concat (folders);

	const timeouts = {};
	const files    = {};

	if (typeof callbacks === "function") {
		callbacks = {
			[/.*/]: callbacks
		};
		// timeouts[/.*/] = undefined;
	}

	function debouncedChange (folder, callback) {
		const eventKey = folder + callback;
		const eventFiles = files[eventKey].filter((v, i, a) => a.indexOf(v) === i);
		// console.log (`${callback.name} for '${eventFiles.join ("', '")}' in '${path.relative (process.cwd(), folder)}'`, );
		callback (folder, eventFiles);
		timeouts[eventKey] = undefined;
		files[eventKey] = [];
	}

	// TODO: use per-folder debouncing and files

	folders.forEach (folder => {
		// console.log ('setting watcher for', folder);
		fs.watch (folder, {recursive: true}, function (fsEvent, filename) {

			let callbackRe = Object.keys (callbacks).filter ((re, idx) => {
				const restoredRegex = RegExp.apply(RegExp, re.match(/^\/(.*)\/(.*)$/).slice(1));
				// console.log (re, filename, filename.match (restoredRegex));
				return filename.match (restoredRegex);
			})[0];

			let callback = callbacks[callbackRe];
			const eventKey = folder + callback;

			files[eventKey] = files[eventKey] || [];
			files[eventKey].push (filename);

			// console.log (callback.name, fsEvent, filename, eventKey, timeouts[callback] ? 'debounced' : 'new');

			if (timeouts[eventKey]) {
				clearTimeout (timeouts[eventKey]);
			}

			timeouts[eventKey] = setTimeout (debouncedChange.bind (
				this, folder, callback
			), 300);
		})
	});

	return

}
