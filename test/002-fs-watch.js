import fs from 'fs';
import assert from 'assert';
import path from 'path';

import fsWatch from '../listen/fs.js';

describe ("fs watcher", () => {

	it ("single folder, any match", (done) => {

		const watchFolder = 'test';
		const touchFile = '.jasmine.json';

		fsWatch (watchFolder, ({folder, files}) => {
			assert.equal (folder, watchFolder);
			assert.equal (files[0], touchFile);
			done ();
		});

		var now = new Date();
		fs.utimesSync(path.join (watchFolder, touchFile), now, now);

	});

	it ("multiple folders, any match", (done) => {

		const watchFolders = ['test', 'node_modules'];
		const touchFile = '.jasmine.json';

		fsWatch (watchFolders, ({folder, files}) => {
			assert.equal (folder, watchFolders[0]);
			assert.equal (files[0], touchFile);
			done ();
		});

		var now = new Date();
		fs.utimesSync(path.join (watchFolders[0], touchFile), now, now);

	});

	it ("single folder, exact match, order check", (done) => {

		const watchFolder = 'test';
		const touchFile = '.jasmine.json';

		fsWatch (watchFolder, {
			[/.*\.conf/]: () => {
				assert (false);
			},
			[/\.jasmine\.json/]: ({folder, files}) => {
				assert.equal (folder, watchFolder);
				assert.equal (files[0], touchFile);
				done ();
			},
			[/.*/]: () => {
				assert (false);
			}
		});

		var now = new Date();
		fs.utimesSync(path.join (watchFolder, touchFile), now, now);

	});


});