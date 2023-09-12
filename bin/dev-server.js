#!/usr/bin/env node

// try to simulate budo

import path  from 'path';

import App from '../app.js';
// import App from 'app-scales/app.js';

const app = new App ();

const httpRoot = process.env.PWD + '/htdocs';
const httpPort = 50102;

////////////////////
// httpd section  //
////////////////////

import ExpressServer from '../api/httpd-express.js';
// import ExpressServer from 'app-scales/api/httpd-express.js';

/** @type {ExpressServer} */
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

// if you don't need rollup, uncomment one below and comment out rollup init
// const rollup = false;

import Rollup from '../api/rollup.js';
// import Rollup from 'app-scales/api/rollup.js';

/** @type {Rollup} */
const rollup = app.core (new Rollup ({
	httpRoot: httpRoot,
	configFiles: [
		'./rollup.browser.js',
		path.join (process.env.INIT_CWD, '.rollup.browser.js')
	]
}));

const rollup2 = app.core2 (new Rollup ({
	httpRoot: httpRoot,
	configFiles: [
		'./rollup.browser.js',
		path.join (process.env.INIT_CWD, '.rollup.browser.js')
	]
}));


////////////////////////
// discovery section  //
////////////////////////

import Bonjour from 'bonjour-hap';
const bonjour = Bonjour ();

const 
	projectName = path.basename (process.env.PWD),
	username    = process.env.USER;

const announcement = bonjour.publish({
	name: [projectName, username].join ('@') + '-server',
	type: 'http',
	port: httpPort
});

////////////////////
// signal section //
////////////////////

app.signalled ({
	'SIGINT': app.series (httpd.stopping, app.stopping)
})

//////////////////////
// watcher section  //
//////////////////////

import fsWatch from '../listen/fs.js';
// import fsWatch from 'app-scales/listen/fs.js';

app.init (() => {
	
	const watchReload = {[/.*./]: app.parallel (httpd.sendPageRefresh)}

	fsWatch ('htdocs', Object.assign ({}, watchReload, rollup ? {
		[/^[^\/]+\/loader/]:       app.parallel (rollup.buildingAll),
		[/^[^\/]+\/app/]:          app.parallel (rollup.buildingAll),
		[/\.rollup\.browser\.js/]: app.parallel (rollup.configuring)
	} : {}));
	
	Promise.all ([
		httpd.starting (),
		rollup ? rollup.starting() : Promise.resolve (),
		announcement ? announcement.starting() : Promise.resolve (),
	]).then (([httpdPort, ]) => {
		console.log ('Server listening on port ' + httpdPort);
		// advertise an HTTP server on port 3000

		
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