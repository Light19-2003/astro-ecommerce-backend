import jwt from "jsonwebtoken";
import UserModel from "../../models/User.model.js";

export const isAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Token is required",
      });
    }
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    const decoded = jwt.verify(token, process.env.acess_token);

    if (decoded.role !== "admin") {
      return res.status(403).json({
        message: "You are not admin",
      });
    }

    const user = await UserModel.findById(decoded.id).select("role isActive");

    if (!user || user.role !== "admin" || user.isActive === false) {
      return res.status(403).json({
        message: "Admin access denied",
      });
    }

    req.user = {
      ...decoded,
      role: user.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};
