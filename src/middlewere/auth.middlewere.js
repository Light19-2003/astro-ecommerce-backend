import jwt from "jsonwebtoken";

export const TokenVerify = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Token is required",
      });
    }
    console.log(req.headers);
console.log(req.headers.authorization);

    const token = authHeader.split(" ")[1];

    console.log(token);

    const decoded = jwt.verify(token, process.env.acess_token);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};
