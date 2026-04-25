const express = require('express');
const verifyToken = require('../middlewares/jwtVerification.js');
const { getAllCrewMembers, addNewCrewMember, login, assignCrewToFlight } = require('../controllers/crewController.js');
const router = express.Router();



router.post('/assign', verifyToken, addNewCrewMember)
router.post('/login', login);
router.post('/schedule', assignCrewToFlight)

router.get('/all' /*, verifyToken */, getAllCrewMembers);
module.exports = router;