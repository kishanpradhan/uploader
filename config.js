const mongodb = require("mongodb"),
	celery = require('node-celery'),
	redis = require("redis")


let MONGO = {
    urlGenerator: function (creds) {
        var self = this;
        let authStr = creds.user + ":" + creds.pwd + '@';
        if (!creds.user || !creds.pwd)
            authStr = '';
        let hostStr = [];
        if (creds.host.constructor !== [].constructor) {
            return false;
        }
        for (var i = 0; i < creds.host.length; i++) {
            hostStr.push(creds.host[i] + ":" + creds.port[i]);
        }
        hostStr = hostStr.join(",");
        let dbName = creds.db;
        let replicaSet = "";
        if (creds.replicaSet) {
            replicaSet = "?replicaSet=" + creds.replicaSet;
        }
        var murl = "mongodb://" + authStr + hostStr + "/" + dbName + replicaSet;
        return murl;
    },
    db: {},
    client: {},
    connect: function(creds) {
		return new Promise((resolve, reject) => {
			let self = this;
			let dbName = creds["db"];
			let url = self.urlGenerator(creds);
			if (!url) {
				return reject("Mongo URL generation failed");
			}
			mongodb.MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {
				if (err) {
					console.log("MONGO CONNECT ERROR", err);
					callback(false);
					throw "Mongo connection error, abort abort abort...";
				}
				self.client[dbName] = client;
				self.db[dbName] = client.db(dbName);
				resolve(true);
				/*
				if (self.initSchema) {
					self.initSchema(self.db[zone][dbName], dbName).then(() => {
						console.log("SCHEMA INIT SUCCESS: ", dbName);
						self.ensureIndexes(self.db[zone][dbName], dbName).then(() => {
							console.log("Indexing Done for", zone, dbName);
							callback(true);
						}).catch((err) => {
							console.log("Indexing Err: ", err, zone);
							callback(false);
						});
					}).catch((errs) => {
						for (var i in errs) {
							console.log("SCHEMA INIT ERR: ", errs[i].message);
						}
						callback(false);
					});
				}
				else {
					callback(true);
				}
				*/
			});
		});
    },
    initSchema_Karna_hai: function (db, dbName) {
        return new Promise((resolve, reject) => {
            db.listCollections().toArray(function (err, collInfos) {
                if (err) {
                    console.log("ERR: ", err.message);
                    reject(err);
                    return;
                }
                let s = new schema_1.default.mongoSchema();
                let qList = s.getQueryList(dbName);
                // console.log("QLIST: ", qList);
                if (!qList) {
                    console.log("No schema list found for: ", dbName);
                    resolve();
                    return;
                }
                let colls = [];
                for (var i in collInfos) {
                    colls.push(collInfos[i]["name"]);
                }
                // console.log("Colls: ", colls);
                let count = 0, collLen = qList.length, errors = [];
                let respond = () => {
                    count += 1;
                    if (count === collLen) {
                        if (errors.length) {
                            reject(errors);
                        }
                        else {
                            resolve();
                        }
                    }
                };
                for (var i in qList) {
                    let sname = qList[i];
                    let strct = s.getQuery(dbName, sname);
                    // console.log("STRCT: ", strct);
                    if (!strct) {
                        respond();
                        continue;
                    }
                    if (colls.indexOf(sname) > -1) {
                        attachValidator(db, sname, strct).then((res) => {
                            respond();
                        }).catch((err) => {
                            errors.push(err);
                            respond();
                        });
                    }
                    else {
                        createCollection(db, sname, strct).then((res) => {
                            respond();
                        }).catch((err) => {
                            errors.push(err);
                            respond();
                        });
                    }
                }
            });
        });
    },
    ensureIndexes(db, dbName) {
        return new Promise((resolve, reject) => {
            const s = new schema_1.default.mongoSchema();
            let list = s.getIndexList(dbName);
            for (let i in list) {
                let collection = list[i];
                let indexes = s.getIndex(dbName, collection);
                if (indexes) {
                    for (let j in indexes) {
                        let index = indexes[j];
                        try {
                            let res = db.collection(collection).ensureIndex(index);
                        }
                        catch (e) {
                            console.log("Err in ensuring index", e);
                        }
                    }
                }
            }
            resolve(true);
        });
    }
}

let REDIS = {
    urlGenerator: function (creds) {
        let self = this;
        let authStr = "";
        if (creds['pwd']) {
            authStr = `:${creds['pwd']}@`;
        }
        return "redis://" + authStr + creds["host"] + ":" + creds["port"] + "/" + creds.db;
    },
    db: {},
    connect: function (creds) {
		return new Promise((resolve, reject) => {
			let self = this;
			let dbName = creds["db"];
			let url = self.urlGenerator(creds);
			if (!url) {
				return reject("Redis URL generation failed");
			}
			let client = redis.createClient(url, creds.options || {});
			client.on("error", function (err) {
				console.log("Redis Error " + err);
			});
			// self.db[dbName] = client;
			self.db = client;
			resolve(true);
		});
    }
};

let QUEUE = {
	client: {},
	db: {},
	connect: function (broker_url) {
		let self = this;
		return new Promise((resolve, reject) => {
			var client = celery.createClient({
				CELERY_BROKER_URL: broker_url,
				// CELERY_RESULT_BACKEND: 'amqp'
			});
			client.on('connect', function(c) {
				self.db = client;
				resolve(true);
			});
			client.on('error', function(err) {
				reject(err);
			});
		});
	}
}

function getter(key) {
	let keys = key.split(".");
	let val = this;
	for(let k of keys) {
		val = val[k];
	}
	// console.log(keys, val);
	return val;
}

module.exports = {
	DB: {
		mongo: MONGO
	},
	CACHE: REDIS,
	QUEUE: QUEUE,
	get: getter
}
