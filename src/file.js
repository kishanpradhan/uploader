
const cache = require("./cache")


let Files = {};

class File {

	constructor(name) {
		this.name = name;
	}

	/**
	 * Return percent of uploaded file
	 */
	progress() {
	}

	write() {
	}

	save() {
	}

	toJSON() {
		return {
			name: this.name,
			progress: this.progress,
		}
	}

	toString__() {
		console.log("toString called");
		return JSON.stringify(this.toJSON());
	}
}

class Uploader {

	constructor(user, file) {
		this.file = file;
		this.user = user;
		this.cache = cache();
		this.progress = 0;
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
		});
	}

	upload() {
	}

	finish() {
	}
}

module.exports = {
	File: File,
	Uploader: Uploader
}
