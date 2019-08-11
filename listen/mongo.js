/**
 * mongoDB
 * 
 * Since version 3.6 mongoDB supports data watch events for collection,
 * and since 4.0 for database and entire deployment (replica set).
 * 
 * `Watch` allows us to get notifications for all data change events.
 * Even more, this feature is backed by [Aggregation Pipelines]{@link https://docs.mongodb.com/manual/meta/aggregation-quick-reference/},
 * so we can even change modified data.
 * 
 * This feature requires `wiredTiger` storage engine and opLog turned on
 * because change events based on oplog and oplog is initialized for
 * replica set. For testing purposes you can convert your
 * standalone installation to replica set, but it is not recommended
 * 
 * https://docs.mongodb.com/manual/tutorial/change-standalone-wiredtiger/
 * 
 * @namespace mongo
 */

/*
Modify Change Stream Output using Aggregation Pipelines
You can control change stream output by providing an array of one or more of the following pipeline stages when configuring the change stream:
$match, $project, $addFields, $replaceRoot, $redact
See Change Events for more information on the change stream response document format.
https://docs.mongodb.com/manual/aggregation/
*/

// https://docs.mongodb.com/manual/changeStreams/

/*
  watch for collection available from 3.6, for entire node and database - from 4.0
  unfortunately, to check feature status requitres connection to admin database,
  which is probably limited
*/

// https://medium.com/@thakkaryash94/mongodb-3-6-change-streams-example-with-node-js-2b9a85652c50

/** @typedef {import('mongodb').MongoClient} MongoClient */
/** @typedef {import('mongodb').Db} MongoDb */
/** @typedef {import('mongodb').Collection} MongoCollection */

/**
 * 
 * @typedef MongoWatchCapability
 * @type {Object}
 * @property {boolean=} collection is collection watchable
 * @property {boolean=} db         is db watchable
 * @property {boolean=} deployment is deployment watchable
 */
"";
/**
 * Checks watch capability for current database connection
 * @param {MongoDb} db database connection
 * @returns {Promise<MongoWatchCapability>}
 */
export function checkingWatchCapability (db) {
	var adminDb = db.admin();
	return new Promise ((resolve, reject) => {
		adminDb.serverStatus ((err, info) => {
			if (err)
				return reject (err);
			if (info.version.match (/^3.6/)) {
				resolve ({
					collection: true
				});
			} else if (parseInt (info.version, 10) >= 4) {
				resolve ({
					collection: true,
					db:         true,
					deployment: true
				});
			} else {
				resolve ({});
			}
		})
	})
    
}

/**
 * Watch for changes in mongodb deployment/database/collection
 * @param {MongoClient|MongoDb|MongoCollection} connection database connection, you can use collection from >3.6 and from 4.0 server and database objects
 * @param {Object|Object[]=} pipeline Aggregation framework pipeline
 * @param {Function} cb callback with changes data
 */
export default function mongoWatch (connection, pipeline, cb) {
	const changeStream = connection.watch(pipeline);
	// start listen to changes
	// change fields: https://docs.mongodb.com/manual/reference/change-events/#change-stream-output
    changeStream.on ("change", function (change) {
    	cb (change);
	});

	// TODO: return function to close connection
}
