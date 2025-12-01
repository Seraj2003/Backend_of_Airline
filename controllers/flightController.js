const db = require('../config/db.js')
const getFlight = async (req, res) => {
    const { source, destination, jurneyDate } = req.body;
    if (!source || !destination || !jurneyDate) {

        return res.status(404).json({ success: false, message: 'Source, destination, and date are required' })
    }
    try {
        const flights = await db.query(
            `SELECT 
         flight_id,
         airline,
      flight_no, 
      source, 
      destination, 
      DATE(departure_time) AS departure_date, 
      arrival_time, 
      status ,
        economy_fare,
        business_fare,
        first_fare,
        total_seats_business,
        total_seats_first,
        total_seats_economy,
        booked_seats_business,
        booked_seats_first,
        booked_seats_economy
   FROM flights 
   WHERE source = ? 
     AND destination = ? 
    AND DATE(departure_time) = ? 
   `,
            [source, destination, jurneyDate]
        );

        const flight = flights[0]

        if (flight.length <= 0) return res.status(404).json({ success: false, message: "No flights found for the selected route and date" })

        res.status(200).json({ data: flight })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'Internal server error' })
    }
}
const getflightDetailByNo = async (req, res) => {
    const flight_no = req.body.flight_no;
    if (!flight_no) return res.status(401).json({ success: false, message: 'flight no is required' })
    try {
        const [flight] = await db.query(`SELECT flight_no, source, destination,
                DATE_FORMAT(departure_time, '%Y-%m-%d') AS departure_date,
                DATE_FORMAT(arrival_time, '%Y-%m-%d') AS arrival_date,
                TIME_FORMAT(departure_time, '%H:%i') AS departure_time,
                TIME_FORMAT(arrival_time, '%H:%i') AS arrival_time,
                status,
                airline,
                economy_fare,
                business_fare,
                first_fare,
                total_seats_business,
                total_seats_first,
                total_seats_economy,
                booked_seats_business,
                booked_seats_first,
                booked_seats_economy


         FROM flights 
         WHERE flight_no = ?`,
            [flight_no])
        // console.log(flight[0])
        if (!flight || flight.length === 0) return res.status(402).json({ success: false, message: "Not Found" })
        res.status(200).json({ success: true, data: flight[0] })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: 'Internal server error' + error })
    }
}
module.exports = { getFlight, getflightDetailByNo }