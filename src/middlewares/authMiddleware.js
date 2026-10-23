// middleware to authenticate JWT tokens

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: "Not authorized" });
  }

  const token = header.startsWith("Bearer ") ? header.split(" ")[1] : header;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  try {
    const user = await User.findById(decoded.id).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }
    if (user.isBanned) {
      return res.status(403).json({ message: "Account has been banned" });
    }

    req.user = user;
    req.user.id = user._id.toString();
    next();
  } catch (err) {
    return res.status(500).json({ message: err.message || "Authentication error" });
  }
};

module.exports = authMiddleware;

