import { access } from "node:fs";
import token, {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/token.js";
import jwt from "jsonwebtoken";

import bcrypt from "bcrypt";
import crypto from "crypto";

import usermodel from "../Model/User.model.js";

// import CreateHashPassword from "../PasswordHash/password.js";

// import verfilypass from "../PasswordHash/password.js";
import {
  CreateHashPassword,
  CreateharhPassword,
  VerfiyPaswword,
} from "../PasswordHash/password.js";

import supabase from "../Database/db.js";

import sendEmail from "../utils/email.js";
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Find user by email
    const { data: user, error } = await supabase
      .from("UserModel")
      .select("*")
      .eq("Email", email)
      .single();

    console.log(user);

    if (error || !user) {
      return res.status(401).json({
        message: "User not found in sql",
      });
    }

    // Verify password
    const isPasswordValid = await VerfiyPaswword(password, user.Password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Generate tokens

    if (user.isVerified === false) {
      return res.status(401).json({
        message: "User not verified",
      });
    }
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

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
    const { FullName, Email, Password, role } = req.body;

    // 1. Validation
    if (!FullName || !Email || !Password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2. Check user exists
    if (await CheckUser(Email)) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // console.log(CheckUser(Email));

    // 3. Hash password
    const hashedPassword = await CreateharhPassword(Password);

    // 4. Create user
    const { data: userData, error: userError } = await supabase
      .from("UserModel")
      .insert({
        Fullname: FullName,
        Email: Email,
        Password: hashedPassword,
        Role: role,
        isVerified: false,
      })
      .select()
      .single();

    if (userError) {
      return res.status(500).json({
        message: "User creation failed",
        error: userError,
      });
    }

    // 5. Generate token
    const token = crypto.randomBytes(64).toString("hex");

    // 6. Save token
    const { error: tokenError } = await supabase
      .from("EmailVerification")
      .insert({
        Userid: userData.id, // FIXED (important)
        email: Email,
        token: token,
        isUsed: false, 
      });

    if (tokenError) {
      return res.status(500).json({
        message: "Token creation failed",
        error: tokenError,
      });
    }

    // 7. Create verification link
    const verificationLink = `http://localhost:5000/auth/verify-email?token=${token}`;

    // 8. Send EMAIL (FIXED)
    await sendEmail(Email, token);

    console.log("Verification Token:", token);

    // 9. Response
    return res.status(201).json({
      message: "User created successfully. Verify email.",
      user: userData,
      verificationLink: verificationLink,
    });
  } catch (ex) {
    console.log(ex);
    return res.status(500).json({ message: ex.message });
  }
};

async function CheckUser(email) {
  try {
    const { data, error } = await supabase
      .from("UserModel")
      .select("*")
      .eq("Email", email)
      .single(); // ✅ correct

    if (error) {
      console.log("DB Error:", error);
      return false;
    }

    if (!data) {
      return false;
    }

    return true;
  } catch (ex) {
    console.log(ex);
    return false;
  }
}

export const EmailVerfily = async (req, res) => {
  try {
    const token = req.headers["x-verification-token"];

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const { data: tokenData, error: tokenError } = await supabase
      .from("EmailVerification")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      return res.status(400).json({ message: "Invalid token" });
    }

    if (tokenData.isUsed == true) {
      return res.status(400).json({ message: "Already verified" });
    }

    const { error: userdata } = await supabase
      .from("UserModel")
      .update({
        isVerified: true,
      })
      .eq("id", tokenData.Userid);

    console.log(userdata);

    if (userdata) {
      res.status(400).json({ message: userdata.message });
    }

    const { error: tokenUpdateError } = await supabase
      .from("EmailVerification")
      .update({
        isUsed: true,
      })
      .eq("token", token);

    if (tokenUpdateError) {
      return res.status(400).json({
        message: tokenUpdateError.message,
      });
    }

    return res.status(200).json({
      message: "Email verified successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const ForgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    console.log(email);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await supabase
      .from("UserModel")
      .select("*")
      .eq("Email", email)
      .single();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resttoken = crypto.randomBytes(64).toString("hex");

    await supabase
      .from("UserModel")
      .update({ Resettoken: resttoken })
      .eq("Email", email);

    await sendEmail(email, resttoken);
    return res.status(200).json({ message: "Reset email sent!" });
  } catch (ex) {}
};

export const ResetPassword = async (req, res) => {
  try {
    const { resettoken, password } = req.body;

    if (!resettoken || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    console.log(resettoken);

    const { data: user, error } = await supabase
      .from("UserModel")
      .select("*")
      .eq("Resettoken", resettoken)
      .single();

    console.log(user);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // const newpassword = await CreateHashPassword(password);

    await supabase
      .from("UserModel")
      .update({
        Password: password,
        Resettoken: null,
      })
      .eq("Resettoken", resettoken);

    return res.status(200).json({ message: "Password reset successfully!" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const RefreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const decoded = jwt.verify(refreshToken, process.env.refresh_token);

    const newAccessToken = generateAccessToken(decoded.id);

    return res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
