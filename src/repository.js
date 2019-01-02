const mongo = require("mongodb");

const config = require("../config");


class FileRepo {

	constructor(user) {
		this.user = user;
		this.db = config.get("DB.mongo.db")["uploader"]
		this.collection = this.db.collection("files");
	}

	getAll() {
		// return new Promise((resolve, reject) => {
			return this.collection.find({ user: this.user, status: { $ne: "deleted" } }).toArray();
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

	delete(id) {
		// return new Promise((resolve, reject) => {
		try {
			return this.collection.deleteOne({ user: this.user, $or: [{ name: id }, { _id: mongo.ObjectId(id) }] });
		} catch(err) {
			return this.collection.deleteOne({ user: this.user, name: id });
		}
			
		/*
			return this.updateOne(
				{ user: this.user, name: id },
				{ $set: {
					status: "deleted",
					updated: Date.now()
				}}
			);
			*/
		// });
	}
}

module.exports = function(user) {
	return new FileRepo(user);
}
