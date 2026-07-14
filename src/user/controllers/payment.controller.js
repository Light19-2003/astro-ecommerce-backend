import crypto from "node:crypto";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import OrderModel from "../../models/order.model.js";
import PaymentIntent from "../../models/payment-intent.model.js";
import ProductModel from "../../models/product.model.js";
import UserProfile from "../../models/userprofile.model.js";
import ReferralSetting from "../../models/ReferralSetting.model.js";
import { calculateCouponDiscount } from "../../utils/coupon.service.js";
import {
  orderError,
  prepareOrderData,
} from "../../services/order-pricing.service.js";

const ADMIN_PURCHASE_ROLES = ["admin", "superAdmin", "orderManager"];
const ADMIN_PURCHASE_MESSAGE =
  "Admin accounts cannot place orders. Please use a customer account.";

let razorpayInstance;

const getRazorpay = () => {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();

  if (!keyId || !keySecret) {
    throw orderError("Razorpay test credentials are not configured", 503);
  }

  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  return { razorpay: razorpayInstance, keyId, keySecret };
};

const isValidSignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  signature,
  secret,
}) => {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(String(signature || ""), "utf8");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
};

const getRazorpayErrorMessage = (error) =>
  error?.error?.description ||
  error?.error?.reason ||
  error?.message ||
  "Razorpay request failed";

const refundCapturedPayment = async ({ razorpay, paymentId, amount }) => {
  try {
    await razorpay.payments.refund(paymentId, {
      amount,
      speed: "normal",
      notes: { reason: "Local order could not be completed" },
    });
    return true;
  } catch (error) {
    console.error(
      "Razorpay automatic refund failed:",
      getRazorpayErrorMessage(error),
    );
    return false;
  }
};

export const CreateRazorpayOrder = async (req, res) => {
  try {
    if (ADMIN_PURCHASE_ROLES.includes(req.user.role)) {
      return res
        .status(403)
        .json({ success: false, message: ADMIN_PURCHASE_MESSAGE });
    }

    const {
      items = [],
      shippingAddress,
      coupon = null,
      useWallet,
      idempotencyKey,
    } = req.body || {};
    if (!idempotencyKey || !/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey)) {
      throw orderError("A valid checkout idempotency key is required");
    }

    const existingIntent = await PaymentIntent.findOne({
      user: req.user.id,
      idempotencyKey,
      status: { $in: ["created", "processing", "completed"] },
    });
    if (existingIntent) {
      const { keyId } = getRazorpay();
      return res.status(200).json({
        success: true,
        data: {
          paymentIntentId: existingIntent._id,
          keyId,
          razorpayOrderId: existingIntent.razorpayOrderId,
          amount: existingIntent.amount,
          currency: existingIntent.currency,
        },
      });
    }
    const preparedOrder = await prepareOrderData({
      items,
      rawShippingAddress: shippingAddress,
      coupon,
      userId: req.user.id,
      redeemCoupon: false,
      useWallet: Boolean(useWallet),
    });
    const amount = Math.round(preparedOrder.totalAmount * 100);
    if (amount < 100) {
      return res.status(400).json({
        success: false,
        message: "Razorpay payment amount must be at least Rs 1",
      });
    }

    const { razorpay, keyId } = getRazorpay();
    const receipt = `astro_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt,
      notes: { userId: String(req.user.id), source: "AstroMart Checkout" },
    });

    const intent = await PaymentIntent.create({
      user: req.user.id,
      idempotencyKey,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency: razorpayOrder.currency || "INR",
      items: preparedOrder.orderItems,
      shippingAddress: preparedOrder.shippingAddress,
      subtotal: preparedOrder.subtotal,
      shippingCharge: preparedOrder.shippingCharge,
      tax: preparedOrder.tax,
      discount: preparedOrder.discount,
      walletDiscount: preparedOrder.walletDiscount,
      couponDiscount: preparedOrder.couponDiscount,
      totalAmount: preparedOrder.totalAmount,
      coupon: preparedOrder.couponId,
    });

    return res.status(201).json({
      success: true,
      data: {
        paymentIntentId: intent._id,
        keyId,
        razorpayOrderId: razorpayOrder.id,
        amount,
        currency: intent.currency,
        receipt,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || error?.statusCode || 500).json({
      success: false,
      message: getRazorpayErrorMessage(error),
    });
  }
};

export const VerifyRazorpayPayment = async (req, res) => {
  let intent;
  let capturedPayment;
  let storeOrder;
  let session;

  try {
    const {
      razorpay_order_id: returnedOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body || {};

    if (!returnedOrderId || !paymentId || !signature) {
      throw orderError("Razorpay payment verification fields are required");
    }

    intent = await PaymentIntent.findOne({
      razorpayOrderId: returnedOrderId,
      user: req.user.id,
    });
    if (!intent) throw orderError("Payment session was not found", 404);

    const { razorpay, keySecret } = getRazorpay();
    if (
      !isValidSignature({
        razorpayOrderId: intent.razorpayOrderId,
        razorpayPaymentId: paymentId,
        signature,
        secret: keySecret,
      })
    ) {
      throw orderError("Payment signature verification failed", 400);
    }

    if (intent.status === "completed" && intent.storeOrder) {
      const existingOrder = await OrderModel.findById(intent.storeOrder);
      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        order: existingOrder,
      });
    }

    capturedPayment = await razorpay.payments.fetch(paymentId);
    if (capturedPayment.order_id !== intent.razorpayOrderId) {
      throw orderError("Payment does not belong to this Razorpay order");
    }
    if (
      Number(capturedPayment.amount) !== intent.amount ||
      String(capturedPayment.currency).toUpperCase() !== intent.currency
    ) {
      throw orderError("Paid amount does not match the checkout amount");
    }

    if (capturedPayment.status === "authorized") {
      capturedPayment = await razorpay.payments.capture(
        paymentId,
        intent.amount,
        intent.currency,
      );
    }
    if (capturedPayment.status !== "captured") {
      throw orderError(
        `Payment is ${capturedPayment.status}, not captured`,
        409,
      );
    }

    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const currentIntent = await PaymentIntent.findById(intent._id).session(
        session,
      );
      if (!currentIntent) throw orderError("Payment session expired", 404);

      if (currentIntent.status === "completed" && currentIntent.storeOrder) {
        storeOrder = await OrderModel.findById(
          currentIntent.storeOrder,
        ).session(session);
        return;
      }
      if (!["created", "processing"].includes(currentIntent.status)) {
        throw orderError(`Payment session is ${currentIntent.status}`, 409);
      }

      currentIntent.status = "processing";
      currentIntent.razorpayPaymentId = paymentId;
      await currentIntent.save({ session });

      for (const item of currentIntent.items) {
        const stockUpdate = await ProductModel.updateOne(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { session },
        );
        if (stockUpdate.modifiedCount !== 1) {
          throw orderError(`${item.name} no longer has enough stock`, 409);
        }
      }

      [storeOrder] = await OrderModel.create(
        [
          {
            user: currentIntent.user,
            items: currentIntent.items,
            shippingAddress: currentIntent.shippingAddress,
            paymentMethod: "RAZORPAY",
            paymentStatus: "Paid",
            orderStatus: "Confirmed",
            subtotal: currentIntent.subtotal,
            shippingCharge: currentIntent.shippingCharge,
            tax: currentIntent.tax,
            discount: currentIntent.discount,
            walletDiscount: currentIntent.walletDiscount,
            couponDiscount: currentIntent.couponDiscount,
            totalAmount: currentIntent.totalAmount,
            coupon: currentIntent.coupon,
            razorpayOrderId: currentIntent.razorpayOrderId,
            razorpayPaymentId: paymentId,
            razorpaySignature: signature,
            paymentVerifiedAt: new Date(),
          },
        ],
        { session },
      );

      // Referral Reward Logic: if first order, reward referrer
      const pastOrdersCount = await OrderModel.countDocuments({
        user: currentIntent.user,
        _id: { $ne: storeOrder._id },
      }).session(session);
      if (pastOrdersCount === 0) {
        const userProfile = await UserProfile.findOne({
          userid: currentIntent.user,
        }).session(session);
        if (userProfile && userProfile.referredBy) {
          const referrerProfile = await UserProfile.findOne({
            userid: userProfile.referredBy,
          }).session(session);
          if (referrerProfile) {
            const settings = await ReferralSetting.getSettings();
            referrerProfile.walletBalance =
              (referrerProfile.walletBalance || 0) +
              settings.referrerRewardAmount;
            referrerProfile.totalWalletCreditEarned =
              (referrerProfile.totalWalletCreditEarned || 0) +
              settings.referrerRewardAmount;
            referrerProfile.totalReferrals =
              (referrerProfile.totalReferrals || 0) + 1;
            await referrerProfile.save({ session });
          }
        }
      }

      // Deduct Wallet Balance if used
      if (currentIntent.walletDiscount > 0) {
        await UserProfile.updateOne(
          { userid: currentIntent.user },
          { $inc: { walletBalance: -currentIntent.walletDiscount } },
          { session },
        );
      }

      currentIntent.status = "completed";
      currentIntent.storeOrder = storeOrder._id;
      await currentIntent.save({ session });
    });

    if (intent.coupon) {
      try {
        await calculateCouponDiscount({
          couponId: intent.coupon,
          userId: intent.user,
          items: intent.items,
          redeem: true,
        });
      } catch (error) {
        console.error("Coupon redemption recording failed:", error.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Payment verified and order placed successfully",
      order: storeOrder,
    });
  } catch (error) {
    const paymentWasCaptured = capturedPayment?.status === "captured";
    const orderWasCreated = Boolean(storeOrder?._id);

    if (paymentWasCaptured && !orderWasCreated && intent) {
      const { razorpay } = getRazorpay();
      const refunded = await refundCapturedPayment({
        razorpay,
        paymentId: capturedPayment.id,
        amount: intent.amount,
      });
      await PaymentIntent.findByIdAndUpdate(intent._id, {
        status: refunded ? "refunded" : "failed",
        failureReason: getRazorpayErrorMessage(error),
      });

      if (!refunded) {
        return res.status(500).json({
          success: false,
          message:
            "Payment was captured but the order could not be created. Contact support with payment ID " +
            capturedPayment.id,
        });
      }

      return res.status(409).json({
        success: false,
        message: `Payment was refunded because the order could not be completed: ${getRazorpayErrorMessage(error)}`,
        code: "RAZORPAY_PAYMENT_REFUNDED",
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: getRazorpayErrorMessage(error),
      code: "RAZORPAY_VERIFICATION_FAILED",
    });
  } finally {
    if (session) await session.endSession();
  }
};
