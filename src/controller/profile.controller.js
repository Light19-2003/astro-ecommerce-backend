import sharp from "sharp";
import path from "path";
import fs from "fs";

import userprofile from "../Model/userprofile.model.js";

import supabase from "../Database/db.js";

export const UserProfileController = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phoneNumber,
      dob,
      bio,
      middleName,
      gender,
      city,
      state,
      country,
    } = req.body;

    const userId = req.user.id;

    // 1. Validate required fields
    // if (!firstName || !lastName || !phoneNumber) {
    //   return res.status(400).json({
    //     message: "firstName, lastName, phoneNumber are required",
    //   });
    // }

    // 2. Check image
    if (!req.file) {
      return res.status(400).json({
        message: "Image is required",
      });
    }

    // 3. Ensure upload folder exists
    const uploadDir = "uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    // 4. Create filename
    const fileName = `${Date.now()}.webp`;
    const filePath = path.join(uploadDir, fileName);

    // 5. Process image with sharp
    await sharp(req.file.buffer)
      .resize(500, 500)
      .webp({ quality: 80 })
      .toFile(filePath);

    // 6. Generate full name
    const fullName = `${firstName} ${lastName}`;

    // 7. Create profile in MongoDB
    const profile = await userprofile.create({
      userid: userId,
      firstName,
      middleName,
      lastName,
      fullName,
      phoneNumber,
      bio,
      gender,
      dob,
      avatar: filePath,
      address: {
        city,
        state,
        country,
      },
    });

    // 8. Response
    return res.status(201).json({
      message: "Profile created successfully",
      data: profile,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
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

    const { firstName, lastName, phoneNumber, dob, bio, city, state, country } =
      req.body;

    // 1. Find existing profile
    const profile = await userprofile.findOne({ userid: userId });

    if (!profile) {
      return res.status(404).json({
        message: "Profile not found",
      });
    }

    // 2. Handle image (optional update)
    let avatarPath = profile.avatar;

    if (req.file) {
      const uploadDir = "uploads";

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
      }

      const fileName = `${Date.now()}.webp`;
      avatarPath = path.join(uploadDir, fileName);

      await sharp(req.file.buffer)
        .resize(500, 500)
        .webp({ quality: 80 })
        .toFile(avatarPath);
    }

    // 3. Update fields (only if provided)
    profile.firstName = firstName || profile.firstName;
    profile.lastName = lastName || profile.lastName;
    profile.phoneNumber = phoneNumber || profile.phoneNumber;
    profile.dob = dob || profile.dob;
    profile.bio = bio || profile.bio;

    profile.address = {
      city: city || profile.address?.city,
      state: state || profile.address?.state,
      country: country || profile.address?.country,
    };

    profile.avatar = avatarPath;

    // 4. Save updated profile
    const updatedProfile = await profile.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      data: updatedProfile,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: error.message,
    });
  }
};
export const SingleFieldProfileUpdate = async (req, res) => {
  try {
    const userId = req.user.id;

    const updates = {};

    // 1. Add fields dynamically
    if (req.body.firstName) {
      updates.firstName = req.body.firstName;
    }

    if (req.body.lastName) {
      updates.lastName = req.body.lastName;
    }

    if (req.body.phoneNumber) {
      updates.phoneNumber = req.body.phoneNumber;
    }

    if (req.body.dob) {
      updates.dob = req.body.dob;
    }

    if (req.body.bio) {
      updates.bio = req.body.bio;
    }

    // 2. Handle image upload
    if (req.file) {
      const uploadDir = "uploads";

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
      }

      const fileName = `${Date.now()}.webp`;
      const filePath = path.join(uploadDir, fileName);

      await sharp(req.file.buffer)
        .resize(500, 500)
        .webp({ quality: 80 })
        .toFile(filePath);

      updates.avatar = filePath;
    }

    // 3. Prevent empty update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No fields provided for update",
      });
    }

    // 4. Update MongoDB
    const updatedProfile = await userprofile.findOneAndUpdate(
      { userid: userId },
      { $set: updates },
      { new: true },
    );

    if (!updatedProfile) {
      return res.status(404).json({
        message: "Profile not found",
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      data: updatedProfile,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      message: error.message,
    });
  }
};
