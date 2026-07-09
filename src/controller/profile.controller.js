import sharp from "sharp";
import path from "path";
import fs from "fs";

import userprofile from "../Model/userprofile.model.js";

import supabase from "../Database/db.js";

export const UserProfileController = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      phoneNumber,
      gender,
      dob,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      country,
    } = req.body;

    const userId = req.user.id;

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !phoneNumber ||
      !addressLine1 ||
      !city ||
      !state ||
      !pincode
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields.",
      });
    }

    // Check if profile already exists
    const existingProfile = await userprofile.findOne({
      userid: userId,
    });

    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: "Profile already exists.",
      });
    }

    let avatarPath = "";

    // Process image if uploaded
    if (req.file) {
      const uploadDir = path.join(process.cwd(), "uploads");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `${Date.now()}.webp`;
      avatarPath = path.join(uploadDir, fileName);

      await sharp(req.file.buffer)
        .resize(500, 500)
        .webp({ quality: 80 })
        .toFile(avatarPath);
    }

    const profile = await userprofile.create({
      userid: userId,
      firstName,
      middleName,
      lastName,
      phoneNumber,
      gender,
      dob,

      // Remove this line if avatar is not in your schema
      avatar: avatarPath,

      address: {
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        country: country || "India",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Profile created successfully.",
      data: profile,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const GetProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        message: "UserId is required",
      });
    }

    // Find profile in MongoDB
    const profile = await userprofile.findOne({
      userid: userId,
    });

    console.log("profile:", profile);

    // if (!profile) {
    //   return res.status(404).json({
    //     message: "Profile not found",
    //   });
    // }

    if (!profile) {
      return res.status(200).json({
        success: true,
        message: "Profile not created yet",
        data: null,
      });
    }

    return res.status(200).json({
      message: "Profile fetched successfully",
      data: profile,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

export const UpdateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      firstName,
      middleName,
      lastName,
      phoneNumber,
      gender,
      dob,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      country,
    } = req.body;

    const profile = await userprofile.findOne({ userid: userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    profile.firstName = firstName ?? profile.firstName;
    profile.middleName = middleName ?? profile.middleName;
    profile.lastName = lastName ?? profile.lastName;
    profile.phoneNumber = phoneNumber ?? profile.phoneNumber;
    profile.gender = gender ?? profile.gender;
    profile.dob = dob ?? profile.dob;

    profile.address.addressLine1 = addressLine1 ?? profile.address.addressLine1;

    profile.address.addressLine2 = addressLine2 ?? profile.address.addressLine2;

    profile.address.city = city ?? profile.address.city;

    profile.address.state = state ?? profile.address.state;

    profile.address.pincode = pincode ?? profile.address.pincode;

    profile.address.country = country ?? profile.address.country;

    // Update image only if avatar exists in schema
    if (req.file) {
      const uploadDir = path.join(process.cwd(), "uploads");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `${Date.now()}.webp`;
      const filePath = path.join(uploadDir, fileName);

      await sharp(req.file.buffer)
        .resize(500, 500)
        .webp({ quality: 80 })
        .toFile(filePath);

      profile.avatar = filePath;
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: profile,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const SingleFieldProfileUpdate = async (req, res) => {
  try {
    const userId = req.user.id;

    const updates = {};

    if (req.body.firstName !== undefined)
      updates.firstName = req.body.firstName;

    if (req.body.middleName !== undefined)
      updates.middleName = req.body.middleName;

    if (req.body.lastName !== undefined) updates.lastName = req.body.lastName;

    if (req.body.phoneNumber !== undefined)
      updates.phoneNumber = req.body.phoneNumber;

    if (req.body.gender !== undefined) updates.gender = req.body.gender;

    if (req.body.dob !== undefined) updates.dob = req.body.dob;

    if (req.body.addressLine1 !== undefined)
      updates["address.addressLine1"] = req.body.addressLine1;

    if (req.body.addressLine2 !== undefined)
      updates["address.addressLine2"] = req.body.addressLine2;

    if (req.body.city !== undefined) updates["address.city"] = req.body.city;

    if (req.body.state !== undefined) updates["address.state"] = req.body.state;

    if (req.body.pincode !== undefined)
      updates["address.pincode"] = req.body.pincode;

    if (req.body.country !== undefined)
      updates["address.country"] = req.body.country;

    // Upload image only if avatar exists in schema
    if (req.file) {
      const uploadDir = path.join(process.cwd(), "uploads");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `${Date.now()}.webp`;
      const filePath = path.join(uploadDir, fileName);

      await sharp(req.file.buffer)
        .resize(500, 500)
        .webp({ quality: 80 })
        .toFile(filePath);

      updates.avatar = filePath;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided for update.",
      });
    }

    const updatedProfile = await userprofile.findOneAndUpdate(
      { userid: userId },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedProfile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updatedProfile,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
