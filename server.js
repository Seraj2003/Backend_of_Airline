const express = require('express');
const dotenv = require('dotenv').config();
const statusMonitor = require('express-status-monitor');
const { responsetime, ErrorMonotering }= require('./middlewares/monotering.js');
require("./cron/flightStatusCron.js");
const cookieParser = require('cookie-parser');
const authRouter = require('./routers/authRouter.js');
const userRouter = require('./routers/userRouter.js');
const flightRouter = require('./routers/flightRouter.js');
const PaymentRoute = require("./routers/payment.js");
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const bookingRouter = require('./routers/bookingRouter.js');
const adminRouter = require('./routers/adminRoute.js');
const crewRouter = require('./routers/crewRouter.js')
const db = require('./config/db.js');

//redis database
const redisClient = require("./config/redis.js")
const app = express()

const PORT = process.env.PORT;

//middlewares 

app.use(express.json());

app.use(express.urlencoded({ extended: true }));
// app.use(morgan("combined"))

app.use(cookieParser())
app.use(statusMonitor())


app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
}));
app.use(compression());
app.use(responsetime);
app.use(ErrorMonotering)

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));




//Authentication and user management
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
//flight management 
app.use('/api/flight', flightRouter);
// booking system

app.use("/api/payment", PaymentRoute)
app.use('/api/booking', bookingRouter);
//crew 
app.use('/crew', crewRouter);

app.use('/admin', adminRouter)

app.get("/redis-test", async (req, res) => {

  await redisClient.set("name", "Seraj");

  const data = await redisClient.get("name");

  res.send(data);

});

app.get("/dashboard", async (req, res) => {
  try {
    // ===== Revenue =====
//     const [[revenue]] = await db.query(
//       `SELECT IFNULL(SUM(total_fare),0) AS total
// FROM bookings
// WHERE status = 'confirmed';`

//     );

    // ===== Flights Today =====
    const [[flightsToday]] = await db.query(`
      SELECT COUNT(*) AS count
      FROM flights
      WHERE DATE(departure_time) = CURDATE()
    `);

    // ===== New Bookings (last 24h) =====
    const [[bookings]] = await db.query(`
      SELECT COUNT(*) AS count
      FROM bookings
      WHERE created_at >= NOW() - INTERVAL 1 DAY
    `);

    // ===== Active Users =====
    const [[users]] = await db.query(`
      SELECT COUNT(*) AS count
      FROM users
      WHERE status = 'ACTIVE'
    `);

    // ===== Revenue Chart =====
    // const [revenueChart] = await db.query(`
    //   SELECT MONTHNAME(created_at) AS month,
    //          SUM(amount) AS amount
    //   FROM payments
    //   WHERE status = 'SUCCESS'
    //   GROUP BY MONTH(created_at)
    //   ORDER BY MONTH(created_at)
    // `);

    // ===== Flight Status =====
    const [[onTime]] = await db.query(`SELECT COUNT(*) AS c FROM flights WHERE status='SCHEDULED'`);
    const [[delayed]] = await db.query(`SELECT COUNT(*) AS c FROM flights WHERE status='DELAYED'`);
    const [[cancelled]] = await db.query(`SELECT COUNT(*) AS c FROM flights WHERE status='CANCELLED'`);

    const totalFlights = onTime.c + delayed.c + cancelled.c;

    res.json({
      // revenue: {
      //   total: revenue.total,
      //   growth: 12 // can calculate month-over-month later
      // },
      flightsToday: flightsToday.count,
      newBookings: bookings.count,
      activeUsers: users.count,

      charts: {
        // revenueOverview: revenueChart,
        flightPerformance: {
          onTime: Math.round((onTime.c / totalFlights) * 100),
          delayed: Math.round((delayed.c / totalFlights) * 100),
          cancelled: Math.round((cancelled.c / totalFlights) * 100)
        }
      },

      // todayActivity: [
      //   { text: "42 new bookings", time: "3 mins ago" },
      //   { text: "12 flights departed", time: "10 mins ago" },
      //   { text: "8 flights landed", time: "20 mins ago" },
      //   { text: "5 new user registrations", time: "1 hour ago" }
      // ]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Dashboard data error" });
  }
});



console.log(PORT)
app.listen(PORT, () => {
    console.log(`server running on http//localhost:${PORT}`)
})