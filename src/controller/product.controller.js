import Product from "../Model/product.model.js";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import productModel from "../Model/product.model.js";

export const CreateProduct = async (req, res) => {
  try {
    const { name, description, price, category_id } = req.body;

    if (!name || !description || !price || !category_id) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    console.log(req.body);

    if (!req.file) {
      return res.status(400).json({
        message: "Image is required",
      });
    }

    const ProductUpload = "uploads";
    if (!fs.existsSync(ProductUpload)) {
      fs.mkdirSync(ProductUpload);
    }

    // 4. Create filename
    const fileName = `${Date.now()}.webp`;
    const filePath = path.join(ProductUpload, fileName);

    // 5. Process image with sharp
    await sharp(req.file.buffer)
      .resize(500, 500)
      .webp({ quality: 80 })
      .toFile(filePath);

    const product = await Product.create({
      name,
      description,
      price,
      category_id,
      image: filePath,
    });

    // product.save();

    if (!product) {
      return res.status(400).json({
        message: "Product not created",
      });
    }

    return res.status(200).json({
      message: "Product created successfully",
      data: product,
    });
  } catch (ex) {
    console.log(ex);
    return res.status(500).json({
      message: ex.message,
    });
    s;
  }
};

export const GetAllProduct = async (req, res) => {
  try {
    const product = await productModel.find().populate("category_id");
    if (!product) {
      return res.status(400).json({
        message: "Product not found",
      });
    }
    return res.status(200).json({
      message: "Product found successfully",
      data: product,
    });
  } catch (ex) {
    console.log(ex);
    return res.status(500).json({
      message: ex.message,
    });
  }
};

export const GetProductById = async (req, res) => {
  try {
    const product = await productModel
      .findById(req.params.id)
      .populate("category_id");
    if (!product) {
      return res.status(400).json({
        message: "Product not found",
      });
    }
    return res.status(200).json({
      message: "Product found successfully",
      data: product,
    });
  } catch (ex) {
    console.log(ex);
    return res.status(500).json({
      message: ex.message,
    });
  }
};

// delete

export const DeleteProduct = async (req, res) => {
  try {
    const product = await productModel.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(400).json({
        message: "Product not found",
      });
    }
    return res.status(200).json({
      message: "Product deleted successfully",
      data: product,
    });
  } catch (ex) {
    console.log(ex);
    return res.status(500).json({
      message: ex.message,
    });
  }
};

// update
export const UpdateProduct = async (req, res) => {
  try {
    const { name, description, price, category_id } = req.body;

    if (!name || !description || !price) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    console.log(req.body);

    if (!req.file) {
      return res.status(400).json({
        message: "Image is required",
      });
    }

    const ProductUpload = "uploads";
    if (!fs.existsSync(ProductUpload)) {
      fs.mkdirSync(ProductUpload);
    }

    // 4. Create filename
    const fileName = `${Date.now()}.webp`;
    const filePath = path.join(ProductUpload, fileName);

    // 5. Process image with sharp
    await sharp(req.file.buffer)
      .resize(500, 500)
      .webp({ quality: 80 })
      .toFile(filePath);

    const product = await productModel.findById(req.params.id);
    if (!product) {
      return res.status(400).json({
        message: "Product not found",
      });
    }
    product.name = name;
    product.description = description;
    product.price = price;
    product.category_id = category_id;
    product.image = filePath;
    await product.save();
    return res.status(200).json({
      message: "Product updated successfully",
      data: product,
    });
  } catch (ex) {
    console.log(ex);
    return res.status(500).json({
      message: ex.message,
    });
  }
};
