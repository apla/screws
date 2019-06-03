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

export default class ExpressServer {
	constructor (options) {
		this.server = express ();
		
		if (options.httpRoot) {
			this.enableStatic (options.httpRoot, options.mimeMaps);
		}
		
		if (options.proxy) {
			this.enableProxy ();
		}

		if (options.eventsUrl) {
			this.enableSSE (options.eventsUrl);
		}
		
	}

	static get prefix () {
		return "httpd";
	}

	enableProxy () {
		this.server.use(/\/(https?)\/(.*)/, proxyHandler);
	}

	enableStatic (httpRoot, mimeMaps = []) {
		this.httpRoot = httpRoot;

		mimeMaps.forEach (mapping => {
			// {'video/mp2t': ['m2ts']}
			express.static.mime.define (mapping);
		});
		
		this.server.use (express.static (this.httpRoot));
	}

	listening (port = 0) {
		return new Promise ((resolve, reject) => {
			this.server.listen (port, function () {
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

	sendPageRefresh () {
		console.warn ("This is the stub method. To enable page refresh, use `httpd.enableSSE()` or define `eventsUrl` in httpd constructor options");
	}

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
