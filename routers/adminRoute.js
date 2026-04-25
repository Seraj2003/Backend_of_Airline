const express = require("express");

const router = express.Router()
const verifyToken = require("../middlewares/jwtVerification.js");
const { login, scheduleFlight } = require("../controllers/adminController.js");



router.post('/login', login);
router.post("/schedule/flight", verifyToken,scheduleFlight)
module.exports = router;

// Admin login route
// This route allows an admin to log in and receive a JWT token for authentication.