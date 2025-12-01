const express = require ('express');
const { bookflight , ticketView ,cancel, verifyCancelation, myBookings} = require('../controllers/bookingController.js');
const verifyToken = require('../middlewares/jwtVerification.js');
const router = express.Router()

router.post('/book', verifyToken, bookflight);
//ticket view 
router.post('/ticket/detail',ticketView);
router.get('/myBookings',verifyToken,myBookings)


router.put('/ticket/cancel',verifyToken,cancel)

router.put('/ticket/cancel/byOTP',verifyToken, verifyCancelation)

module.exports= router;