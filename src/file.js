const fs = require("fs");

const cache = require("./cache");
const config = require("../config");


let Files = {};

class File {

	constructor(user, name, total_size) {
		this.name = name;
		this.total_size = total_size;
		this.path = process.cwd() + "/result/" + user + "/";
		this.parse();
	}

	parse() {
		!fs.existsSync(this.path) && fs.mkdirSync(this.path);
		try{
			this.stat = fs.statSync(this.path +  this.name);
		} catch(er){
		} //It's a New File

		this.getFileDescriptor();
	}

	getFileDescriptor() {
		try {
			console.log(this.path + this.name);
			this.fd = fs.openSync(this.path + this.name, "a", "0755");
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

	delete() {
		if(this.fd) {
			try {
				fs.unlinkSync(this.path + this.name);
			} catch(err) {
				console.log(err);
			}
		}
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
			console.log("Starting", progress, downloaded);

			let update_data = {
				$set: {
					cursor: cursor,
					downloaded: downloaded,
					progress: progress,
					updated: Date.now(),
					status: "pending",
				},
				$setOnInsert: {
					size: this.file.total_size,
					created: Date.now()
				},
				/*
				$max: {
				}
				*/
			}

			// console.log(update_data);
			this.collection.findOneAndUpdate(
				{ user: this.user, name: this.file.name, /* status: { $ne: "completed" }*/ }, 
				update_data, 
				{ upsert: true, returnOriginal: false }
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
		});
	}

	upload(data) {
		return new Promise(async (resolve, reject) => {
		let Name = data['Name'];// This should be id
			let f;
			try {
				f = await this.cache.execute("HGET", this.user, Name);
				f = JSON.parse(f);
				console.log("last sync data", f);
			} catch(err) {
				return reject(err);
			}
		f.downloaded += data['Data'].length;
		if(f.downloaded >= f.size) //If File is Fully Uploaded
		{
			this.file.writeSync(data['Data']);
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
		} /* else if(f.buffered_data > this.buffer_size){ //If the Data Buffer reaches 10MB = 10485760 bytes
			f.buffered_data = "";
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
			let written = this.file.writeSync(data['Data']);
			console.log("ADHA", written, data['Data'].length, f.downloaded);
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
