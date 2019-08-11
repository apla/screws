import assert from 'assert';

import pgWatch from '../listen/pg.js';

import {Client} from 'pg';

let publisher;

function establishingConnection () {
	const client = new Client({
		database: process.env.PGDATABASE || 'bookshelf_test',
		user:     process.env.PGUSER     || 'apla',
		host:     process.env.PGHOSTADDR || process.env.PGHOST || 'localhost',
		port:     parseInt (process.env.PGPORT, 10) || 5432,
		password: process.env.PGPASSWORD
	});
	
	return client.connect().then (() => client);
}

beforeAll (() => {
	return establishingConnection ().then (
		client => publisher = client
	);
});

afterAll (() => {
	publisher.end ();
})


describe ("pg watcher", () => {

	it ("any notification", async (done) => {

		const subscriber = await establishingConnection ();

		pgWatch (subscriber, 'virtual', (channel, payload) => {
			assert.equal (channel, 'virtual');
			assert.equal (payload, 'ok');

			subscriber.end ();

			done ();
		});

		publisher.query ("NOTIFY virtual, 'ok';");

	});

	it ("any notification with json payload", async (done) => {

		const subscriber = await establishingConnection ();

		pgWatch (subscriber, 'virtual', (channel, payload) => {
			assert.equal (channel, 'virtual');
			assert.equal (payload.json,  true);
			assert.equal (payload.str,   "str");
			assert.equal (payload.digit, 2);

			subscriber.end ();

			done ();
		});

		const payload = JSON.stringify ({
			json:  true,
			str:   "str",
			digit: 2
		});

		publisher.query (`NOTIFY virtual, '${payload}';`);

	});

	it ("notification by channel", async (done) => {

		const subscriber = await establishingConnection ();

		const channels = {virtual: 2, real: 0, ephemeral: 1};

		let sum   = 0;
		let count = 0;

		pgWatch (subscriber, Object.keys (channels), (channel, payload) => {
			
			sum += payload;
			count ++;

			if (count === 3) {
				subscriber.end ();

				assert.equal (sum, 3);

				done ();
			}
		});

		publisher.query ("NOTIFY virtual, '2'; NOTIFY ephemeral, '1'; NOTIFY real, '0';");

	});

});