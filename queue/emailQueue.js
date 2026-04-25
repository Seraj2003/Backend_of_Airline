const { Queue } = require("bullmq");
const connection = require("../config/connection");


const emailQueue = new Queue("emailQueue", { connection })



module.exports= emailQueue;