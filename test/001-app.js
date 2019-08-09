import fs from 'fs';

import assert from 'assert';

import { EventEmitter } from 'events';

import App from '../app.js';

import fsWatch from '../fs-watch.js';

class EvtHandler extends EventEmitter {
	static get prefix () {return "test"}

	constructor () {
		super ();
		this.data = [];
	}

	pass () {
		this.emit ('done', this.data);
	}

	postpone () {
		this.data.push ('-');
		return new Promise ((resolve) => {
			setImmediate (() => {
				this.data.push ('+');
				resolve ();
			})
		})
	}

	nothing () {
	}

	fail () {
		throw new Error ("Test error");
	}
}

function immediate (handler) {
	setImmediate (() => handler ());
}

describe ("app interface", () => {

	it ("should import and call immediate event", (done) => {

		const app = new App ();

		const test = new EvtHandler ();

		app.connect (test);

		immediate (app.events (test.pass));

		test.on ('done', done);
	});

	it ("should import and call immediate event try 2", (done) => {

		const app = new App ();

		const evtHandler = new EvtHandler ();

		const test = app.connect (evtHandler);

		immediate (app.events (test.pass));

		test.on ('done', done);
	});


	it ("should import and call watcher event", (done) => {

		const app = new App ();

		const evtHandler = new EvtHandler ();

		const test = app.connect (evtHandler);

		fsWatch ('test', {
			[/.*/]: app.events (test.pass)
		});

		var now = new Date();
		fs.utimesSync('test/.jasmine.json', now, now);

		test.on ('done', done);
	});

	it ("should import and call watcher events in parallel", (done) => {

		const app = new App ();

		const test = new EvtHandler ();

		app.connect (test);

		immediate (app.events (test.nothing, test.postpone, test.postpone, test.pass));

		test.on ('done', (data) => {
			// nothing => , postpone#1 => '-', postpone#2 => '-', pass
			assert.equal (data.join (''), '--');
			done ();
		});

	});

	it ("should import and call immediate events in sequence", (done) => {

		const app = new App ();

		const test = new EvtHandler ();

		app.connect (test);

		immediate (app.eventQueue (test.nothing, test.postpone, test.postpone, test.pass));

		test.on ('done', (data) => {
			// nothing => ,
			// postpone#1 => '-', postpone#1 setImmediate => '+'
			// postpone#2 => '-', postpone#2 setImmediate => '+'
			// pass
			assert.equal (data.join (''), '-+-+')
			done ();
		});
	});


});