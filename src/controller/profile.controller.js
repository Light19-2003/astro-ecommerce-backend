import sharp from "sharp";
import path from "path";
import fs from "fs";

import supabase from "../Database/db.js";

export const UserProfile = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, dob, bio } = req.body;

    const user_id = req.user.id;

    // if (!firstName || !lastName || !phoneNumber || !dob || !bio) {
    //   return res.status(400).json({ message: "All fields are required" });
    // }

    if (!req.file) {
      return res.status(400).json({
        message: "Image is required",
      });
    }

    if (!fs.existsSync("uploads")) {
      fs.mkdirSync("uploads");
    }

    const fileName = `${Date.now()}.webp`;

    const fileupload = path.join("uploads", fileName);

    console.log(fileupload);

    console.log(req.file.buffer);

    await sharp(req.file.buffer)
      .resize(500, 500)
      .webp({ quality: 80 })
      .toFile(fileupload);

    const { data, error } = await supabase
      .from("User_profile")
      .insert({
        User_id: user_id,
        First_name: firstName,
        Last_name: lastName,
        user_image: fileupload,
        Phome_number: phoneNumber,
        Date_of_brith: dob,
        bio: bio,
      })
      .select("*");

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    console.log(data);

    return res
      .status(201)
      .json({ message: "Profile created successfully", data: data });
  } catch (ex) {
    console.log(ex);

    res.status(500).json({ message: ex.message });
  }
};

export const GetProfile = async (req, res) => {
  try {
    const user_id = req.query.UserId;

    console.log("params:", req.params);
    console.log("query:", req.query);
    console.log("user_id:", user_id);

    const { data, error } = await supabase
      .from("User_profile")
      .select("*")
      .eq("User_id", user_id)
      .single();

    /// user not found

    if (!data) {
      return res.status(404).json({ message: "User not found" });
    }

    // if (error) {
    //   return res.status(400).json({ message: error.message });
    // }

    return res
      .status(200)
      .json({ message: "Profile created successfully", data: data });
  } catch (ex) {
    console.log(ex);
    res.status(500).json({ message: ex.message });
  }
};

export const UpdateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, dob, bio } = req.body;
    const user_id = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        message: "Image is required",
      });
    }

    if (!fs.existsSync("uploads")) {
      fs.mkdirSync("uploads");
    }

    const fileName = `${Date.now()}.webp`;

    const fileupload = path.join("uploads", fileName);

    console.log(fileupload);

    console.log(req.file.buffer);

    await sharp(req.file.buffer)
      .resize(500, 500)
      .webp({ quality: 80 })
      .toFile(fileupload);

    const { data, error } = await supabase
      .from("User_profile")
      .update({
        User_id: user_id,
        First_name: firstName,
        Last_name: lastName,
        user_image: fileupload,
        Phome_number: phoneNumber,
        Date_of_brith: dob,
        bio: bio,
      })
      .eq("User_id", user_id)
      .select("*");

    if (!data) {
      return res.status(404).json({ message: "User not found" });
    }

    return res
      .status(200)
      .json({ message: "Profile updated successfully", data: data });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const SingleFieldProfileUpdate = async (req, res) => {
  try {
    const user_id = req.user.id;

    const updates = {};

    if (req.body.First_name) {
      updates.First_name = req.body.First_name;
    }
    if (req.body.Last_name) {
      updates.Last_name = req.body.Last_name;
    }
    if (req.body.Phone_number) {
      updates.Phome_number = req.body.Phome_number;
    }
    if (req.body.Date_of_brith) {
      updates.Date_of_brith = req.body.Date_of_brith;
    }
    if (req.body.bio) {
      updates.bio = req.body.bio;
    }
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    if (req.file) {
      if (!fs.existsSync("uploads")) {
        fs.mkdirSync("uploads");
      }

      const fileName = `${Date.now()}.webp`;
      const filePath = path.join("uploads", fileName);

       

      updates.user_image = `/uploads/${fileName}`;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No fields provided for update",
      });
    }

    const { data, error } = await supabase
      .from("User_profile")
      .update(updates)
      .eq("User_id", user_id)
      .select();

    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      data,
    });
  } catch (ex) {
    console.log(ex);

    res.status(500).json({ message: ex.message });
  }
};
