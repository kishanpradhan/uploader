let router = require("express").Router()
let handler = require("./handler")

router.get("/", handler.serveStatic);
router.get("/files", handler.fileHandler);
// router.post("/files", handler.serveStatic);
// router.post("/files/:id", handler.serveStatic);

module.exports = {
	routes: {
		"": router
	},
	sockets: {
		"/": handler.socketHandler,
		"/admin": handler.adminSocketHandler
	}
}
