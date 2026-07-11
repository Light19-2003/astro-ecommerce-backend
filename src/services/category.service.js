import catmodel from "../models/Category.model.js";
import { deleteImageAsset, saveImageAsset } from "../utils/image-upload.js";

export const CreateCategory = async (req, res) => {
  try {
    const { name, tagline, themecolor } = req.body || {};

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

    const imageResult = await saveImageAsset({
      file: req.file,
      folder: "categories",
      name,
      width: 500,
      height: 500,
      quality: 80,
    });

    const category = await catmodel.create({
      name: name,
      tagline: tagline,
      themecolor: themecolor,
      image: imageResult.image,
      localimage: imageResult.localimage,
      public_id: imageResult.public_id,
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
    const { name, tagline, themecolor } = req.body || {};

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

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (tagline !== undefined) updateData.tagline = tagline;
    if (themecolor !== undefined) updateData.themecolor = themecolor;

    if (req.file) {
      const existingCategory = await catmodel.findById(cateid);
      if (!existingCategory) {
        return res.status(404).json({
          message: "Category not found",
          sucess: false,
        });
      }

      const imageResult = await saveImageAsset({
        file: req.file,
        folder: "categories",
        name: name || existingCategory.name,
        width: 500,
        height: 500,
        quality: 80,
      });

      await deleteImageAsset(existingCategory.public_id);

      updateData.image = imageResult.image;
      updateData.localimage = imageResult.localimage;
      updateData.public_id = imageResult.public_id;
    }

    const cate = await catmodel.updateOne({ _id: cateid }, updateData);
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
    const cate = await catmodel.findByIdAndDelete(cateid);
    if (cate) {
      await deleteImageAsset(cate.public_id);

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
