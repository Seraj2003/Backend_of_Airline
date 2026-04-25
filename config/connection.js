const IORedis = require("ioredis");
require("dotenv").config();

const connection = new IORedis(
   process.env.REDIS_URL,
  {
   concurrency: 10, 
   maxRetriesPerRequest: null
});

connection.on("connect", ()=>{
    console.log("redis connected")
})

module.exports = connection;