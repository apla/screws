#!/usr/bin/env node

import path  from 'path';

import App from '../app.js';
// import App from 'screws/app.js';

const app = new App ();

const httpRoot = process.env.PWD + '/htdocs';

////////////////////
// httpd section  //
////////////////////

import ExpressServer from '../http-server-express.js';
// import ExpressServer from 'screws/http-server-express.js';

const httpd = new ExpressServer ({
	root: httpRoot,
	proxy: true,
	eventsUrl: '/events'
});

app.connect (httpd);

/////////////////////
// rollup section  //
/////////////////////

// import rollupConfigs from './rollup.browser.js';

import Rollup from '../rollup.js';
// import Rollup from 'screws/rollup.js';

const rollup = new Rollup ({
	httpRoot: httpRoot,
	configFiles: [
		'./rollup.browser.js',
		path.join (process.env.INIT_CWD, '.rollup.browser.js')
	]
});

// rollup.configuring ();

app.connect (rollup);

//////////////////////
// watcher section  //
//////////////////////

import fsWatch from '../fs-watch.js';
// import fsWatch from 'screws/fs-watch.js';

fsWatch ('htdocs', {
	[/^[^\/]+\/loader/]: app.event (rollup.buildingAll),
	[/^[^\/]+\/app/]: app.event (rollup.buildingAll),
	[/\.rollup\.browser\.js/]: app.event (rollup.configuring),
	[/.*./]: app.event (httpd.sendPageRefresh)
});

//////////////////////
// signal section  //
//////////////////////

app.signalled ({
	'SIGINT': app.event (httpd.stopping)
})

////////////////////////
// discovery section  //
////////////////////////

import Bonjour from 'bonjour-hap';

Promise.all ([
	httpd.starting (50102),
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