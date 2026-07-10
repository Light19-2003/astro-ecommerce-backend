// controllers/AdminDashboardController.js

import Product from "../Model/product.model.js";
import Category from "../Model/Category.model.js";
// import Inventory from "../Model/";
import Cart from "../Model/cart.model.js";
import Wishlist from "../Model/Wishlist.model.js";
import UserAuthentication from "../Model/User.model.js";
import UserProfile from "../Model/userprofile.model.js";
import EmailVerification from "../Model/emailverification.model.js";

export const GetDashboard = async (req, res) => {
  try {
    const [
      totalProducts,
      totalCategories,
      totalUsers,
      totalProfiles,
      totalWishlist,
      totalCart,
      totalPendingVerification,
      totalVerifiedUsers,
      // inventorySummary,
      productsByCategory,
      lowStockProducts,
      recentUsers,
    ] = await Promise.all([
      Product.countDocuments(),
      Category.countDocuments(),
      UserAuthentication.countDocuments(),
      UserProfile.countDocuments(),
      Wishlist.countDocuments(),
      Cart.countDocuments(),
      EmailVerification.countDocuments({ isUsed: false }),
      UserAuthentication.countDocuments({ isVerified: true }),

      // Inventory.aggregate([
      //   {
      //     $group: {
      //       _id: null,
      //       totalStock: { $sum: "$stock" },
      //       inStock: {
      //         $sum: {
      //           $cond: [{ $eq: ["$status", "In Stock"] }, 1, 0],
      //         },
      //       },
      //       outOfStock: {
      //         $sum: {
      //           $cond: [{ $eq: ["$status", "Out Of Stock"] }, 1, 0],
      //         },
      //       },
      //     },
      //   },
      // ]),

      Product.aggregate([
        {
          $group: {
            _id: "$category_id",
            totalProducts: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $unwind: "$category",
        },
        {
          $project: {
            _id: 0,
            category: "$category.name",
            totalProducts: 1,
          },
        },
      ]),

      // Inventory.aggregate([
      //   {
      //     $match: {
      //       stock: { $lte: 10 },
      //     },
      //   },
      //   {
      //     $lookup: {
      //       from: "products",
      //       localField: "product_id",
      //       foreignField: "_id",
      //       as: "product",
      //     },
      //   },
      //   {
      //     $unwind: "$product",
      //   },
      //   {
      //     $project: {
      //       productName: "$product.name",
      //       stock: 1,
      //       status: 1,
      //     },
      //   },
      // ]),

      UserAuthentication.find()
        .select("email role isVerified createdAt")
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

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

          // Add after Order module
          totalOrders: 0,
          totalRevenue: 0,
          averageRating: 0,
        },

        // inventory: inventorySummary[0] || {
        //   totalStock: 0,
        //   inStock: 0,
        //   outOfStock: 0,
        // },

        charts: {
          productsByCategory,

          // Add after Order module
          ordersLast7Days: [],
          revenueLast7Days: [],
        },

        tables: {
          lowStockProducts,
          recentUsers,

          // Add after Order module
          recentOrders: [],
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
