const geoip = require('geoip-lite')
const responsetime = (req, res, next) => {
    const Startime = Date.now();
    const userId = req.userId ? req.user.id : "Guest"
    const geo = geoip.lookup(req.ip);
    req.geo = geo;
    res.on("finish", () => {
        const duration = Date.now() - Startime;
        console.log(`${userId} - ${req.originalUrl} - ${duration}ms \n ${geo}`)
    })
    next()
};

const ErrorMonotering = (err, req, res, next) => {
    console.log(err.message);
    res.status(500).send("Internal Server Error");
    next();
}

module.exports = { responsetime, ErrorMonotering };