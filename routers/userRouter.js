const express = require('express');
const router= express.Router();
const  {getUser,DeleteUser, UpdateDetails}  = require ('../controllers/userController.js')
const verifyToken = require('../middlewares/jwtVerification.js')


router.get('/',verifyToken, getUser)
router.delete('/',verifyToken,DeleteUser)
router.put('/',verifyToken,UpdateDetails)

module.exports=router;