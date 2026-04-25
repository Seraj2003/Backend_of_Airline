const express = require ('express');
const { reserveFlight, confirmFlight , ticketView ,cancel, verifyCancelation, myBookings} = require('../controllers/bookingController.js');
const verifyToken = require('../middlewares/jwtVerification.js');
const router = express.Router()


router.post('/reserve', verifyToken, reserveFlight);
router.post('/confirm', verifyToken, confirmFlight);
//ticket view 
router.post('/ticket/detail',ticketView);
router.get('/myBookings',verifyToken,myBookings)


router.put('/ticket/cancel',verifyToken,cancel)

router.put('/ticket/cancel/byOTP',verifyToken, verifyCancelation)

module.exports= router;