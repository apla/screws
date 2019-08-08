import os from 'os';

import {EventEmitter} from 'events';

/**
 * @class App
 * @method use
 */
export default class App extends EventEmitter {
	constructor () {

		super();

		/** @type Object @description subscriber instances */
		this.subscribers = {};

		this.init ();
	}

	/**
	 * Connect module with app
	 * @property {Object|string} subscriber string with 
	 * @property {string=} prefix override prefix for subscriber
	 * @memberof App
	 */
	connect (subscriber, prefix) {
		
		let className;
		if (!prefix) {
			if (subscriber.constructor === Function) {
				// in most cases this is a class constructor (or it should be!)
				prefix = subscriber.prefix;
				className = subscriber.name;
				subscriber = new subscriber ();
			} else {
				// class instance
				prefix = subscriber.constructor.prefix;
				className = subscriber.constructor.name;
			}
		}
		// console.log (subscriber, subscriber.name, subscriber.constructor === Function, sub, sub.constructor.prefix, sub instanceof Function);
		if (!prefix) {
			console.error (`Module ${className} should have prefix`);
		}

		this.subscribers[prefix] = subscriber;

		return subscriber;
	}

	/**
	 * Wraps received function reference as event
	 *
	 * @param {Function} fn method reference
	 * @param {Object=} subscriber class instance reference
	 * @memberof App
	 */
	event (fn, subscriber) {
		// console.trace (fn);

		if (!fn) {
			console.trace (`No function passed to wrap as event`);
			return;
		}

		let subPrefixFound;
		let methodFound;

		function findMethod (subCandidate, subPrefix) {
			
			allMethods (subCandidate).filter (
				methodName => subCandidate[methodName] === fn
			).forEach (methodName => {
				if (methodFound && subPrefixFound) {
					console.error (`Found method ${fn.name} in both ${subPrefixFound} and ${subPrefix}. Please use 'app.wrap (method, instance)'.`);
				} else {
					// method name is a key in subscriber. function name can be anything
					methodFound    = methodName;
					subPrefixFound = subPrefix;
				}
				// console.log ('FOUND METHOD', fn.name, subPrefix);
			});
		}

		Object.keys (this.subscribers).forEach (subPrefix => {
			const subCandidate = this.subscribers[subPrefix];

			if (subscriber) {
				if (subscriber !== subCandidate) {
					return;
				}
			}

			findMethod (subCandidate, subPrefix);
		});

		if (!subPrefixFound || !methodFound) {
			console.trace (`No instance found for method ${fn.name}. Did you used 'app.register (module)' before calling 'app.wrap (module.${fn.name})'?`);
			return;
		}
	
		return this.emitEvent.bind (this, subPrefixFound, methodFound);

	}

	emitEvent (subPrefix, method, ...args) {
		// console.log ('EMITTING', subPrefix, method, args);
		const subscriber = this.subscribers[subPrefix];
		subscriber[method].apply (subscriber, args);
	}

	init () {
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
