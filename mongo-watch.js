// const MongoClient = require("mongodb").MongoClient;

/*
Modify Change Stream Output using Aggregation Pipelines
You can control change stream output by providing an array of one or more of the following pipeline stages when configuring the change stream:
$match, $project, $addFields, $replaceRoot, $redact
See Change Events for more information on the change stream response document format.
https://docs.mongodb.com/manual/aggregation/
*/

// https://docs.mongodb.com/manual/changeStreams/

const pipeline = [
  {
    $project: { documentKey: false }
  }
];

/*
  watch for collection available from 3.6, for entire node and database - from 4.0
  unfortunately, to check feature status requitres connection to admin database,
  which is probably limited
*/

// https://medium.com/@thakkaryash94/mongodb-3-6-change-streams-example-with-node-js-2b9a85652c50

export function checkingFeatureStatus (client) {
	var adminDb = client.db ('admin');
	return new Promise ((resolve, reject) => {
		adminDb.serverStatus ((err, info) => {
			if (err)
				return reject (err);
			if (info.version.match (/^3.6/)) {
				resolve ({collection: true});
			} else if (parseInt (info.version, 10) >= 4) {
				resolve ({
					collection: true,
					db:         true,
					node:       true
				});
			} else {
				resolve ({});
			}
		})
	})
    
}

/** @typedef {import('mongodb').ClientSession} MongoClient */
/** @typedef {import('mongodb').Db} MongoDb */
/** @typedef {import('mongodb').Collection} MongoCollection */

/**
 * 
 * @param {MongoClient|MongoDb|MongoCollection} connection database connection, you can use collection from >3.6 and from 4.0 server and database objects
 * @param {Object[]=} pipeline Aggregation framework pipeline
 * @param {*} callbacks
 */
export default function mongoWatch (connection, pipeline, cb) {
	const changeStream = connection.watch(pipeline);
    // start listen to changes
    changeStream.on ("change", function (change) {
    	cb (change);
	});
}

/*
const MONGO_CONN_STR = "mongodb://localhost:27017,localhost:27018,localhost:27019?replicaSet=mongo-repl";

MongoClient.connect(MONGO_CONN_STR).then(client => {
    console.log("Connected to the server");
    // specify db and collections
    const db = client.db("superheroesdb");
    const collection = db.collection("superheroes");

    const changeStream = collection.watch(pipeline);
    // start listen to changes
    changeStream.on("change", function(change) {
    	console.log(change);
	});
});

*/