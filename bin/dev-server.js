#!/usr/bin/env node

import path  from 'path';

import App from '../app.js';
// import App from 'screws/app.js';

const app = new App ();

const httpRoot = process.env.PWD + '/htdocs';
const httpPort = 50102;

////////////////////
// httpd section  //
////////////////////

import ExpressServer from '../http-server-express.js';
// import ExpressServer from 'screws/http-server-express.js';

const httpd = app.core (new ExpressServer ({
	root: httpRoot,
	proxy: true,
	port: httpPort,
	eventsUrl: '/events'
}));

/////////////////////
// rollup section  //
/////////////////////

// import rollupConfigs from './rollup.browser.js';

import Rollup from '../rollup.js';
// import Rollup from 'screws/rollup.js';

const rollup = app.core (new Rollup ({
	httpRoot: httpRoot,
	configFiles: [
		'./rollup.browser.js',
		path.join (process.env.INIT_CWD, '.rollup.browser.js')
	]
}));

////////////////////
// signal section //
////////////////////

app.signalled ({
	'SIGINT': app.eventQueue (httpd.stopping, app.stop)
})

//////////////////////
// watcher section  //
//////////////////////

import fsWatch from '../listen/fs.js';
// import fsWatch from 'screws/listen/fs.js';

////////////////////////
// discovery section  //
////////////////////////

import Bonjour from 'bonjour-hap';

app.init (() => {
	fsWatch ('htdocs', {
		[/^[^\/]+\/loader/]: app.events (rollup.buildingAll),
		[/^[^\/]+\/app/]: app.events (rollup.buildingAll),
		[/\.rollup\.browser\.js/]: app.events (rollup.configuring),
		[/.*./]: app.events (httpd.sendPageRefresh)
	});
	
	Promise.all ([
		httpd.starting (),
		rollup.starting()
	]).then (([httpdPort, ]) => {
		console.log ('Server listening on port ' + httpdPort);
		// advertise an HTTP server on port 3000
		const 
			projectName =  path.basename (process.env.PWD),
			username    = process.env.USER;
		Bonjour().publish({
			name: [projectName, username].join ('@') + '-server',
			type: 'http',
			port: httpdPort
		});
	});
})



/*
fsWatch ('htdocs', {
	[/^[^\/]+\/loader/]: app.events.rollup.build,
	[/^[^\/]+\/app/]: app.events.rollup.build,
	[/\.rollup\.browser\.js/]: app.events.rollup.configure,
	[/.*./]: app.events.HTTPD_REFRESH
});
*/

/*
// not really works because of esm module caching
watch (
	path.join (path.dirname (process.argv[1]), 'rollup.browser.js'),
	rollup.configure
);
*/