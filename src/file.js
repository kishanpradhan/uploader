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

	get db() {
		this._db = this._db || config.get("DB.mongo.db")["uploader"];
		return this._db;
	}

	get collection() {
		this._collection = this._collection || this.db.collection("files");
		return this._collection;
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
		this.collection.findOneAndUpdate(
			{ user: this.user, name: this.file.name },
			{ $set: {
				progress: 100,
				cursor: f.size,
				status: "completed",
				updated: Date.now()
			}},
		);
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
		// return new Promise((resolve, reject) => { 
			let cursor = 0, downloaded = 0;
			if(this.file.stat && this.file.stat.isFile()) {
				downloaded = this.file.stat.size; 
				cursor = this.file.stat.size / 524288; 
			}
			let progress = (downloaded / this.file.total_size) * 100;
			console.log("Starting", progress, downloaded);
			return this.updateDatabase({
				cursor: cursor,
				downloaded: downloaded,
				progress: progress,
			})
		// });
	}

	updateDatabase(data) {
		return new Promise((resolve, reject) => {
			let update_data = {
				$set: {
					cursor: data.cursor,
					downloaded: data.downloaded,
					progress: data.progress,
					updated: Date.now(),
					status: "pending",
				},
				$setOnInsert: {
					size: this.file.total_size,
					created: Date.now()
				},
			}

			console.log(update_data);
			this.collection.findOneAndUpdate(
				{ user: this.user, name: this.file.name, /* status: { $ne: "completed" }*/ }, 
				update_data, 
				{ upsert: true, returnOriginal: false }
			).then((res) => {
				// console.log(res);
				let doc = res.value || {
					cursor: data.cursor,
					downloaded: data.downloaded,
					progress: data.progress,
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
					mongo_progress: doc.progress
				}
				console.log("$redis", cache_data);
				this.cache.execute("HSET", this.user, this.file.name, JSON.stringify(cache_data));
				resolve({ cursor: doc.cursor, progress: doc.progress, downloaded: doc.downloaded });
			}).catch((err) => {
				reject(err);
			});
		});
	}

	updateMongo(data) {
		this.collection.findOneAndUpdate(
			{ user: this.user, name: this.file.name },
			{ $set: {
				progress: data.progress,
				cursor: data.cursor,
				status: data.status,
				updated: Date.now()
			}},
		);
	}

	updateUpload(f, cursor, progress) {
		// console.log("check mongo", progress, f.mongo_progress, progress - f.mongo_progress)
		if(progress - f.mongo_progress > 5) {
			console.log("Logging to mongodb");
			this.updateMongo({
				progress: progress,
				cursor: cursor,
				status: "pending",
			});
			f.mongo_progress = progress;
		}
		f.progress = progress;
		f.updated = Date.now();
		f.cursor = cursor;
		// console.log("Update $redis", f);
		return this.cache.execute("HSET", this.user, this.file.name, JSON.stringify(f));
	}

	finishUpload(data) {
		this.updateMongo(data);
		this.cache.execute("HDEL", this.user, this.file.name);
	}

	upload(data) {
		return new Promise(async (resolve, reject) => {
			let Name = data['Name'];// This should be id
			let f;
			try {
				f = await this.cache.execute("HGET", this.user, Name);
				f = JSON.parse(f);
				console.log("last sync data", f.downloaded, f.progress);
			} catch(err) {
				return reject(err);
			}
			f.downloaded += data['Data'].length;
			if(f.downloaded >= f.size) { // When File is fully uploaded
				this.file.writeSync(data['Data']);
				console.log("All data uploaded");
				this.finishUpload({
					cursor: f.size,
					progress: 100,
					status: "completed",
				});
				resolve({ "cursor": this.file.total_size, progress: 100 });
			} /* else if(f.buffered_data > this.buffer_size){ //If the Data Buffer reaches 10MB = 10485760 bytes
				f.buffered_data = "";
				this.collection.findOneAndUpdate(
					{ user: this.user, name: this.file.name },
					{ $set: {
						progress: progress,
						cursor: Files[Name]['FileSize'],
						status: "completed",
						updated: Date.now()
					}},
				);
				// this.saveDatabases();
				resolve({ 'cursor' : cursor, 'progress' :  progress });
			} */ else {
				let written = this.file.writeSync(data['Data']);
				console.log("Uploaded", written, data['Data'].length, f.downloaded);
				var cursor = f.downloaded / this.chunk_size;
				var progress = (f.downloaded / f.size) * 100;

				this.updateUpload(f, cursor, progress).then((res) => {
				}).catch((err) => {
					console.log(err);
				});
				resolve({ 'cursor' : cursor, 'progress' :  progress });
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
