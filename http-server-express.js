import url from 'url';

import express from 'express';

// evaluate https://www.npmjs.com/package/express-http-proxy
import Proxy from './http-reverse-proxy.js';

import EventSender from './http-sse.js';

/////////////////////
//  proxy section  //
/////////////////////

const proxy = new Proxy (locationHeader => {
	if (locationHeader[0] === '/') {
		// same host redirect
		// cookie?
	} else {

	}
});

function getUpstreamUrl (proto, req) {
	return proto
	+ '://' + req.params[1]
	+ '?' + url.parse (req.url).query
}

function proxyHandler (req, res) {

	const proto = req.params[0];

	var upstreamUrl = getUpstreamUrl (proto, req);

	proxy.pipeUpstream (upstreamUrl, req, res);
}

/////////////////////
// server section  //
/////////////////////

/**
 * @typedef HTTPServerOptions
 * @type {Object}
 * @property {string=}  httpRoot HTTP server root for static files
 * @property {Object<string,string[]>=} mimeMaps additional mime maps (content-type: [list of extensions])
 * @property {boolean=} proxy use forward proxy on scheme://server/http(d)/proxied.site
 * @property {string|boolean=}  eventsUrl use SSE, /events by default
 */

/** 
 * @typedef {import('./subscriber.js')} Subscriber
 */
"";

/**
 * @classdesc HTTP server based on express
 * @implements Subscriber
 */
export default class HTTPServerExpress {
	/**
	 * Express server constructor
	 * @param {HTTPServerOptions=} options 
	 */
	constructor (options = {}) {
		this.server = express ();
		
		if (options.httpRoot) {
			this.enableStatic (options.httpRoot, options.mimeMaps);
		}
		
		if (options.proxy) {
			this.enableProxy ();
		}

		if (options.eventsUrl) {
			this.enableSSE (options.eventsUrl === true ? undefined : options.eventsUrl);
		}
		
	}

	static get prefix () {
		return "httpd";
	}

	enableProxy () {
		this.server.use(/\/(https?)\/(.*)/, proxyHandler);
	}

	/**
	 * Enable static files server
 	 * @param {string}  httpRoot HTTP server root for static files
 	 * @param {Object<string,string[]>=} mimeMaps additional mime maps (content-type: [list of extensions])
	 */
	enableStatic (httpRoot, mimeMaps = {}) {
		this.httpRoot = httpRoot;

		// Can I call define with whole object?
		Object.keys (mimeMaps).forEach (contentType => {
			// {'video/mp2t': ['m2ts']}
			express.static.mime.define ({
				[contentType]: mimeMaps[contentType]
			});
		});
		
		this.server.use (express.static (this.httpRoot));
	}

	starting (port = 0) {
		return new Promise ((resolve, reject) => {
			this.server.listen (parseInt (port) >= -1 ? port : this.port || 0 , function (err) {
				if (err)
					reject (err);
				resolve (this.address().port);
			});
		})
	}

	enableSSE (eventsUrl = '/events') {

		const eventSender = new EventSender ({
			url:      eventsUrl,
			httpRoot: this.httpRoot
		}, this.server);

		this.eventSender     = eventSender;
		this.sendPageRefresh = eventSender.reload;
		this.sendAlert       = eventSender.alert;
	}

	/**
	 * @abstract
	 */
	sendPageRefresh () {
		console.warn ("This is the stub method. To enable page refresh, use `httpd.enableSSE()` or define `eventsUrl` in httpd constructor options");
	}

	/**
	 * @abstract
	 */
	sendAlert () {
		console.warn ("This is the stub method. To enable page alert, use `httpd.enableSSE()` or define `eventsUrl` in httpd constructor options");
	}
}

// console.log (httpApp._router.stack);



/////////////////////
// chrome devtools autosave //
/////////////////////

// TODO: https://github.com/NV/chrome-devtools-autosave-server
// https://bitbucket.org/ryanackley/tincr/src
// https://developer.chrome.com/extensions/devtools_inspectedWindow#event-onResourceContentCommitted


//const events = {
//    "fs.change": [rollup.compile, pusher.notifyUpdate]
//}
