var app = require('express')()
	, settings = require('./settings')
	, config = require('./config')


function connectDB() {
	return new Promise((resolve, reject) => {
		const DATABASES = settings.DATABASES;
		let db_conns = [];
		let mongo = config.get("DB.mongo");
		for(let database of DATABASES) {
			// console.log(database);
			// db_conns.push(config.DB.mongo.connect(database));
			db_conns.push(mongo.connect(database));
		}
		Promise.all(db_conns).then((res) => {
			// console.log(config.DB.mongo);
			return resolve(true);
		}).catch((err) => {
			reject(err);
		})
	});
}

function connectCache() {
	return new Promise((resolve, reject) => {
		config.CACHE.connect(settings.CACHE).then((res) => {
			// console.log("CACHE", config.CACHE.db);
			return resolve(true);
		}).catch((err) => {
			reject(err);
		})
	});
}

function connectQueue() {
	return new Promise((resolve, reject) => {
		// console.log(settings.CELERY);
		config.QUEUE.connect(settings.CELERY.BROKER_URL).then((res) => {
			resolve(true);
		}).catch((err) => {
			reject(err);
		})
	});
}


function init(callback) {
	if(!callback) {
		console.log("Please provide callback function");
		process.exit(1);
	}

	const booting_process = [connectDB(), connectCache(), connectQueue()];
	Promise.all(booting_process).then((res) => {
		callback(null, app);
	}).catch((err) => {
		callback(err);
	});
}

module.exports = init
