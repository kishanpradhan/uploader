const fs = require("fs"),
	config = require("../config"),
	File = require("./file").File,
	Uploader = require("./file").Uploader


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

let Files = {};
exports.socketHandler = function(io) {
	io.on('connection', function (socket) {
		let user = "kishan";
		socket.on('Start_old', function (data) { //data contains the variables that we passed through in the html file
			console.log("Starting file upload");
			var Name = data['Name'];
			Files[Name] = {  //Create a new Entry in The Files Variable
				FileSize : data['Size'],
				Data     : "",
				Downloaded : 0
			}
			var Place = 0;
			try{
				var Stat = fs.statSync('Temp/' +  Name);
				if(Stat.isFile()) {
					Files[Name]['Downloaded'] = Stat.size;
					Place = Stat.size / 524288;
				}
			} catch(er){} //It's a New File
			fs.open("Temp/" + Name, "a", 0755, function(err, fd){
				if(err) {
					console.log(err);
				} else {
					Files[Name]['Handler'] = fd; //We store the file handler so we can write to it later
					console.log("Place = ", Place);
					socket.emit('MoreData', { 'Place' : Place, Percent : 0 });
				}
			});
		});
		socket.on('Start', function (data) { //data contains the variables that we passed through in the html file
			console.log("Starting file upload", data);
			let file = new File(data['Name']);
			console.log("Starting file upload");
			let uploader = new Uploader(user, file);
			console.log("Starting file upload");
			uploader.start().then((res) => {
				console.log("RESUT", res);
			}).catch((err) => {
				console.log("Error", err);
				socket.emit('Error', err);
			});
			console.log("Starting file upload");


			/*
			var Name = data['Name'];
			Files[Name] = {  //Create a new Entry in The Files Variable
				FileSize : data['Size'],
				Data     : "",
				Downloaded : 0
			}
			var Place = 0;
			try{
				var Stat = fs.statSync('Temp/' +  Name);
				if(Stat.isFile()) {
					Files[Name]['Downloaded'] = Stat.size;
					Place = Stat.size / 524288;
				}
			} catch(er){} //It's a New File
			fs.open("Temp/" + Name, "a", 0755, function(err, fd){
				if(err) {
					console.log(err);
				} else {
					Files[Name]['Handler'] = fd; //We store the file handler so we can write to it later
					console.log("Place = ", Place);
					socket.emit('MoreData', { 'Place' : Place, Percent : 0 });
				}
			});
			*/
		});

		socket.on('Upload', function (data){
			var Name = data['Name'];
			console.log("Uploading file", Name);
			Files[Name]['Downloaded'] += data['Data'].length;
			Files[Name]['Data'] += data['Data'];
			if(Files[Name]['Downloaded'] == Files[Name]['FileSize']) //If File is Fully Uploaded
			{
				console.log("Done", config.QUEUE.db);
				config.QUEUE.db.call("broker.download", {
					file_name: Name, 
					data: Files[Name]['Data'],
					path: "Temp/"
				}, {});
				socket.emit("Done", "url_to_file");
				/*
				fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, Writen){
					//Get Thumbnail Here
					socket.emit("Done", "url_to_file");
				});
				*/
			}
			else if(Files[Name]['Data'].length > 10485760){ //If the Data Buffer reaches 10MB = 10485760 bytes
				config.QUEUE.db.call("broker.download", {
					file_name: Name, 
					data: Files[Name]['Data'],
					path: "Temp/"
				}, {});
				Files[Name]['Data'] = ""; //Reset The Buffer
				var Place = Files[Name]['Downloaded'] / 524288;
				var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
				socket.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
				/*
				fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, Writen){
					Files[Name]['Data'] = ""; //Reset The Buffer
					var Place = Files[Name]['Downloaded'] / 524288;
					var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
					socket.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
				});
				*/
			}
			else
			{
				var Place = Files[Name]['Downloaded'] / 524288;
				var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
				socket.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
			}
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
