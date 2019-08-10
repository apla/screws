/**
 * @typedef WatchRules
 * @type {Object<RegExp[],Function>}
 */
/** @typedef {import('pg').Client} PGClient */

// https://medium.com/@simon.white/postgres-publish-subscribe-with-nodejs-996a7e45f88

// alternative https://github.com/andywer/pg-listen

/**
 * Listen for native Postgres notifications
 * @param {PGClient} client Postgresql client
 * @param {string|Array<string>} channels one or more channels to subscribe
 * @param {WatchRules|Function} callbacks function to call on notification
 */
export default function pgWatch (client, channels, callbacks) {

	channels = [].concat (channels);

	if (typeof callbacks === "function") {
		callbacks = {
			[/.*/]: callbacks
		};
	}

	client.on('notification', function (msg) {
		let payload = msg.payload;
		try {
			payload = JSON.parse(msg.payload);
		} catch (err) {
		}

		let callbackRe = Object.keys (callbacks).filter ((re, idx) => {
			const restoredRegex = RegExp.apply(RegExp, re.match(/^\/(.*)\/(.*)$/).slice(1));
			return msg.channel.match (restoredRegex);
		})[0];

		let callback = callbacks[callbackRe];

		callback (msg.channel, payload);
	});

	client.query (channels.map (c => `LISTEN ${c};`).join('\n')).then (() => {

	});

	// TODO: return function with UNLISTEN
}