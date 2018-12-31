const fs = require("fs");

const cache = require("./cache");
const config = require("../config");


let Files = {};

class File {

	constructor(name, total_size) {
		this.name = name;
		this.total_size = total_size;
		this.parse();
	}

	parse() {
		try{
			this.stat = fs.statSync('/Users/Kishan/Projects/Mine/uploader/Temp/' +  this.name);
		} catch(er){} //It's a New File

		this.getFileDescriptor();
	}

	getFileDescriptor() {
		try {
			this.fd = fs.openSync("/Users/Kishan/Projects/Mine/uploader/Temp/" + this.name, "a", "0755");
		} catch(err) {
			console.log(err);
			throw new Error("File could not be opened");
		}
	}

	/**
	 * Return percent of uploaded file
	 */
	progress() {
	}

	write(data, callback) {
		if(!this.fd) {
			this.getFileDescriptor();
		}
		fs.write(this.fd, data, null, 'Binary', callback);
	}

	writeSync(data) {
		if(!this.fd) {
			this.getFileDescriptor();
		}
		return fs.writeSync(this.fd, data, null, 'Binary');
	}

	save() {
	}

	toJSON() {
		return {
			name: this.name,
			progress: this.progress,
		}
	}

	toString() {
		// console.log("toString called");
		return JSON.stringify(this.toJSON());
	}
}

class Uploader {

	constructor(user, file) {
		this.file = file;
		this.user = user;
		this.cache = cache();
		this.db = config.get("DB.mongo.db")["uploader"]
		this.collection = this.db.collection("files");
		this.progress = 0;
		this.buffer_size = 10485760; // 10MB
		// this.chunk_size = 10485760; // 500KB
		this.chunk_size = 524288; // 500KB
	}

	get value() {
		return {
			name: this.file.name,
			progress: this.progress,
			fd: ""
		}
	}

	get value_str() {
		return JSON.stringify(this.value);
	}

	start() {
		return new Promise((resolve, reject) => { 
			let cursor = 0, downloaded = 0;
			if(this.file.stat && this.file.stat.isFile()) {
				downloaded = this.file.stat.size; 
				cursor = this.file.stat.size / 524288; 
			}
			let progress = (downloaded / this.file.total_size) * 100;

			/*
			Files[this.file.name] = {  //Create a new Entry in The Files Variable
				FileSize : this.file.total_size,
				Data     : "",
				Downloaded : downloaded
			}
			console.log(this.file.fd);
			*/
			// Files[this.file.name]['Handler'] = this.file.fd; //We store the file handler so we can write to it later
			// Do find and upsert
			let update_data = {
				$set: {
					cursor: cursor,
					downloaded: downloaded,
					updated: Date.now()
				},
				$setOnInsert: {
					size: this.file.total_size,
					created: Date.now()
				},
				$max: {
					progress: progress,
				}
			}

			this.collection.findOneAndUpdate(
				{ user: this.user, name: this.file.name, /* status: { $ne: "completed" }*/ }, 
				update_data, 
				{ upsert: true }
			).then((res) => {
				console.log(res);
				let doc = res.value || {
					cursor: cursor,
					downloaded: downloaded,
					progress: progress,
					created: Date.now(),
					updated: Date.now(),
				};
				if(!doc) {
					console.log("Not getting data");
				}
				// Insert to redis
				let cache_data = {
					cursor: doc.cursor,
					downloaded: doc.downloaded,
					progress: doc.progress,
					size: doc.size,
					created: doc.created,
					updated: doc.updated,
				}
				this.cache.execute("HSET", this.user, this.file.name, JSON.stringify(cache_data));
				resolve({ cursor: doc.cursor, progress: doc.progress, downloaded: doc.downloaded });
			}).catch((err) => {
				reject(err);
			});
			/*
			// check file in redis
			this.cache.execute("HGET", this.user, this.file.name)
				.then((res) => {
					// if not, create in redis and mongo
					// else get uploaded percent
					console.log("RR", res); 
					if(res) {
						resolve(JSON.parse(res));
					} else {
						try {
							console.log("SSSssdfsf", this.value);
							this.cache.execute("HSET", this.user, this.file.name, this.value_str);
						} catch(err) {
							console.log(err);
						}
					}
				}).catch((err) => { console.log(err); reject(err); });
				*/
		});
	}

	upload(data) {
		return new Promise(async (resolve, reject) => {
		let Name = data['Name'];// This should be id
			let f;
			try {
				f = await this.cache.execute("HGET", this.user, Name);
				f = JSON.parse(f);
				console.log(f);
			} catch(err) {
				return reject(err);
			}
		f.downloaded += data['Data'].length;
		// Files[Name]['Downloaded'] += data['Data'].length;
		// Files[Name]['Data'] += data['Data'];
		// console.log(data['Data'].length, Files[Name]['Data'].length);
		// Get file details from redis
		// if file size + current data size == total
		// Finish upload
		// else write file and save to redis
		// if(Files[Name]['Downloaded'] == Files[Name]['FileSize']) //If File is Fully Uploaded
		if(f.downloaded == f.size) //If File is Fully Uploaded
		{
			this.file.write(data['Data']);
			console.log("All data uploaded");
			// save in mongo
			this.collection.findOneAndUpdate(
				{ user: this.user, name: this.file.name },
				{ $set: {
					progress: 100,
					cursor: f.size,
					status: "completed",
					updated: Date.now()
				}},
			);
			this.cache.execute("HDEL", this.user, this.file.name);
			resolve({ "Place": this.file.total_size, Percent: 100 });
		} /* else if(Files[Name]['Data'].length > this.buffer_size){ //If the Data Buffer reaches 10MB = 10485760 bytes
			var Place = Files[Name]['Downloaded'] / this.chunk_size;
			var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
			// file.writeSync()
			let Writen = this.file.writeSync(Files[Name]['Data']);
			// let Writen = fs.writeSync(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary');
			console.log("ADHA", Writen, Files[Name]['Data'].length);
			Files[Name]['Data'] = ""; //Reset The Buffer
			this.collection.findOneAndUpdate(
				{ user: this.user, name: this.file.name },
				{ $set: {
					progress: Percent,
					cursor: Files[Name]['FileSize'],
					status: "completed",
					updated: Date.now()
				}},
			);
			// this.saveDatabases();
			resolve({ 'Place' : Place, 'Percent' :  Percent });
		} */ else {
			// var Place = Files[Name]['Downloaded'] / this.chunk_size;
			// var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
			let Writen = this.file.writeSync(data['Data']);
			// console.log("ADHA", Writen, data['Data'].length);
			var cursor = f.downloaded / this.chunk_size;
			var progress = (f.downloaded / f.size) * 100;

			if(f.progress - progress > 5) {
				this.collection.findOneAndUpdate(
					{ user: this.user, name: this.file.name },
					{ $set: {
						progress: progress,
						cursor: cursor,
						status: "pending",
						updated: Date.now()
					}},
				);
				f.sync_mongo = Date.now();
			}
			f.progress = progress;
			f.updated = Date.now();
			f.cursor = cursor;
			this.cache.execute("HSET", this.user, this.file.name, JSON.stringify(f));
			// check file data has been saved to mongo or not
			// if(f.f.last_sync > this.buffer_size) {
			// }
			resolve({ 'Place' : cursor, 'Percent' :  progress });
		}
		});
	}

	finish() {
	}
}

module.exports = {
	File: File,
	Uploader: Uploader
}
