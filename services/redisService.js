const redisClient = require("../config/redis");


async function getCache(key){
  const data = await redisClient.get(key);
  return data ? JSON.stringify(data) : null;
}


async function setCache( key, value,tlt=36000) {
    await redisClient.set(key, JSON.stringify(value),{EX: tlt});
}

module.exports= {setCache,getCache}