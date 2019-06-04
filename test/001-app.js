import fs from 'fs';

import App from '../app.js';

import fsWatch from '../fs-watch.js';

describe ("app interface", () => {

	it ("should import watcher events", (done) => {

		class EvtHandler {
			static get prefix () {return "test"}

			pass () {
				done ();
			}

			fail () {
				throw new Error ("Test error");
			}
		}

		const app = new App ();

		const test = app.register (EvtHandler);

		fsWatch ('test', {
			[/.*/]: app.wrap (test.pass)
		});

		var now = new Date();
		fs.utimesSync('test/.jasmine.json', now, now);

	});

});