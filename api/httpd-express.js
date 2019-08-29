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
 * @property {string=}                  root      HTTP server root for static files
 * @property {Object<string,string[]>=} mimeMaps  additional mime maps (content-type: [list of extensions])
 * @property {boolean=}                 proxy     use forward proxy on scheme: //server/http(d)/proxied.site
 * @property {string|boolean=}          eventsUrl use SSE, /events by default
 * @property {number=}                  port      port to listen
 */

/** 
 * @typedef {import('./subscriber.js')} Subscriber
 */
/** 
 * @typedef {import('http').Server} HTTPServer
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
		this.express = express ();
		/** @type HTTPServer */
		this.server  = undefined;

		if (options.root) {
			this.enableStatic (options.root, options.mimeMaps);
		}
		
		if (options.port) {
			this.port = options.port;
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
		this.express.use(/\/(https?)\/(.*)/, proxyHandler);
	}

	/**
	 * Enable static files server
 	 * @param {string}  root HTTP server root for static files
 	 * @param {Object<string,string[]>=} mimeMaps additional mime maps (content-type: [list of extensions])
	 */
	enableStatic (root, mimeMaps = {}) {
		this.root = root;

		// Can I call define with whole object?
		Object.keys (mimeMaps).forEach (contentType => {
			// {'video/mp2t': ['m2ts']}
			express.static.mime.define ({
				[contentType]: mimeMaps[contentType]
			});
		});
		
		this.express.use (express.static (this.root));
	}

	/**
	 * 
	 * @param {number|string=} port port to listen
	 */
	starting (port) {
		port = port || this.port || 0;
		return new Promise ((resolve, reject) => {
			const self = this;
			this.express.listen (parseInt (port) >= -1 ? port : this.port || 0 , function (err) {
				if (err)
					return reject (err);
				self.server = this;
				resolve (this.address().port);
			});
		})
	}

	stopping () {
		return new Promise ((resolve, reject) => {
			if (this.server) {
				this.server.close(err => {
					if (err) {
						return reject (err);
					}
					resolve ();
				});
			} else {
				resolve ();
			}
		})
	}

	enableSSE (eventsUrl = '/events') {

		const eventSender = new EventSender ({
			url:      eventsUrl,
			root: this.root
		}, this.express);

		this.eventSender     = eventSender;
		this.sendPageRefresh = eventSender.reload;
		this.sendAlert       = eventSender.alert;
		this.sendEvent       = eventSender.event;
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

	/**
	 * @abstract
	 */
	sendEvent () {
		console.warn ("This is the stub method. To enable page event, use `httpd.enableSSE()` or define `eventsUrl` in httpd constructor options");
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
