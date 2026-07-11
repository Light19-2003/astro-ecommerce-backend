import { access } from "node:fs";
import token, {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/token.js";
import jwt from "jsonwebtoken";

import bcrypt from "bcrypt";
import crypto from "crypto";

import usermodel from "../Model/User.model.js";

import emailverificationmodel from "../Model/emailverification.model.js";

// import CreateHashPassword from "../PasswordHash/password.js";

// import verfilypass from "../PasswordHash/password.js";
import {
  CreateHashPassword,
  CreateharhPassword,
  VerfiyPaswword,
} from "../PasswordHash/password.js";

// import supabase from "../Database/db.js";

import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../utils/email.js";
import UserModel from "../Model/User.model.js";
export const login = async (req, res) => {
  try {
    const { Email, Password } = req.body;

    // Validate input
    if (!Email || !Password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await usermodel.findOne({ email: Email });

    console.log(user);
    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    // Find user by email
    // const { data: user, error } = await supabase
    //   .from("UserModel")
    //   .select("*")
    //   .eq("Email", email)
    //   .single();

    console.log(user);

    // if (error || !user) {
    //   return res.status(401).json({
    //     message: "User not found in sql",
    //   });
    // }

    // Verify password

    console.log(user.password);
    console.log(Password);
    const isPasswordValid = await VerfiyPaswword(Password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Generate tokens

    // if (user.isVerified === false) {
    //   return res.status(401).json({
    //     message: "User not verified",
    //   });
    // }
    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    console.log(user.role);

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.Email,
        role: user.role,
      },
      token: {
        accessToken,
        refreshToken,
      },
    });
  } catch (ex) {
    console.error(ex);

    return res.status(500).json({
      message: ex.message,
    });
  }
};

export const CreateUser = async (req, res) => {
  try {
    const { Email, Password, role } = req.body;

    // 1. Validate request
    if (!Email || !Password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // 2. Check if user already exists
    const existingUser = await CheckUser(Email);

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // 3. Hash password
    const hashedPassword = await CreateharhPassword(Password);

    // 4. Create user
    const user = await UserModel.create({
      email: Email,
      password: hashedPassword,
      role: role,
      isActive: false,
      isVerified: false,
    });

    if (!user) {
      return res.status(500).json({
        message: "User creation failed",
      });
    }

    // 5. Generate verification token
    const token = crypto.randomBytes(64).toString("hex");

    // 6. Save verification token
    const emailVerification = await emailverificationmodel.create({
      userId: user._id,
      token: token,
      email: Email,
      isUsed: false,
      createdAt: new Date(),
    });

    if (!emailVerification) {
      return res.status(500).json({
        message: "Failed to create verification token",
      });
    }

    // 7. Send verification email
    await sendVerificationEmail(Email, token);

    // 8. Remove password from response
    const { password, ...userData } = user.toObject();

    // 9. Success response
    return res.status(201).json({
      message: "User created successfully. Please verify your email.",
      user: userData,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

async function CheckUser(email) {
  try {
    const user = await UserModel.findOne({ email });

    return user;
  } catch (error) {
    console.log("DB Error:", error);
    return null;
  }
}

export const EmailVerfily = async (req, res) => {
  try {
    const token =
      req.headers["x-verification-token"] || req.query.token || req.body.token;

    if (!token) {
      return res.status(400).json({
        message: "Token is required",
      });
    }

    // Find verification token
    const emailVerification = await emailverificationmodel.findOne({ token });

    if (!emailVerification) {
      return res.status(400).json({
        message: "Invalid token",
      });
    }

    if (emailVerification.isUsed) {
      return res.status(400).json({
        message: "Email already verified",
      });
    }

    // Update user
    const user = await UserModel.findByIdAndUpdate(
      emailVerification.userId,
      {
        isVerified: true,
        isActive: true,
      },
      { new: true },
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Mark token as used
    await emailverificationmodel.findByIdAndUpdate(emailVerification._id, {
      isUsed: true,
      token: null,
    });

    return res.status(200).json({
      message: "Email verified successfully",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

export const ForgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    // Find user
    const user = await UserModel.findOne({ email });

    console.log(user);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(64).toString("hex");

    // Save token
    user.Resettoken = resetToken;

    await user.save();

    // Send email
    await sendPasswordResetEmail(email, resetToken);

    return res.status(200).json({
      message: "Password reset email sent successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: error.message,
    });
  }
};
export const ResetPassword = async (req, res) => {
  try {
    const { resetToken, password } = req.body;

    // Validate request
    if (!resetToken || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // Find user by reset token
    const user = await UserModel.findOne({
      Resettoken: resetToken,
    });

    console.log(user);

    if (!user) {
      return res.status(404).json({
        message: "Invalid or expired reset token",
      });
    }

    // Check token expiration

    // Hash new password
    const hashedPassword = await CreateharhPassword(password);

    // Update user
    user.password = hashedPassword;
    user.Resettoken = null;

    await user.save();

    return res.status(200).json({
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

export const RefreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const decoded = jwt.verify(refreshToken, process.env.refresh_token);

    const newAccessToken = generateAccessToken(decoded.id, decoded.role);

    return res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
