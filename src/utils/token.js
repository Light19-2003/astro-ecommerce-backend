import jwt from "jsonwebtoken";

export const generateAccessToken = (id, role) => {
  try {
    if (!process.env.acess_token) {
      return console.log("Please add access token in .env file");
    }

    return jwt.sign({ id, role }, process.env.acess_token, {
      expiresIn: "15m",
    });
  } catch (error) {
    console.log("Access Token Error:", error);
  }
};

export const generateRefreshToken = (id, role) => {
  try {
    return jwt.sign({ id, role }, process.env.refresh_token, {
      expiresIn: "7d",
    });
  } catch (error) {
    console.log("Refresh Token Error:", error);
  }
};

export default { generateAccessToken, generateRefreshToken };
