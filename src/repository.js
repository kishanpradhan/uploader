const config = require("../config");


class FileRepo {

	constructor(user) {
		this.user = user;
		this.db = config.get("DB.mongo.db")["uploader"]
		this.collection = this.db.collection("files");
	}

	getAll() {
		// return new Promise((resolve, reject) => {
			return this.collection.find({ user: this.user }).toArray();
		// });
	}

	get(id) {
		// return new Promise((resolve, reject) => {
			return this.collection.findOne({ user: this.user, name: id });
		// });
	}

	updateOne(query, data, options = {}) {
		return this.collection.findOneAndUpdate(query, data, options);
	}
}

module.exports = function(user) {
	return new FileRepo(user);
}
