const http = require("http");
const socket_server = require("socket.io");

const boot = require("./boot");
const settings = require("./settings");

	
var router = require("./src/router");
 
var Files = {};
 
function handler (req, res) {
	fs.readFile(__dirname + '/index.html', function (err, data) {
		if (err) {
			res.writeHead(500);
			return res.end('Error loading index.html');
		}
		res.writeHead(200);
		res.end(data);
	});
}

function mountRoutes(app) {
	for(let prefix in router.routes) {
		app.use("/" + prefix, router.routes[prefix]);
	}
}
 
function mountSockets(io) {
	for(let prefix in router.sockets) {
		// console.log(router.sockets, prefix);
		router.sockets[prefix](io.of(prefix))
	}

}

function gracefulExitHandler() {
	let signals = ["SIGHUP", "SIGINT", "SIGQUIT", "SIGABRT", "SIGTERM"]
	for(let i in signals){
		let signal = signals[i];
		process.on(signal, () => {
			console.log("Signal", signal);
			for(let Name in Files) {
				// Lock file for writting
			}
			process.exit();
		});
	}
}


boot((err, app) => {
	// if(err !== undefined || err !== null) {
	if(err) {
		console.log("Error", err, err !== null, err !== undefined);
		process.exit(1);
	}

	mountRoutes(app);
	const server= http.createServer(app);
	let io = socket_server.listen(server);
	mountSockets(io);
	// errorHandler();
	// gracefulExitHandler();
	let port = settings.PORT || 3001;
	server.listen(port, (err) => {
		if(err) {
			return console.log("Error", err);
		}
		return console.log(`server is listening on ${port}`)
	});
});
