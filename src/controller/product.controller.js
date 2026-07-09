import Product from "../Model/product.model.js";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import productModel from "../Model/product.model.js";

import cloudinary from "../config/image.config.js";

export const CreateProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category_id,
      size,
      brand,
      stock,
      producthightlight,
    } = req.body;

    if (
      !name ||
      !description ||
      !price ||
      !category_id ||
      !brand ||
      !producthightlight ||
      !stock
    ) {
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

    const slug = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");

    // 4. Create filename
    const fileName = `${slug}-${Date.now()}.webp`;
    const filePath = path.join(ProductUpload, fileName);

    // 5. Process image with sharp
    await sharp(req.file.buffer)
      .resize(500, 500)
      .webp({ quality: 80 })
      .toFile(filePath);

    const cloudinaryResult = await cloudinary.uploader.upload(filePath, {
      folder: "Astro-e-commerce-products",
      public_id: slug,
    });

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

    const product = await Product.create({
      name,
      description,
      price,
      category_id,
      size,
      brand,
      producthightlight,
      stock: stock,
      localimage: filePath,

      // Cloudinary
      image: image,
      public_id: public_id,
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

export const GetProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const products = await Product.find({
      category_id: categoryId,
    }).populate("category_id");

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
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
    const {
      name,
      description,
      price,
      category_id,
      size,
      brand,
      producthightlight,
    } = req.body;

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
    product.size = size;
    product.brand = brand;
    product.producthightlight = producthightlight;
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
