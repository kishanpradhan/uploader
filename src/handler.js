const fs = require("fs"),
	config = require("../config"),
	File = require("./file").File,
	Uploader = require("./file").Uploader,
	repo = require("./repository")


function respond(res, data, code = 200, message = ""){
	let sendData = {
		"status": "failure",
		"code": code,
		"data": {},
		"message": ""
	}
	if (code == "200") {
		sendData["status"] = "success";
		sendData["data"] = data
	} else {
		sendData["message"] = message;
	}

	res.json(sendData);
}

exports.serveStatic = function(req, res) {
	fs.readFile(__dirname + '/index.html', function (err, data) {
		if (err) {
			res.writeHead(500);
			return res.end('Error loading index.html');
		}
		res.writeHead(200);
		res.end(data);
	});
}

exports.FileHandler = function(req, res) {
	let promise;
	if(req.method.toLowerCase() == "get") {
		promise = repo(req.query.user).getAll();
	} else if(req.method.toLowerCase() == "post") {
		let file = new File(user, data['Name'], data['Size']);
		let uploader = new Uploader(user, file);
		promise = uploader.start();
	}
	promise.then((data) => {
		respond(res, data);
	}).catch((err) => {
		respond(res, "", 500, err.messsage || err);
	});
}

exports.SingleFileHandler = function(req, res) {
	let promise;
	if(req.method.toLowerCase() == "delete") {
		new File(req.query.user, req.params.id).delete();
		promise = repo(req.query.user).delete(req.params.id);
	} else if(req.method.toLowerCase() == "post") {
		promise = repo.update(req.query.user);
	}
	promise.then((data) => {
		respond(res, data);
	}).catch((err) => {
		respond(res, "", 500, err);
	});
}

let Files = {};
exports.socketHandler = function(io) {
	// console.log(io.use);
	io.use(function(socket, next) {
		if (socket.handshake.query.user) return next();
		next(new Error('No auth. Please provide a user.'));
	});

	io.on('connection', function (socket) {
		let user = socket.handshake.query.user;
		console.log("Socket connected", user);

		socket.on('Start', function (data) { //data contains the variables that we passed through in the html file
			console.log("Starting file upload", data);
			let file = new File(user, data['Name'], data['Size']);
			let uploader = new Uploader(user, file);
			uploader.start().then((res) => {
				console.log("RESUT", res);
				// let Place = Stat.size / 524288;
				socket.emit('MoreData', { 'Place' : res.cursor, Percent : res.progress });
			}).catch((err) => {
				console.log("Error", err);
				socket.emit('Error', err);
			});
		});

		socket.on('Upload', function (data){
			// console.log("Uploading file", data['Name']);
			
			let file = new File(user, data['Name'], data['Size']);
			let uploader = new Uploader(user, file);
			uploader.upload(data).then((res) => {
				if(res.Percent == 100) {
					socket.emit("Done", "url_to_file");
				} else {
					socket.emit('MoreData', res);
				}
			}).catch((err) => {
				console.log("Error", err);
				socket.emit('Error', err);
			});
		});

		socket.on('disconnect', function (reason){
			console.log("Disconnected", user, reason);
		});
	});
}

exports.adminSocketHandler = function(io) {
	io.on('connection', function (socket) {
		console.log("Admin socket connection");
		socket.on('Stats', function (data) { //data contains the variables that we passed through in the html file
			console.log("Get statistics");
		});
	});
}
