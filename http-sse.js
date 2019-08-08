import fs   from 'fs';
import path from 'path';

import SSEPusher from 'sse-pusher';

const packageJson = require (path.join (process.cwd (), 'package.json'));

let sseConnections = [];

function refreshNoReload () {
	// scripts should be handled using hot reload
	// css:
	//   1. inline — only one way — reload page using ajax, get page source, compare, apply css
	//   actually it is much easier to put css in separate file
	//   2. css can contains images
}

// https://itnext.io/service-workers-your-first-step-towards-progressive-web-apps-pwa-e4e11d1a2e85
function registerWorker () {
	// service workers is available only in modern browsers,
	// but I cannot use es6 code here for compatibility
	if ('serviceWorker' in navigator) {
		window.addEventListener('load', function() {
			// scope: https://stackoverflow.com/a/41707357/2790983

			var sw = navigator.serviceWorker;

			sw.register(
				// '/sw.js?' + (+Date.now()), {scope: '/'}
				'/sw.js', {scope: '/'}
			).then(function(registration) {
				// Registration was successful
				console.log('ServiceWorker registration successful with scope: ', registration.scope, registration);
			}, function(err) {
				// registration failed :(
				console.log('ServiceWorker registration failed: ', err);
			});

			sw.addEventListener ('controllerchange', function (evt) {
				console.log ('service worker controller changed', evt);
			});

			sw.addEventListener ('message', function (msg) {
				console.log ('service worker message', msg);
			});
		});
	}
}

function serviceWorker () {

	// https://gist.github.com/Rich-Harris/fd6c3c73e6e707e312d7c5d7d0f3b2f9

	var CACHE_NAME = 'main-cache';
	var filesToCache = [
		// '/',
		// '/styles/main.css',
		// '/script/main.js',
		'/spief2018/ticker/img/wide.jpg',
		'/common/fonts/opensans-regular-webfont.woff2'
	];

	var urlsToBypass = [
		/css$/,
	];

	console.log ('log from service worker')

	self.addEventListener('install', (evt) => {
		console.log('[ServiceWorker] Install');
		evt.waitUntil(
			caches.open(CACHE_NAME).then((cache) => {
				console.log('[ServiceWorker] Caching app shell');
				return cache.addAll(filesToCache);
			})
		);
	});

	self.addEventListener('activate', function(evt) {
		console.log('[ServiceWorker] Activate');
		evt.waitUntil(
			caches.keys().then(function(keyList) {
				return Promise.all(keyList.map(function(key) {
					if (key !== CACHE_NAME) {
						console.log('[ServiceWorker] Removing old cache', key);
						return caches.delete(key);
					}
				}));
			})
		);
		return self.clients.claim();
	});

	function fetchForCompare (fetchRequest) {
		fetch(fetchRequest).then(function(fetched) {
			// Check if we received a valid response
			if(!fetched || fetched.status !== 200 || fetched.type !== 'basic') {
				return fetched;
			}

			// IMPORTANT: Clone the response. A response is a stream
			// and because we want the browser to consume the response
			// as well as the cache consuming the response, we need
			// to clone it so we have 2 stream.
			var responseToCache = fetched.clone();

			return fetched;
		})
	}

	function dumpHeaders (headers) {
		var result = {};
		for (var p of headers) {
			result[p[0]] = p[1];
		}
		return result;
	}

	self.addEventListener('fetch', function (event) {
		console.log('[ServiceWorker] Fetch');

		// IMPORTANT: Clone the request. A request is a stream and
		// can only be consumed once. Since we are consuming this
		// once by cache and once by the browser for fetch, we need
		// to clone the response
		var fetchRequest = event.request.clone();

		var cached,
			fetched;

		// console.log ('REQ', dumpHeaders(event.request.headers));

		caches.match(event.request).then (_cached => {
			cached = _cached;

			if (!cached)
				return fetch(fetchRequest);

			if (cached.headers['last-modified']) {
				fetchRequest.headers.add ('if-modified-since', cached.headers['last-modified'])
			}

			// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag
			// if (cached.headers['etag']) {
			//	fetchRequest.headers.add ('etag', cached.headers['etag']);
			// }

			return fetch(fetchRequest);

		}).then (fetched => {

			// Actually, best way to compare those blobs is not compare them at all
			// It is easier to send ETag/If-Modified-Since to server side
			// and get 304 than compare blobs.
			// If server support ETag and we have 2xx response, we should cache response
			// and notify clients about changed file.

			// console.log ('CACHE', dumpHeaders(cached.headers));

			console.log ('fetched', fetched.status);

			if (fetched && fetched.status === 200 && fetched.type === 'basic') { // type=CORS?
				caches.open(CACHE_NAME).then(function(cache) {
					cache.put(fetchRequest, fetched.clone());
				});

				console.log ('[ServiceWorker] updated', fetched.url);

				return event.respondWith (fetched.clone());
			}

			if (cached) {
				console.log ('[ServiceWorker] cached', cached.url);
				return event.respondWith (cached);
			}

			event.respondWith (fetched);

			// return Promise.all (responses.map (res => res ? res.clone().blob() : Promise.resolve (undefined)))

		});

	});

	var msg = 'init';

	self.addEventListener('message', function(event){
		console.log("SW Received Message: " + event.data, event);
		event.ports[0].postMessage("SW Says 'Hello back!'");
	});

	clients.matchAll().then(clients => {
		clients.forEach(client => {
			return new Promise(function(resolve, reject){
				var msg_chan = new MessageChannel();

				console.log (123);

				msg_chan.port1.onmessage = function(event){
					if(event.data.error){
						reject(event.data.error);
					}else{
						resolve(event.data);
					}
				};

				client.postMessage("SW Says: '"+msg+"'", [msg_chan.port2]);
			});
		})
	})
}


function wsHandler () {
	var protocol = window.location.protocol === 'http:' ? 'ws://' : 'wss://';
	var address = protocol + window.location.host + window.location.pathname + '/ws';
	var socket = new WebSocket(address);
	socket.onmessage = function(msg) {
		if (msg.data == 'reload') window.location.reload();
		else if (msg.data == 'refreshcss') refreshCSS();
	};
}

function sseHandler (url) {

	// @ts-ignore
	const LiveReload = window.LiveReload;

	
	if (LiveReload) {
		LiveReload.connector.disconnect();
	}

	var source = new EventSource(url);

	source.addEventListener ('reload', function (evt) {
		// console.log ('reload event', evt);
		var files;
		try {
			files = JSON.parse (evt.data);
		} catch (e) {
			return;
		}

		if (LiveReload) {
			files.forEach (function (file) {
				LiveReload.performReload ({path: file})
			});
		} else {
			location.reload ();
		}
	});

	source.addEventListener ('alert', function (evt) {
		console.log ('alert event', evt);
		if (LiveReload) {
			LiveReload.performAlert (evt.data);
		}
	});

	source.addEventListener ('message', function(evt) {
		console.log(evt.data);
	}, false);

	var disconnected = false;

	
	source.addEventListener ('error', function (err) {
		if (err.target.readyState === 0)
			disconnected = true;
		// console.log ('err', err.target.readyState);
	});

	source.addEventListener ('open', function (evt) {

		if (disconnected) {
			console.log ("You're just connected after the error. Reloading page to refresh server data.");
			location.href = location.href;
		}
	});

} // sseHandler

function unwrapFnContents (fn) {
	return fn
		.toString ()
		.replace (/function[^\(]*\(\) \{/m, '')
		.replace (/}$/, '');
}

export default class EventSender {
	constructor ({url, root}, httpApp) {

		const pusher = this.pusher = SSEPusher();
	
		httpApp.use ('/events', pusher.handler ());
	
		httpApp.get (url + '.js', function (req, res) {
			res.setHeader ("cache-control", "no-store, private"); // "max-age=0";
			res.send (`
${sseHandler}

sseHandler ('${url}');

/*
${registerWorker}

registerWorker ();
*/
`);
		});
	
		httpApp.get ('/sw.js', function (req, res) {
			res.setHeader ("cache-control", "no-store, private"); // "max-age=0";
			res.setHeader ("content-type", "application/javascript");
			res.send (`${unwrapFnContents (serviceWorker)}`);
		})

		this.reload = function reload (folder, files) {
			// TODO: use httpRoot somehow
			// pusher ('reload', + Date.now());
			pusher ('reload', JSON.stringify (files.map (file => '/' + file)));
		}
	
		this.alert = function alert (message) {
			// TODO: use httpRoot somehow
			// pusher ('reload', + Date.now());
			pusher ('alert', message);
		}

		this.event = function event (eventName, message) {
			if (message === undefined) {
				message = eventName;
				pusher (message);
			} else {
				pusher (eventName, message);
			}
			
		}
	}

	
}

export function eventSender ({url, root}, httpApp) {

	const pusher = SSEPusher();

	httpApp.use ('/events', pusher.handler ());

	httpApp.get (url + '.js', function (req, res) {
		res.setHeader ("cache-control", "no-store, private"); // "max-age=0";
		res.send (`
${sseHandler}

sseHandler ('${url}');

/*
${registerWorker}

registerWorker ();
*/
`);
	});

	httpApp.get ('/sw.js', function (req, res) {
		res.setHeader ("cache-control", "no-store, private"); // "max-age=0";
		res.setHeader ("content-type", "application/javascript");
		res.send (`${unwrapFnContents (serviceWorker)}`);
	})

	return {
		reload: function reload (folder, files) {
			// TODO: use httpRoot somehow
			// pusher ('reload', + Date.now());
			pusher ('reload', JSON.stringify (files.map (file => '/' + file)));
		},
		alert: function alert (message) {
			// TODO: use httpRoot somehow
			// pusher ('reload', + Date.now());
			pusher ('alert', message);
		},
		event: function event (eventName, message) {
			// TODO: use httpRoot somehow
			// pusher ('reload', + Date.now());
			pusher (eventName, message);
		},
	}

}

