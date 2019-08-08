import fs from 'fs';

import App from '../app.js';

import fsWatch from '../fs-watch.js';

function getEvtHandlerClass (done) {
	return class EvtHandler {
		static get prefix () {return "test"}

		pass () {
			done ();
		}

		fail () {
			throw new Error ("Test error");
		}
	}
}

describe ("app interface", () => {

	it ("should import and call watcher events", (done) => {

		const app = new App ();

		const test = app.connect (getEvtHandlerClass (done));

		fsWatch ('test', {
			[/.*/]: app.events (test.pass)
		});

		var now = new Date();
		fs.utimesSync('test/.jasmine.json', now, now);
	});

	it ("should import and call watcher eventQueue", (done) => {

		const app = new App ();

		const test = app.connect (getEvtHandlerClass (done));

		fsWatch ('test', {
			[/.*/]: app.events (test.pass)
		});

		var now = new Date();
		fs.utimesSync('test/.jasmine.json', now, now);
	});


});