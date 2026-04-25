const { createClient } = require("redis");
require("dotenv").config();

const client = createClient({
 url: process.env.REDIS_URL
});

client.on("error", (err) => console.log("Redis error:", err));

async function connectRedis() {
    try {
        await client.connect();
        console.log("redis connected")
    } catch (error) {
        console.log("redis connection error: ", error)
    }
}
connectRedis();

module.exports = client;