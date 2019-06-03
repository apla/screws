// https://gist.github.com/cmawhorter/a527a2350d5982559bb6

import url   from 'url';
import http  from 'http';
import https from 'https';

class Proxy {

constructor (getProxyUrl) {
	this.getProxyUrl = getProxyUrl;
}

pipeUpstream (upstreamUrl, req, res) {

	req.pause();

	var options = url.parse (upstreamUrl);
	options.headers = req.headers;
	options.method  = req.method;
	options.agent   = false;

	options.headers['host'] = options.host;

	var connector = (options.protocol == 'https:' ? https : http).request (options, (serverResponse) => {
		/*
		console.error('<== Received %s for', serverResponse.statusCode, upstreamUrl);
		console.log('\t-> Request Headers: ', options);
		console.log(' ');
		console.log('\t-> Response Headers: ', serverResponse.headers);
		*/

		serverResponse.pause();

		serverResponse.headers['access-control-allow-origin'] = '*';

		switch (serverResponse.statusCode) {
			// pass through.  we're not too smart here...
			case 200: case 201: case 202: case 203: case 204: case 205: case 206:
			case 304:
			case 400: case 401: case 402: case 403: case 404: case 405:
			case 406: case 407: case 408: case 409: case 410: case 411:
			case 412: case 413: case 414: case 415: case 416: case 417: case 418:
				res.writeHeader (serverResponse.statusCode, serverResponse.headers);
				serverResponse.pipe (res);
				serverResponse.resume ();
			break;

			// fix host and pass through.
			case 301:
			case 302:
			case 303:
				serverResponse.statusCode = 303;
				// serverResponse.headers['location'] = makeRedirectUrl(serverResponse.headers['location']);
				// serverResponse.headers['location'] = 'http://localhost:'+PORT+'/'+serverResponse.headers['location'];

				// TODO: cookies
				// TODO: absolute location

				this.getProxyUrl ({
					locationHeader: serverResponse.headers['location'],
					req,
				});

				req.redirectCount = (req.redirectCount + 1) || 1;
				if (req.redirectCount > 10) {
					// TODO: error
				} else {
					return this.pipeUpstream (upstreamUrl, req, res);
				}

				console.log('\t-> Redirecting %s to ', upstreamUrl, serverResponse.headers['location']);
				res.writeHeader(serverResponse.statusCode, serverResponse.headers);
				serverResponse.pipe(res);
				serverResponse.resume();
			break;

			// error everything else
			default:
				var stringifiedHeaders = JSON.stringify (serverResponse.headers, null, 4);
				serverResponse.resume ();
				res.writeHeader (500, {
					'content-type': 'text/plain'
				});
				res.end (process.argv.join(' ') + ':\n\nError ' + serverResponse.statusCode + '\n' + stringifiedHeaders);
			break;
		}

		// console.log('\n\n');
	});

	connector.on ('error', (error) => console.log ('PROXY', error));

	req.pipe (connector);
	req.resume ();
}
}

export default Proxy;


