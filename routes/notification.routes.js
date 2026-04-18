const router = require('express').Router();
const { sendNotificationToUser } = require("../controllers/notification.controller.js");

router.post("/send", sendNotificationToUser);

module.exports = router;