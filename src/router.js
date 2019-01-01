let router = require("express").Router()
let handler = require("./handler")

router.get("/", handler.serveStatic);
router.get("/files", handler.FileHandler);
// router.post("/files", handler.serveStatic);
router.delete("/files/:id", handler.SingleFileHandler);

module.exports = {
	routes: {
		"": router
	},
	sockets: {
		"/": handler.socketHandler,
		"/admin": handler.adminSocketHandler
	}
}
