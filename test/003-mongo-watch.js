import fs, { write } from 'fs';
import assert from 'assert';
import path from 'path';

import mongoWatch from '../mongo-watch.js';

import {MongoClient} from 'mongodb';

const url            = 'mongodb://localhost:27017';
const dbName         = 'watchTest';
const collectionName = 'watchCollection';

let writer, watcher;

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
	return Promise.all ([
		establishingConnection ({url, dbName, collectionName}),
		establishingConnection ({url, dbName, collectionName})
	]).then ((connections) => {

		const [_writer, _watcher] = connections;

		writer  = _writer;
		watcher = _watcher;
	})
});

afterAll (() => {
	writer.client.close ();
	watcher.client.close ();
})


describe ("mongo watcher", () => {

	it ("any change", (done) => {

		// const pipeline = {fullDocument: 'updateLookup'};
		/*
		const pipeline = [
			{ $match: { 'fullDocument.username': 'alice' } },
			{ $addFields: { newField: 'this is an added field!' } }
		];
		*/
		const pipeline = [];
		
		mongoWatch (watcher.collection, pipeline, (change) => {
			assert.equal (change.operationType, 'insert');
			assert.equal (change.fullDocument.doc, "doc contents");
			done ();
		});

		writer.collection.insertOne ({
			doc: "doc contents"
		});

	});

});