// const cron = require("node-cron");
// const db = require ( "../config/db.js");

// cron.schedule("*/5 * * * *", async () => {
//   try {
//     await db.execute(`
//       UPDATE flights
//       SET status = 'DEPARTED'
//       WHERE status IN ('ON_TIME','DELAYED')
//       AND departure_time <= NOW()
//     `);

//     await db.query(`
//       UPDATE flights
//       SET status = 'LANDED'
//       WHERE status = 'DEPARTED'
//       AND arrival_time <= NOW()
//     `);

//     console.log("✈ Flight statuses auto-updated");
//   } catch (err) {
//     console.error("Cron error:", err);
//   }
// });
