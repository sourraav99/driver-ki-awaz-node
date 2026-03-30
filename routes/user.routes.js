const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");

router.get("/:userId/dashboard", userController.getUserDashboard);

module.exports = router;
