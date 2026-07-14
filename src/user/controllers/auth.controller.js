import { access } from "node:fs";
import token, {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/token.js";
import jwt from "jsonwebtoken";

import bcrypt from "bcrypt";
import crypto from "crypto";

import emailverificationmodel from "../../models/emailverification.model.js";

// import CreateHashPassword from "../../utils/password.js";

// import verfilypass from "../../utils/password.js";
import {
  CreateHashPassword,
  CreateharhPassword,
  VerfiyPaswword,
} from "../../utils/password.js";


import sendEmail from "../../utils/email.js";
import UserModel from "../../models/User.model.js";
import UserProfile from "../../models/userprofile.model.js";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../../utils/email.js";
import {
  CloseLoginActivity,
  CreateLoginActivity,
} from "../../services/login-activity.service.js";

const normalizeEmail = (email = "") => String(email).trim().toLowerCase();

const hashPasswordResetToken = (resetToken) =>
  crypto.createHash("sha256").update(String(resetToken)).digest("hex");

const getPasswordResetTokenTtlMs = () => {
  const configuredMinutes = Number.parseInt(
    process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES,
    10,
  );
  const ttlMinutes =
    Number.isInteger(configuredMinutes) && configuredMinutes > 0
      ? Math.min(configuredMinutes, 1440)
      : 15;

  return ttlMinutes * 60 * 1000;
};

const generateReferralCode = (email) => {
  const prefix = String(email).split("@")[0].replace(/[^a-z0-9]/gi, "").slice(0, 4);
  return `${prefix}${crypto.randomBytes(3).toString("hex")}`.toUpperCase();
};

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findUserByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  return UserModel.findOne({
    email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: "i" },
  });
};

const getProfileDisplayName = (profile) => {
  if (!profile) return "";

  return (
    profile.fullName ||
    [profile.firstName, profile.middleName, profile.lastName]
      .filter(Boolean)
      .join(" ")
      .trim()
  );
};

const verifyStoredPassword = async (password, storedPassword) => {
  if (!password || !storedPassword) return false;

  if (await VerfiyPaswword(password, storedPassword)) return true;

  try {
    return await bcrypt.compare(password, storedPassword);
  } catch {
    return false;
  }
};

export const login = async (req, res) => {
  try {
    const { Email, Password } = req.body;
    const email = normalizeEmail(Email);

    // Validate input
    if (!email || !Password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        message: "Your account is blocked. Please contact support.",
      });
    }

    // Find user by email
    // const { data: user, error } = await supabase
    //   .from("UserModel")
    //   .select("*")
    //   .eq("Email", email)
    //   .single();

    // if (error || !user) {
    //   return res.status(401).json({
    //     message: "User not found in sql",
    //   });
    // }

    // Verify password

    const isPasswordValid = await verifyStoredPassword(Password, user.password);

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

    console.log(user);

    console.log(user.isVerified);

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);
    const activity = await CreateLoginActivity(req, user.id);
    const profile = await UserProfile.findOne({ userid: user.id }).select(
      "fullName firstName middleName lastName",
    );
    // const displayName = getProfileDisplayName(profile);

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,

        role: user.role,
      },
      token: {
        accessToken,
        refreshToken,
      },
      activityId: activity?._id || null,
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
    const { Email, Password, referralCode } = req.body;
    const email = normalizeEmail(Email);

    // 1. Validate request
    if (!email || !Password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // 2. Check if user already exists
    const existingUser = await CheckUser(email);

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const referrerProfile = referralCode
      ? await UserProfile.findOne({
          referralCode: String(referralCode).trim().toUpperCase(),
        })
      : null;

    if (referralCode && !referrerProfile) {
      return res.status(400).json({ message: "Invalid referral code" });
    }

    // 3. Hash password
    const hashedPassword = await CreateharhPassword(Password);

    // 4. Create user
    const user = await UserModel.create({
      email,
      password: hashedPassword,
      role: "user",
      isActive: true,
      isVerified: false,
    });

    if (!user) {
      return res.status(500).json({
        message: "User creation failed",
      });
    }

    await UserProfile.create({
      userid: user._id,
      referralCode: generateReferralCode(email),
      referredBy: referrerProfile?.userid || null,
    });

    // 5. Generate verification token
    const token = crypto.randomBytes(64).toString("hex");

    // 6. Save verification token
    const emailVerification = await emailverificationmodel.create({
      userId: user._id,
      token: token,
      email,
      isUsed: false,
      createdAt: new Date(),
    });

    if (!emailVerification) {
      return res.status(500).json({
        message: "Failed to create verification token",
      });
    }

    // 7. Verification link
    const verificationLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/verify-email?token=${token}`;

    // 8. Send verification email
    // await sendEmail(Email, token);

    await sendVerificationEmail(Email, token);

    // 9. Remove password from response
    const { password, ...userData } = user.toObject();

    // 10. Success response
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

export const logout = async (req, res) => {
  try {
    const activityId = req.body?.activityId;
    if (activityId) {
      await CloseLoginActivity(req.user.id, activityId);
    }

    return res.status(200).json({
      success: true,
      message: "Logout recorded successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

async function CheckUser(email) {
  try {
    const user = await findUserByEmail(email);

    return user;
  } catch (error) {
    console.log("DB Error:", error);
    return null;
  }
}

export const EmailVerfily = async (req, res) => {
  try {
    const token = req.headers["x-verification-token"];

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
    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const resetToken = crypto.randomBytes(64).toString("hex");
    const passwordResetTokenHash = hashPasswordResetToken(resetToken);
    const passwordResetTokenExpiresAt = new Date(
      Date.now() + getPasswordResetTokenTtlMs(),
    );

    // Use the native collection update so any legacy plaintext token is
    // removed even after the old Resettoken path is removed from the schema.
    await UserModel.collection.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetTokenHash,
          passwordResetTokenExpiresAt,
        },
        $unset: { Resettoken: "" },
      },
    );

    await sendPasswordResetEmail(user.email, resetToken);

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

    const hashedPassword = await CreateharhPassword(password);
    const passwordResetTokenHash = hashPasswordResetToken(resetToken);

    // Matching and clearing in one database operation prevents the same
    // one-time token from succeeding in two concurrent requests.
    const user = await UserModel.findOneAndUpdate(
      {
        passwordResetTokenHash,
        passwordResetTokenExpiresAt: { $gt: new Date() },
      },
      {
        $set: { password: hashedPassword },
        $unset: {
          passwordResetTokenHash: "",
          passwordResetTokenExpiresAt: "",
          Resettoken: "",
        },
      },
      { returnDocument: "after" },
    );

    if (!user) {
      return res.status(404).json({
        message: "Invalid or expired reset token",
      });
    }

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
    const refreshToken =
      req.body?.refreshToken ||
      req.query?.refreshToken ||
      req.headers["x-refresh-token"];

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const decoded = jwt.verify(refreshToken, process.env.refresh_token);

    const newAccessToken = generateAccessToken(decoded.id, decoded.role);
    const newRefreshToken = generateRefreshToken(decoded.id, decoded.role);

    return res.status(200).json({
      message: "Token refreshed successfully",

      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      token: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    return res.status(401).json({ message: error.message });
  }
};
