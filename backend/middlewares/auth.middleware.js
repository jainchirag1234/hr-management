import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized - Token missing" });
  }

  const token = authHeader.split(" ")[1];

  if (!token || token === "undefined" || token === "null") {
    return res
      .status(401)
      .json({ message: "Not authorized - Invalid token format" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("❌ JWT_SECRET is not defined in environment variables!");
    return res.status(500).json({ message: "Server configuration error" });
  }

  try {
    const decoded = jwt.verify(token, secret);
    const userId = decoded.id || decoded._id;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res
        .status(401)
        .json({ message: "Not authorized - User not found" });
    }

    req.user = user; // ab firstName, lastName, email, role sab available honge

    next();
  } catch (error) {
    console.error("❌ JWT Error:", error.name, "-", error.message);

    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Token expired - Please login again" });
    }

    return res
      .status(401)
      .json({ message: "Invalid Token - Please login again" });
  }
};

export default protect;
