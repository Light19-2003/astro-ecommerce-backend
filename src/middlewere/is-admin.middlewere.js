import jwt from "jsonwebtoken";

export const isAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Token is required",
      });
    }
    // console.log(req.headers);
    // console.log(req.headers.authorization);

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.acess_token);

    console.log(decoded.role);

    if (decoded.role !== "admin") {
      return res.status(401).json({
        message: "You are not admin",
      });
    }

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};
