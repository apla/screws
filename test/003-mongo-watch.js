import assert from 'assert';

import mongoWatch from '../mongo-watch.js';

import {MongoClient} from 'mongodb';

const url            = 'mongodb://localhost:27017';
const dbName         = 'watchTest';
const collectionName = 'watchCollection';

let writer;

function establishingConnection ({url, dbName, collectionName}) {
	return new Promise ((resolve, reject) => {

		const client = new MongoClient (url, {useNewUrlParser: true});

		client.connect (function (err) {
			if (err)
				return reject (err);
	
			const db = client.db (dbName);
		
			db.collection (collectionName, (err, _collection) => {
				if (err)
					return reject (err);
	
				const collection = _collection;
	
				resolve ({
					client:     client,
					db:         db,
					collection: collection
				});
			})
		});	
	
	});

}

beforeAll (() => {
	return establishingConnection ({url, dbName, collectionName}).then (
		_writer => writer = _writer
	);
});

afterAll (() => {
	writer.client.close ();
})


describe ("mongo watcher", () => {

	it ("any change", async (done) => {

		// const pipeline = {fullDocument: 'updateLookup'};
		/*
		const pipeline = [
			{ $match: { 'fullDocument.username': 'alice' } },
			{ $addFields: { newField: 'this is an added field!' } }
		];
		*/

		const watcher = await establishingConnection ({url, dbName, collectionName});

		const pipeline = [];
		
		mongoWatch (watcher.collection, pipeline, (change) => {
			assert.equal (change.operationType, 'insert');
			assert.equal (change.fullDocument.doc, "doc contents");

			watcher.client.close ();

			done ();
		});

		writer.collection.insertOne ({
			doc: "doc contents"
		});

	});

	
	it ("only delete change", async (done) => {

		const watcher = await establishingConnection ({url, dbName, collectionName});

		const pipeline = [{
			$match: {operationType: 'delete'}
		}];
		
		mongoWatch (watcher.collection, pipeline, (change) => {
			assert.equal (change.operationType, 'delete');

			watcher.client.close ();

			done ();
		});

		writer.collection.insertOne ({
			doc: "doc contents"
		}, (err, res) => {
			writer.collection.deleteOne ({_id: res.insertedId});
		});

	});


});