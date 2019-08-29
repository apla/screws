import os from 'os';

import cluster from 'cluster';

import {EventEmitter} from 'events';

import stackTrace from 'error-stack-parser';

function callerPos () {
	const calls = stackTrace.parse (new Error ());
	return calls[2];
}

/**
 * @class App
 */
export default class App extends EventEmitter {
	constructor () {

		super();

		/** @type {Object} @description api instances */
		this.apiInstances = {};

	}

	/**
	 * Register api to be used with the app's core process
	 * @property {Object|string} api api identifier
	 * @property {string=|Object=} options api options
	 * @memberof App
	 */
	core (api, options) {
		
		const caller = callerPos();
		let apiInstanceId = `${caller.functionName} @ ${caller.fileName}:${caller.lineNumber}:${caller.columnNumber}`;

		/* returns empty object to avoid uninitialized errors */
		if (cluster.isWorker) {
			return undefined;
		}

		let className, apiInstance;
		if (api.constructor === Function) {
			// in most cases this is a class constructor (or it should be!)
			// prefix = api.prefix;
			className = api.name;
			apiInstance = new api ();
		} else {
			// class instance
			// prefix = api.constructor.prefix;
			className = api.constructor.name;
			apiInstance = api;
		}

		// console.log (api, api.name, api.constructor === Function, sub, sub.constructor.prefix, sub instanceof Function);
		// if (!apiInstanceId) {
		//	console.error (`Module ${className} should have prefix`);
		// }

		this.apiInstances[apiInstanceId] = apiInstance;

		return apiInstance;
	}

	/**
	 * Generate parrallel event emitter from functions
	 *
	 * @param {Array<Function|Array<Function,Object>>} handlers method reference
	 * @memberof App
	 */
	parallel (...handlers) {
		return (...args) => Promise.all (
			this._wrapEvents (handlers).map (
				evtHandler => evtHandler (args)
			)
		);
	}

	/**
	 * Generate sequential event emitter from functions
	 *
	 * @param {...Function|Array<Function,Object>} handlers method reference
	 * @memberof App
	 */
	series (...handlers) {
		return (...args) => this._wrapEvents (handlers).reduce (
			(prev, current) => prev.then (() => current (args)),
			Promise.resolve()
		);
	}

	/**
	 * Wraps received function list reference as event
	 *
	 * @param {Array<Function|Array<Function,Object>>} handlers method reference
	 * @memberof App
	 */
	_wrapEvents (handlers) {
		if (!handlers.length) {
			console.trace (`No function passed to wrap as event`);
		}
		return handlers.map (handler => {
			let
				fn,
				api;
			
			if (Array.isArray (handler)) {
				[fn, api] = handler;
			} else {
				fn = handler;
			}
			if (!fn) {
				console.trace (`Unexpected function passed to wrap as event`);
			}
			return this._event (fn, api);
		});

	}

	/**
	 * Wraps received function reference as event
	 *
	 * @param {Function} fn method reference
	 * @param {Object=} api class instance reference
	 * @memberof App
	 */
	_event (fn, api) {
		// console.trace (fn);

		if (!fn) {
			console.trace (`No function passed to wrap as event`);
			return;
		}

		let apiInstanceIdFound;
		let methodFound;

		function findMethod (apiCandidate, apiInstanceId) {
			
			allMethods (apiCandidate).filter (
				methodName => apiCandidate[methodName] === fn
			).forEach (methodName => {
				if (methodFound && apiInstanceIdFound) {
					console.error (`Found method ${fn.name} in both ${apiInstanceIdFound} and ${apiInstanceId}. Please use 'app.wrap (method, instance)'.`);
				} else {
					// method name is a key in api. function name can be anything
					methodFound    = methodName;
					apiInstanceIdFound = apiInstanceId;
				}
				// console.log ('FOUND METHOD', fn.name, apiInstanceId);
			});
		}

		Object.keys (this.apiInstances).forEach (apiInstanceId => {
			const apiCandidate = this.apiInstances[apiInstanceId];

			if (api) {
				if (api !== apiCandidate) {
					return;
				}
			}

			findMethod (apiCandidate, apiInstanceId);
		});

		if (!apiInstanceIdFound || !methodFound) {
			console.trace (`No instance found for method ${fn.name}. Did you used 'app.register (module)' before calling 'app.wrap (module.${fn.name})'?`);
			return;
		}
	
		return this.emitEvent.bind (this, apiInstanceIdFound, methodFound);

	}

	emitEvent (apiInstanceId, method, args) {
		// console.log ('EMITTING', apiInstanceId, method, args);
		const api = this.apiInstances[apiInstanceId];
		return api[method].call (api, ...args);
	}

	/**
	 * Handles core process signals
	 *
	 * @param {Object<String,Function>} signalHandlers signal handlers
	 * @memberof App
	 */
	signalled (signalHandlers) {
		
		Object.keys (signalHandlers).forEach (signalName => {
			// https://github.com/electron/electron/issues/9626
			process.on (signalName, () => {
				const handler = signalHandlers[signalName];
				handler ();
			})
		})
		
	}

	/**
	 * Stops core process
	 */
	stopping () {
		process.exit();
	}

	/**
	 * App init procedure. Will be called only in core process
	 * @param {Function} coreInitFn initialization function
	 */
	init (coreInitFn) {
		if (cluster.isMaster) {
			this.core (this);
			coreInitFn ();
		} else {

		}
	}
}

function allMethods (obj) {
	let methods = Object.keys(obj).reduce ((a, k) => (a[k] = true, a), {});
	const objProto = Object.getPrototypeOf({}); 
	for (; obj !== null && obj !== objProto; obj = Object.getPrototypeOf(obj)) {
		methods = Object.getOwnPropertyNames(obj).filter (
			prop => prop !== 'constructor' && typeof obj[prop] === 'function'
		).reduce ((a, prop) => (a[prop] = true, a), methods);
	}
	return Object.keys (methods);
}
