let router = require("express").Router()
let handler = require("./handler")

router.get("/", handler.serveStatic);

module.exports = {
	routes: {
		"": router
	},
	sockets: {
		"/": handler.socketHandler,
		"/admin": handler.adminSocketHandler
	}
}
