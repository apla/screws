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
	+ new URL('http://example' + req.url).search;
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
 * @property {string|number}            [port]    port to listen
 */

/** 
 * @typedef {import('./api.js').AppAPI} AppAPI
 */
/** 
 * @typedef {import('http').Server} HTTPServer
 */

 "";

/**
 * @classdesc HTTP server based on express
 * @implements {AppAPI}
 */
export default class HTTPServerExpress {
	/**
	 * Express server constructor
	 * @param {HTTPServerOptions} [options={}]
	 */
	constructor (options = {}) {
		this.express = express ();
		/** @type {HTTPServer|undefined} */
		this.server  = undefined;
		this.handlers = {};

		if (options.root) {
			this.enableStatic (options.root, options.mimeMaps);
		}
		
		if (options.port) {
			this.port = options.port;
		} else {
			this._port = 0;
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
	 * @param {number|string} portNum port number
	 */
	set port (portNum) {
		const portInt = parseInt (portNum.toString(), 10);
		if (portInt < 0 || portInt > 65535) {
			throw "port number should be integer with 0 < value < 65535";
		}
		this._port = portInt;
	}

	/**
	 * @returns {number} port number
	 */
	get port () {
		return this._port;
	}

	/**
	 * Asking API to start
	 * @returns {Promise<number>} port at which API started
	 */
	starting () {
		return new Promise ((resolve, reject) => {
			const httpd = this;
			this.express.listen (this.port , function (err) {
				if (err)
					return reject (err);
				httpd.server = this;
				if (httpd.handlers.didStart) {
					const handler = httpd.handlers.didStart;
					let handlerResult;
					try {
						handlerResult = handler (httpd);
					} catch (err) {
						console.error (err);
						reject (err);
						return;
					}

					Promise.resolve (handlerResult).then (result => {
						if (result && result instanceof Error) {
							reject (result);
							return;
						}

						resolve (this.address().port);
					});

					return;

				}
				resolve (this.address().port);
			});
		})
	}

	didStart (handler) {
		// TODO: I really don't want to support multiple handlers
		this.handlers.didStart = handler;
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
