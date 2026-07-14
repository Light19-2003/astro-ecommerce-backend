import OrderModel from "../models/order.model.js";
import ProductModel from "../models/product.model.js";
import mongoose from "mongoose";
import { calculateCouponDiscount } from "../utils/coupon.service.js";
import Razorpay from "razorpay";
import crypto from "crypto";

const ADMIN_PURCHASE_ROLES = ["admin", "superAdmin", "orderManager"];
const ADMIN_PURCHASE_MESSAGE =
  "Admin accounts cannot add products to cart or place orders. Please use a customer account.";

const normalizePaymentMethod = (method = "cod") => {
  const normalized = String(method).toLowerCase();
  if (normalized === "upi") return "UPI";
  if (normalized === "card") return "CARD";
  return "COD";
};

const normalizeShippingAddress = (address = {}) => ({
  fullName: address.fullName || address.name || "",
  phone: address.phone || address.mobile || "",
  address: address.address || address.line || address.addressLine1 || "",
  city: address.city || "",
  state: address.state || "",
  pincode: address.pincode || "",
  country: address.country || "India",
});

const validateShippingAddress = (shippingAddress) => {
  const missingFields = [];
  if (!shippingAddress.fullName?.trim()) missingFields.push("fullName");
  if (!shippingAddress.phone?.trim()) missingFields.push("phone");
  if (!shippingAddress.address?.trim()) missingFields.push("address");
  if (!shippingAddress.city?.trim()) missingFields.push("city");
  if (!shippingAddress.state?.trim()) missingFields.push("state");
  if (!shippingAddress.pincode?.trim()) missingFields.push("pincode");
  return missingFields;
};

export const PlaceOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    if (ADMIN_PURCHASE_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: ADMIN_PURCHASE_MESSAGE,
      });
    }

    const {
      items = [],
      shippingAddress: rawShippingAddress,
      paymentMethod = "cod",
      paymentStatus,
      coupon = null,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one item",
      });
    }

    const shippingAddress = normalizeShippingAddress(rawShippingAddress);
    const missingAddressFields = validateShippingAddress(shippingAddress);

    if (missingAddressFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing shipping fields: ${missingAddressFields.join(", ")}`,
      });
    }

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const productId = item.product || item.productId || item.id || item._id;
      const quantity = Number(item.quantity || item.qty || 1);

      if (!productId || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Invalid order item",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product id in cart. Please remove this item and add it again.",
        });
      }

      const product = await ProductModel.findById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      if (product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.name} is out of stock`,
        });
      }

      const price = Number(product.price) || 0;

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.image || "",
        price,
        quantity,
      });

      subtotal += price * quantity;
    }

    const shippingCharge = 0;
    const tax = 0;
    const couponResult = coupon
      ? await calculateCouponDiscount({
          couponId: coupon,
          userId,
          items,
          redeem: true,
        })
      : null;
    const safeDiscount = couponResult?.discount || 0;
    const totalAmount = Math.max(
      0,
      subtotal + shippingCharge + tax - safeDiscount,
    );
    const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);

    const order = await OrderModel.create({
      user: userId,
      items: orderItems,
      shippingAddress,
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: "Pending",
      orderStatus: "Confirmed",
      subtotal,
      shippingCharge,
      tax,
      discount: safeDiscount,
      totalAmount,
      coupon: couponResult?.couponId || null,
    });

    for (const item of orderItems) {
      await ProductModel.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    if (normalizedPaymentMethod !== "COD") {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });

      const options = {
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: `receipt_${order._id}`,
      };

      try {
        const razorpayOrder = await razorpay.orders.create(options);
        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        return res.status(201).json({
          success: true,
          message: "Order placed successfully, proceed to payment",
          order,
          razorpayOrderId: razorpayOrder.id,
          amount: options.amount,
          currency: options.currency,
        });
      } catch (err) {
        console.log("Razorpay Error:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to create Razorpay order",
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    console.log(error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const GetMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await OrderModel.find({ user: userId })
      .populate("items.product")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: orders.length,
      orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const GetAllOrders = async (req, res) => {
  try {
    const orders = await OrderModel.find()
      .populate("user", "email role")
      .populate("items.product")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: orders.length,
      orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const GetSingleOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await OrderModel.findById(orderId)
      .populate("user", "email role")
      .populate("items.product");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const isOwner = order.user._id.toString() === req.user.id;
    const isAdmin = ["admin", "superAdmin", "orderManager"].includes(
      req.user.role,
    );

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const UpdateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus } = req.body;

    const allowedStatuses = [
      "Pending",
      "Confirmed",
      "Packed",
      "Shipped",
      "Out For Delivery",
      "Delivered",
      "Cancelled",
    ];

    if (!allowedStatuses.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await OrderModel.findByIdAndUpdate(
      orderId,
      { orderStatus },
      { new: true },
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated",
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const CancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await OrderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (order.orderStatus !== "Pending" && order.orderStatus !== "Confirmed") {
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled",
      });
    }

    for (const item of order.items) {
      await ProductModel.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    order.orderStatus = "Cancelled";
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const VerifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    const order = await OrderModel.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      order.razorpayPaymentId = razorpay_payment_id;
      order.razorpaySignature = razorpay_signature;
      order.paymentStatus = "Paid";
      await order.save();

      return res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        order,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
