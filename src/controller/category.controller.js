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

    let image = filePath;
    let public_id = null;

    console.log(process.env.USE_CLOUDINARY);

    if (process.env.USE_CLOUDINARY === "true") {
      const cloudinaryResult = await cloudinary.uploader.upload(filePath, {
        folder: "products",
        public_id: slug,
      });

      image = cloudinaryResult.secure_url;
      public_id = cloudinaryResult.public_id;
    }

    const category = await catmodel.create({
      name: name,
      tagline: tagline,
      themecolor: themecolor,
      localimage: filePath,
      image: filePath,
      public_id: public_id,
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
    const { categoryId } = req.params;
    const { name, tagline, themecolor } = req.body;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category id is required",
      });
    }

    // Find category
    const category = await catmodel.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const updateData = {};

    if (name) updateData.name = name;
    if (tagline) updateData.tagline = tagline;
    if (themecolor) updateData.themecolor = themecolor;

    // Image uploaded
    if (req.file) {
      const uploadDir = "uploads";

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filename = `${Date.now()}.webp`;
      const filePath = path.join(uploadDir, filename);

      await sharp(req.file.buffer)
        .resize(500, 500)
        .webp({ quality: 80 })
        .toFile(filePath);

      // Delete old image
      if (category.image && fs.existsSync(category.image)) {
        fs.unlinkSync(category.image);
      }

      updateData.image = filePath;
    }

    await catmodel.findByIdAndUpdate(categoryId, updateData);

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
    });
  } catch (ex) {
    console.log(ex);

    return res.status(500).json({
      success: false,
      message: ex.message,
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
