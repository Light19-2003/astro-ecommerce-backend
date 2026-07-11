import Product from "../../models/product.model.js";
import Category from "../../models/Category.model.js";
import Inventory from "../../models/inventory.model.js";
import Cart from "../../models/cart.model.js";
import Wishlist from "../../models/Wishlist.model.js";
import UserAuthentication from "../../models/User.model.js";
import UserProfile from "../../models/userprofile.model.js";
import EmailVerification from "../../models/emailverification.model.js";
import Order from "../../models/order.model.js";
import mongoose from "mongoose";
import { createAuditLog } from "../../utils/audit-log.js";

const buildLast7Days = () => {
  const days = [];

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);

    days.push({
      key: date.toISOString().slice(0, 10),
      day: date.toLocaleDateString("en-IN", { weekday: "short" }),
    });
  }

  return days;
};

export const GetDashboard = async (req, res) => {
  try {
    const last7Days = buildLast7Days();
    const last7DaysStart = new Date(last7Days[0].key);

    const [
      totalProducts,
      totalCategories,
      totalUsers,
      totalProfiles,
      totalWishlist,
      totalCart,
      totalPendingVerification,
      totalVerifiedUsers,
      totalOrders,
      revenueSummary,
      inventorySummary,
      productsByCategory,
      lowStockProducts,
      recentUsers,
      ordersLast7DaysRaw,
      recentOrders,
    ] = await Promise.all([
      Product.countDocuments(),
      Category.countDocuments(),
      UserAuthentication.countDocuments(),
      UserProfile.countDocuments(),
      Wishlist.countDocuments(),
      Cart.countDocuments(),
      EmailVerification.countDocuments({ isUsed: false }),
      UserAuthentication.countDocuments({ isVerified: true }),
      Order.countDocuments(),

      Order.aggregate([
        {
          $match: {
            orderStatus: { $ne: "Cancelled" },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$totalAmount" },
          },
        },
      ]),

      Inventory.aggregate([
        {
          $group: {
            _id: null,
            totalStock: { $sum: "$stock" },
            inStock: {
              $sum: {
                $cond: [{ $eq: ["$status", "In Stock"] }, 1, 0],
              },
            },
            outOfStock: {
              $sum: {
                $cond: [{ $eq: ["$status", "Out of Stock"] }, 1, 0],
              },
            },
          },
        },
      ]),

      Product.aggregate([
        {
          $group: {
            _id: "$category_id",
            totalProducts: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: Category.collection.name,
            localField: "_id",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $unwind: {
            path: "$category",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            categoryId: "$_id",
            category: { $ifNull: ["$category.name", "Uncategorized"] },
            totalProducts: 1,
          },
        },
        {
          $sort: { totalProducts: -1 },
        },
      ]),

      Inventory.aggregate([
        {
          $match: {
            stock: { $lte: 10 },
          },
        },
        {
          $lookup: {
            from: Product.collection.name,
            localField: "product_id",
            foreignField: "_id",
            as: "product",
          },
        },
        {
          $unwind: "$product",
        },
        {
          $project: {
            _id: 0,
            productId: "$product._id",
            productName: "$product.name",
            brand: "$product.brand",
            image: "$product.image",
            stock: 1,
            status: 1,
          },
        },
        {
          $sort: { stock: 1 },
        },
        {
          $limit: 10,
        },
      ]),

      UserAuthentication.find()
        .select("email role isVerified isActive createdAt")
        .sort({ createdAt: -1 })
        .limit(5),

      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: last7DaysStart },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "Asia/Kolkata",
              },
            },
            orders: { $sum: 1 },
            revenue: { $sum: "$totalAmount" },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]),

      Order.find()
        .populate("user", "email role")
        .select("user items totalAmount orderStatus paymentStatus createdAt")
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const orderMap = new Map(
      ordersLast7DaysRaw.map((item) => [
        item._id,
        {
          orders: item.orders,
          revenue: item.revenue,
        },
      ]),
    );

    const ordersLast7Days = last7Days.map((day) => ({
      day: day.day,
      date: day.key,
      orders: orderMap.get(day.key)?.orders || 0,
    }));

    const revenueLast7Days = last7Days.map((day) => ({
      day: day.day,
      date: day.key,
      revenue: orderMap.get(day.key)?.revenue || 0,
    }));

    return res.status(200).json({
      success: true,
      dashboard: {
        cards: {
          totalProducts,
          totalCategories,
          totalUsers,
          totalProfiles,
          totalWishlist,
          totalCart,
          verifiedUsers: totalVerifiedUsers,
          pendingEmailVerification: totalPendingVerification,
          totalOrders,
          totalRevenue: revenueSummary[0]?.totalRevenue || 0,
          averageRating: 0,
        },

        inventory: inventorySummary[0] || {
          totalStock: 0,
          inStock: 0,
          outOfStock: 0,
        },

        charts: {
          productsByCategory,
          ordersLast7Days,
          revenueLast7Days,
        },

        tables: {
          lowStockProducts,
          recentUsers,
          recentOrders: recentOrders.map((order) => ({
            id: order._id,
            userEmail: order.user?.email || "",
            itemsCount: order.items?.length || 0,
            totalAmount: order.totalAmount,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
            createdAt: order.createdAt,
          })),
        },
      },
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const formatUserProfile = (profile) => {
  if (!profile) return null;

  return {
    fullName: profile.fullName || "",
    firstName: profile.firstName || "",
    lastName: profile.lastName || "",
    phoneNumber: profile.phoneNumber || "",
    city: profile.address?.city || "",
    state: profile.address?.state || "",
  };
};

const formatAdminUser = ({ user, profile, ordersCount = 0 }) => ({
  _id: user._id,
  id: user._id,
  email: user.email,
  role: user.role,
  isVerified: Boolean(user.isVerified),
  isActive: user.isActive !== false,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  ordersCount,
  profile: formatUserProfile(profile),
});

export const GetAllUsers = async (req, res) => {
  try {
    const { search = "", role = "all", status = "all" } = req.query;
    const filter = {};

    if (role !== "all") filter.role = role;
    if (status === "active") filter.isActive = { $ne: false };
    if (status === "blocked") filter.isActive = false;

    if (search.trim()) {
      filter.email = {
        $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }

    const users = await UserAuthentication.find(filter)
      .select("-password -Resettoken")
      .sort({ createdAt: -1 });

    const userIds = users.map((user) => user._id);

    const [profiles, orderCounts] = await Promise.all([
      UserProfile.find({ userid: { $in: userIds } }),
      Order.aggregate([
        {
          $match: {
            user: { $in: userIds },
          },
        },
        {
          $group: {
            _id: "$user",
            ordersCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const profilesByUser = new Map(
      profiles.map((profile) => [String(profile.userid), profile]),
    );
    const ordersByUser = new Map(
      orderCounts.map((item) => [String(item._id), item.ordersCount]),
    );

    const result = users.map((user) =>
      formatAdminUser({
        user,
        profile: profilesByUser.get(String(user._id)),
        ordersCount: ordersByUser.get(String(user._id)) || 0,
      }),
    );

    return res.status(200).json({
      success: true,
      totalUsers: result.length,
      users: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const setUserActiveStatus = async ({ id, isActive, adminId }) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid user id");
    error.statusCode = 400;
    throw error;
  }

  if (String(id) === String(adminId)) {
    const error = new Error("You cannot change your own account status");
    error.statusCode = 403;
    throw error;
  }

  const user = await UserAuthentication.findById(id).select("-password -Resettoken");

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (["admin", "superAdmin", "orderManager"].includes(user.role)) {
    const error = new Error("Admin accounts cannot be blocked");
    error.statusCode = 403;
    throw error;
  }

  user.isActive = isActive;
  await user.save();

  const [profile, ordersCount] = await Promise.all([
    UserProfile.findOne({ userid: user._id }),
    Order.countDocuments({ user: user._id }),
  ]);

  return formatAdminUser({ user, profile, ordersCount });
};

export const BlockUser = async (req, res) => {
  try {
    const user = await setUserActiveStatus({
      id: req.params.id,
      isActive: false,
      adminId: req.user?.id,
    });

    await createAuditLog({
      admin: req.user?.id,
      action: "BLOCK_USER",
      module: "USER",
      targetId: user.id,
      targetName: user.email,
      description: `Blocked user ${user.email}`,
      req,
    });

    return res.status(200).json({
      success: true,
      message: "User blocked successfully",
      user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const UnBlockUser = async (req, res) => {
  try {
    const user = await setUserActiveStatus({
      id: req.params.id,
      isActive: true,
      adminId: req.user?.id,
    });

    await createAuditLog({
      admin: req.user?.id,
      action: "UNBLOCK_USER",
      module: "USER",
      targetId: user.id,
      targetName: user.email,
      description: `Unblocked user ${user.email}`,
      req,
    });

    return res.status(200).json({
      success: true,
      message: "User unblocked successfully",
      user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};
