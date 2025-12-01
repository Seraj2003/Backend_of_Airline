const express = require('express');
const router = express.Router();
const { getFlight, getflightDetailByNo } = require('../controllers/flightController.js')


router.post('/', getFlight)
// this route only for admin to schedule new flights
router.post('/detail', getflightDetailByNo)

module.exports = router;