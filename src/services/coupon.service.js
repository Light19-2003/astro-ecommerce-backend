import mongoose from "mongoose";
import CouponModel from "../models/coupon.model.js";
import ProductModel from "../models/product.model.js";
import CategoryModel from "../models/Category.model.js";
import UserModel from "../models/User.model.js";
import {
  calculateCouponDiscount,
  couponError,
} from "../utils/coupon.service.js";

const parseDate = (value, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
};

const getProductId = (body = {}) => body.product_id || body.productId;
const getCategoryId = (body = {}) => body.category_id || body.categoryId;
const getMinPurchaseAmount = (body = {}) =>
  body.minPurchaseAmount ??
  body.minimumPrice ??
  body.minPrice ??
  body.minimumAmount ??
  body.minOrderAmount;
const normalizeEmail = (email = "") =>
  String(email || "")
    .trim()
    .toLowerCase();
const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findUserByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  return UserModel.findOne({
    email: { $regex: `^${escapeRegex(normalizedEmail)}$`, $options: "i" },
  });
};

const getRefId = (value) => {
  if (!value) return null;
  if (typeof value === "object") return String(value._id || value.id || value);
  return String(value);
};

const serializeCoupon = (coupon) => {
  const source =
    typeof coupon.toObject === "function" ? coupon.toObject() : coupon;
  const product = source.product_id;
  const category = source.category_id;
  const productId = getRefId(product);
  const categoryId = getRefId(category);
  const targetType =
    (!source.targetType || source.targetType === "all") &&
    productId &&
    !categoryId
      ? "product"
      : source.targetType || (categoryId ? "category" : "all");

  return {
    id: source._id || source.id,
    couponId: source.couponId,
    targetType,
    category_id: categoryId,
    categoryId,
    categoryName: category && typeof category === "object" ? category.name : "",
    product_id: productId,
    productId,
    productName: product && typeof product === "object" ? product.name : "",
    productImage: product && typeof product === "object" ? product.image : "",
    productBrand: product && typeof product === "object" ? product.brand : "",
    assignedUser: getRefId(source.assignedUser),
    customerEmail: source.customerEmail || "",
    discountType: source.discountType,
    discountValue: source.discountValue,
    startDate: source.startDate,
    expireDate: source.expireDate,
    maxLimit: source.maxLimit,
    minPurchaseAmount: Number(source.minPurchaseAmount) || 0,
    usage: Array.isArray(source.usedBy)
      ? source.usedBy.length
      : source.usage || 0,
    isActive: source.isActive,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
};

const buildCouponPayload = async (body = {}, existing = {}) => {
  const productId = getProductId(body);
  const categoryId = getCategoryId(body);
  const targetSpecified =
    body.targetType !== undefined ||
    productId !== undefined ||
    categoryId !== undefined;
  const payload = {};

  if (body.discountType !== undefined) payload.discountType = body.discountType;
  if (body.discountValue !== undefined)
    payload.discountValue = Number(body.discountValue);
  if (body.startDate !== undefined)
    payload.startDate = parseDate(body.startDate);
  if (body.expireDate !== undefined)
    payload.expireDate = parseDate(body.expireDate, true);
  if (body.maxLimit !== undefined) payload.maxLimit = Number(body.maxLimit);
  if (getMinPurchaseAmount(body) !== undefined) {
    payload.minPurchaseAmount = Number(getMinPurchaseAmount(body));
  }
  if (body.isActive !== undefined) payload.isActive = Boolean(body.isActive);

  if (
    body.customerEmail !== undefined ||
    body.userEmail !== undefined ||
    body.email !== undefined
  ) {
    const customerEmail = normalizeEmail(
      body.customerEmail || body.userEmail || body.email,
    );

    if (!customerEmail) {
      payload.assignedUser = undefined;
      payload.customerEmail = undefined;
    } else {
      const user = await findUserByEmail(customerEmail);
      if (!user) {
        throw couponError("No user found with this email", 404);
      }

      payload.assignedUser = user._id;
      payload.customerEmail = user.email;
    }
  }

  if (targetSpecified) {
    const targetType =
      body.targetType ||
      (productId ? "product" : categoryId ? "category" : "all");
    payload.targetType = targetType;

    if (!["all", "category", "product"].includes(targetType)) {
      throw couponError("Coupon target must be all, category, or product");
    }

    if (targetType === "all") {
      payload.product_id = undefined;
      payload.category_id = undefined;
    }

    if (targetType === "category") {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw couponError("Invalid category id");
      }

      const category = await CategoryModel.findById(categoryId);
      if (!category) {
        throw couponError("Category not found", 404);
      }

      payload.category_id = categoryId;
      payload.product_id = undefined;
    }

    if (targetType === "product") {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw couponError("Invalid product id");
      }

      const product = await ProductModel.findById(productId);
      if (!product) {
        throw couponError("Product not found", 404);
      }

      payload.product_id = productId;
      payload.category_id = undefined;
    }
  }

  const merged = {
    discountType: "percentage",
    targetType: "all",
    maxLimit: 1,
    minPurchaseAmount: 0,
    isActive: true,
    ...existing,
    ...payload,
  };
  if (merged.targetType === "product" && !merged.product_id) {
    throw couponError("Product id is required");
  }
  if (merged.targetType === "category" && !merged.category_id) {
    throw couponError("Category id is required");
  }
  if (!merged.startDate) throw couponError("Start date is required");
  if (!merged.expireDate) throw couponError("Expire date is required");
  if (merged.expireDate < merged.startDate) {
    throw couponError("Expire date must be after start date");
  }
  if (!["percentage", "fixed"].includes(merged.discountType)) {
    throw couponError("Discount type must be percentage or fixed");
  }
  if (
    Number.isNaN(Number(merged.discountValue)) ||
    Number(merged.discountValue) <= 0
  ) {
    throw couponError("Discount value must be greater than 0");
  }
  if (
    merged.discountType === "percentage" &&
    Number(merged.discountValue) > 100
  ) {
    throw couponError("Percentage discount cannot be greater than 100");
  }
  if (Number.isNaN(Number(merged.maxLimit)) || Number(merged.maxLimit) < 1) {
    throw couponError("Max limit must be at least 1");
  }
  if (
    Number.isNaN(Number(merged.minPurchaseAmount)) ||
    Number(merged.minPurchaseAmount) < 0
  ) {
    throw couponError("Minimum price must be 0 or greater");
  }

  return payload;
};

const sendError = (res, error) => {
  if (error?.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "Coupon id already exists",
    });
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message,
  });
};

export const AdminGetCoupons = async (req, res) => {
  try {
    const coupons = await CouponModel.find()
      .populate("product_id", "name image brand price")
      .populate("category_id", "name")
      .populate("assignedUser", "email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons.map(serializeCoupon),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const AdminCreateCoupon = async (req, res) => {
  try {
    const payload = await buildCouponPayload(req.body);
    const coupon = await CouponModel.create(payload);
    await coupon.populate("product_id", "name image brand price");
    await coupon.populate("category_id", "name");
    await coupon.populate("assignedUser", "email");

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: serializeCoupon(coupon),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const AdminUpdateCoupon = async (req, res) => {
  try {
    const coupon = await CouponModel.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    const existing = coupon.toObject();
    const payload = await buildCouponPayload(req.body, existing);

    Object.assign(coupon, payload);
    await coupon.save();
    await coupon.populate("product_id", "name image brand price");
    await coupon.populate("category_id", "name");
    await coupon.populate("assignedUser", "email");

    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      data: serializeCoupon(coupon),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const AdminDeleteCoupon = async (req, res) => {
  try {
    const coupon = await CouponModel.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const GetAvailableCoupons = async (req, res) => {
  try {
    const now = new Date();
    const productIds = String(req.query.productIds || "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id));
    const productsInCart =
      productIds.length > 0
        ? await ProductModel.find({ _id: { $in: productIds } }).select(
            "category_id",
          )
        : [];
    const categoryIds = [
      ...new Set(
        productsInCart
          .map((product) => String(product.category_id))
          .filter(Boolean),
      ),
    ];

    const filter = {
      isActive: true,
      startDate: { $lte: now },
      expireDate: { $gte: now },
      $and: [
        {
          $or: [
            { assignedUser: { $exists: false } },
            { assignedUser: null },
            { assignedUser: req.user.id },
          ],
        },
      ],
    };

    if (productIds.length > 0) {
      filter.$and.push({
        $or: [
          { targetType: "all" },
          { targetType: "product", product_id: { $in: productIds } },
          { targetType: "category", category_id: { $in: categoryIds } },
          { targetType: { $exists: false }, product_id: { $in: productIds } },
        ],
      });
    }

    const coupons = await CouponModel.find(filter)
      .populate("product_id", "name image brand price")
      .populate("category_id", "name")
      .populate("assignedUser", "email")
      .sort({ expireDate: 1 });

    const availableCoupons = coupons.filter((coupon) => {
      const usage = coupon.usedBy.find(
        (entry) => String(entry.user) === String(req.user.id),
      );
      return Number(usage?.count || 0) < Number(coupon.maxLimit);
    });

    return res.status(200).json({
      success: true,
      count: availableCoupons.length,
      data: availableCoupons.map(serializeCoupon),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const ApplyCoupon = async (req, res) => {
  try {
    const { couponId, items = [] } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw couponError("Cart items are required");
    }

    const result = await calculateCouponDiscount({
      couponId,
      userId: req.user.id,
      items,
      redeem: false,
    });

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully",
      data: {
        coupon: serializeCoupon(result.coupon),
        couponId: result.couponId,
        targetType: result.targetType,
        productId: result.productId,
        categoryId: result.categoryId,
        productName: result.productName,
        eligibleProductNames: result.eligibleProductNames,
        eligibleQuantity: result.eligibleQuantity,
        minPurchaseAmount: result.minPurchaseAmount,
        eligibleSubtotal: result.eligibleSubtotal,
        discount: result.discount,
        remainingUses: result.remainingUses,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};
