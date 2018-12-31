const util = require("util"),
	config = require("../config");

class Cache {

	constructor(db_name = 0) {
		/*
		if(!config.CACHE.db[db_name]) {
			throw new Error(db_name + " is not connected");
		}
		this.conn = config.CACHE.db[db_name];
		*/
		this.conn = config.get("CACHE.db");// config.CACHE.db;
	}

	async execute(func, ...args) {
		// if(!this.conn.hasOwnProperty(func)){
		if(!this.conn[func]){
			throw new Error(`'${func}' is not a function of RedisClient`);
		}
		let asyncF = util.promisify(this.conn[func]).bind(this.conn);
		return await asyncF.call(null, ...args);
	}
}

module.exports = function(db_name) {
	return new Cache(db_name);
}
