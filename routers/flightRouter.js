const express = require('express');
const router = express.Router();
const { getFlight,getAllFlights , getflightDetailByNo } = require('../controllers/flightController.js')


router.post('/', getFlight)
// this route only for admin to schedule new flights
router.post('/detail', getflightDetailByNo)
router.get("/all", getAllFlights);
module.exports = router;