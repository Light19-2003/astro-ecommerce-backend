import Product from "../models/product.model.js";
import productModel from "../models/product.model.js";
import ReviewModel from "../models/review.model.js";
import { deleteImageAsset, saveImageAsset } from "../utils/image-upload.js";

const attachReviewSummary = async (products) => {
  const productList = Array.isArray(products) ? products : [products];
  const ids = productList
    .filter(Boolean)
    .map((product) => product._id);

  if (ids.length === 0) return Array.isArray(products) ? [] : null;

  const summaries = await ReviewModel.aggregate([
    {
      $match: {
        product: { $in: ids },
        status: "published",
      },
    },
    {
      $group: {
        _id: "$product",
        rating: { $avg: "$rating" },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  const summaryByProduct = new Map(
    summaries.map((summary) => [
      String(summary._id),
      {
        rating: Number(summary.rating.toFixed(1)),
        ratingCount: summary.ratingCount,
      },
    ]),
  );

  const enrichedProducts = productList.map((product) => {
    if (!product) return null;

    const data = product.toObject ? product.toObject() : product;
    const summary = summaryByProduct.get(String(data._id)) || {
      rating: 0,
      ratingCount: 0,
    };

    return {
      ...data,
      ...summary,
    };
  });

  return Array.isArray(products) ? enrichedProducts : enrichedProducts[0];
};

export const CreateProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      mrp,
      category_id,
      size,
      brand,
      stock,
      producthightlight,
    } = req.body;

    const missingFields = [];
    if (!name?.trim()) missingFields.push("name");
    if (!description?.trim()) missingFields.push("description");
    if (!price) missingFields.push("price");
    if (!category_id) missingFields.push("category");
    if (!brand?.trim()) missingFields.push("brand");
    if (!producthightlight?.trim()) missingFields.push("product highlights");
    if (stock === undefined || stock === "") missingFields.push("stock");

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    console.log(req.body);

    if (!req.file) {
      return res.status(400).json({
        message: "Image is required",
      });
    }

    const imageResult = await saveImageAsset({
      file: req.file,
      folder: "products",
      name,
      width: 500,
      height: 500,
      quality: 80,
    });

    const productPrice = Number(price);
    const productMrp = mrp === undefined || mrp === "" ? productPrice : Number(mrp);

    const product = await Product.create({
      name,
      description,
      price: productPrice,
      mrp: Number.isNaN(productMrp) ? productPrice : productMrp,
      category_id,
      size,
      brand,
      producthightlight,
      stock: Number(stock),

      localimage: imageResult.localimage,

      // Cloudinary
      image: imageResult.image,
      public_id: imageResult.public_id,
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
      data: await attachReviewSummary(product),
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
      data: await attachReviewSummary(product),
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
    const products = await Product.find({ category_id: categoryId }).populate("category_id");
    const enrichedProducts = await attachReviewSummary(products);

    return res.status(200).json({
      success: true,
      count: enrichedProducts.length,
      products: enrichedProducts,
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

    await deleteImageAsset(product.public_id);

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
      mrp,
      category_id,
      size,
      brand,
      stock,
      producthightlight,
    } = req.body;

    console.log(req.body);

    const product = await productModel.findById(req.params.id);
    if (!product) {
      return res.status(400).json({
        message: "Product not found",
      });
    }

    if (req.file) {
      const imageResult = await saveImageAsset({
        file: req.file,
        folder: "products",
        name: name || product.name,
        width: 500,
        height: 500,
        quality: 80,
      });

      await deleteImageAsset(product.public_id);

      product.image = imageResult.image;
      product.localimage = imageResult.localimage;
      product.public_id = imageResult.public_id;
    }

    if (name !== undefined) product.name = name;
    if (size !== undefined) product.size = size;
    if (brand !== undefined) product.brand = brand;
    if (producthightlight !== undefined) product.producthightlight = producthightlight;
    if (description !== undefined) product.description = description;
    if (price !== undefined && price !== "") product.price = Number(price);
    if (mrp !== undefined && mrp !== "") product.mrp = Number(mrp);
    if ((product.mrp === undefined || product.mrp === null) && product.price !== undefined) {
      product.mrp = product.price;
    }
    if (category_id !== undefined && category_id !== "") product.category_id = category_id;
    if (stock !== undefined && stock !== "") product.stock = Number(stock);
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
