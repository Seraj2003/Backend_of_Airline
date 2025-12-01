const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  try {
    // Get token from cookies (not usually in Bearer format)
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Token required" });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.SECRET);
    req.user = decoded; // attach user info to request

    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}

module.exports = verifyToken;
