import sharp from "sharp";
import path from "path";
import fs from "fs";

import catmodel from "../Model/Category.model.js";
import upload from "../middlewere/image.middlewere.js";

export const CreateCategory = async (req, res) => {
  try {
    const { name, tagline, themecolor } = req.body;

    if (!name || !tagline || !themecolor) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Image is required",
      });
    }
    console.log(req.body);

    console.log(req.file);

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

    const category = await catmodel.create({
      name: name,
      tagline: tagline,
      themecolor: themecolor,
      image: filePath,
    });

    if (category) {
      return res.status(201).json({
        message: "Category created successfully",
        sucess: true,
      });
    } else {
      return res.status(400).json({
        message: "Category not created",
        sucess: false,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

/// get all category

export const GetAllCategory = async (req, res) => {
  try {
    const cate = await catmodel.find();

    if (cate.length === 0) {
      return res.status(200).json({
        message: "No categories found",
        data: [],
        sucess: true,
      });
    }

    return res.status(200).json({
      message: "Categories fetched successfully",
      data: cate,
      sucess: true,
    });

    if (!cate) {
      return res.status(400).json({
        message: "something went wrong",
        sucess: false,
      });
    }
  } catch (ex) {
    console.log(ex);

    return res.status(500).json({
      message: ex.message,
      sucess: false,
    });
  }
};

export const UpdateCategory = async (req, res) => {
  try {
    const cateid = req.params.categoryId;
    const { name, tagline, themecolor } = req.body;

    // if (!name || !tagline || !themecolor) {
    //   return res.status(400).json({
    //     message: "All fields are required",
    //   });
    // }

    if (!cateid) {
      return res.status(400).json({
        message: "Category id is required",
      });
    }

    console.log(req.file);

    // if (!req.file) {
    //   return res.status(400).json({
    //     message: "Image is required",
    //   });
    // }

    const uploadDir = "uploads";

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    const filename = `${Date.now()}.webp`;
    const filePath = path.join(uploadDir, filename);

    await sharp(req.file.buffer)
      .resize(500, 500)
      .webp({ quality: 80 })
      .toFile(filePath);

    const cate = await catmodel.updateOne(
      { _id: cateid },
      { name: name, tagline: tagline, themecolor: themecolor, image: filePath },
    );
    if (cate) {
      return res.status(200).json({
        message: "Category updated successfully",
        sucess: true,
      });
    } else {
      return res.status(400).json({
        message: "Category not updated",
        sucess: false,
      });
    }
  } catch (ex) {
    console.log(ex);
    return res.status(500).json({
      message: ex.message,
      sucess: false,
    });
  }
};

// delete

export const DeleteCategory = async (req, res) => {
  try {
    const cateid = req.params.categoryId;
    const cate = await catmodel.deleteOne({ _id: cateid });
    if (cate) {
      return res.status(200).json({
        message: "Category deleted successfully",
        sucess: true,
      });
    }
    return res.status(400).json({
      message: "Category not deleted",
      sucess: false,
    });
  } catch (ex) {
    console.log(ex);
    return res.status(500).json({
      message: ex.message,
      sucess: false,
    });
  }
};
