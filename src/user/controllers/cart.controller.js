import mongoose from "mongoose";
import cartModel from "../../models/cart.model.js";
import ProductModel from "../../models/product.model.js";

const ADMIN_PURCHASE_ROLES = ["admin", "superAdmin", "orderManager"];
const ADMIN_PURCHASE_MESSAGE =
  "Admin accounts cannot add products to cart or place orders. Please use a customer account.";

const assertCustomerCanPurchase = (user = {}) => {
  if (ADMIN_PURCHASE_ROLES.includes(user.role)) {
    const error = new Error(ADMIN_PURCHASE_MESSAGE);
    error.status = 403;
    throw error;
  }
};

const normalizeSelectedVariants = (selectedVariants = {}) => {
  if (!selectedVariants || typeof selectedVariants !== "object") return {};

  return Object.entries(selectedVariants).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      acc[key] = String(value);
    }
    return acc;
  }, {});
};

const buildVariantKey = (selectedVariants = {}) =>
  Object.keys(selectedVariants)
    .sort()
    .map((key) => `${key}:${selectedVariants[key]}`)
    .join("|");

const getProductId = (item = {}) => item.productId || item.product || item.id || item._id;

const getOrCreateCart = async (userId) => {
  let cart = await cartModel.findOne({ user: userId });

  if (!cart) {
    cart = await cartModel.create({
      user: userId,
      items: [],
    });
  }

  return cart;
};

const populateCart = async (cart) => {
  await cart.populate({
    path: "items.product",
    populate: { path: "category_id", select: "name" },
  });

  return cart;
};

const findCartItem = (cart, { cartItemId, productId, variantKey = "" }) => {
  if (cartItemId) {
    return cart.items.find((item) => item._id.toString() === String(cartItemId));
  }

  return cart.items.find(
    (item) =>
      item.product.toString() === String(productId) &&
      String(item.variantKey || "") === String(variantKey || ""),
  );
};

const validateProductId = (productId) => {
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    const error = new Error("Invalid product id");
    error.status = 400;
    throw error;
  }
};

const addItemsToCart = async (userId, items) => {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("Items are required");
    error.status = 400;
    throw error;
  }

  const cart = await getOrCreateCart(userId);

  for (const item of items) {
    const productId = getProductId(item);
    const quantity = Math.max(1, Number(item.quantity || item.qty || 1));
    const selectedVariants = normalizeSelectedVariants(item.selectedVariants);
    const variantKey = buildVariantKey(selectedVariants);

    validateProductId(productId);

    const product = await ProductModel.findById(productId);
    if (!product) {
      const error = new Error("Product not found");
      error.status = 404;
      throw error;
    }

    const existingItem = findCartItem(cart, { productId, variantKey });
    const nextQuantity = (existingItem?.quantity || 0) + quantity;

    if (product.stock < nextQuantity) {
      const error = new Error(`${product.name} has only ${product.stock} item(s) in stock`);
      error.status = 400;
      throw error;
    }

    const itemPrice = Number(item.price ?? product.price) || 0;
    const itemMrp = Number(item.mrp ?? product.mrp ?? itemPrice) || itemPrice;

    if (existingItem) {
      existingItem.quantity = nextQuantity;
      existingItem.price = itemPrice;
      existingItem.mrp = itemMrp;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        selectedVariants,
        variantKey,
        price: itemPrice,
        mrp: itemMrp,
      });
    }
  }

  await cart.save();
  return populateCart(cart);
};

export const addToCart = async (req, res) => {
  try {
    assertCustomerCanPurchase(req.user);
    const cart = await addItemsToCart(req.user.id, req.body.items);

    return res.status(200).json({
      success: true,
      message: "Items added successfully",
      data: cart,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const singleProduct = async (req, res) => {
  try {
    assertCustomerCanPurchase(req.user);
    const productId = req.body.productId || req.body.product;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "ProductId is required",
      });
    }

    const cart = await addItemsToCart(req.user.id, [
      {
        productId,
        quantity: req.body.quantity || req.body.qty || 1,
        selectedVariants: req.body.selectedVariants,
        price: req.body.price,
        mrp: req.body.mrp,
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Product added successfully",
      data: cart,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateQuantity = async (req, res) => {
  try {
    assertCustomerCanPurchase(req.user);
    const userId = req.user.id;
    const { cartItemId, productId, selectedVariants } = req.body;
    const quantity = Number(req.body.quantity || req.body.qty);

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const cart = await cartModel.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const variantKey = buildVariantKey(normalizeSelectedVariants(selectedVariants));
    const cartItem = findCartItem(cart, { cartItemId, productId, variantKey });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      });
    }

    const product = await ProductModel.findById(cartItem.product);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `${product.name} has only ${product.stock} item(s) in stock`,
      });
    }

    cartItem.quantity = quantity;
    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Quantity updated successfully",
      data: await populateCart(cart),
    });
  } catch (ex) {
    return res.status(ex.status || 500).json({
      success: false,
      message: ex.message,
    });
  }
};

export const incrementQuantity = async (req, res) => {
  req.body.quantity = Number(req.body.quantity || 0) + 1;

  if (!req.body.quantity || req.body.quantity === 1) {
    const cart = await cartModel.findOne({ user: req.user.id });
    const cartItem = cart && findCartItem(cart, req.body);
    req.body.quantity = (cartItem?.quantity || 0) + 1;
  }

  return updateQuantity(req, res);
};

export const decrementedQuantity = async (req, res) => {
  const cart = await cartModel.findOne({ user: req.user.id });
  const cartItem = cart && findCartItem(cart, req.body);

  if (!cartItem || cartItem.quantity <= 1) {
    return res.status(400).json({
      success: false,
      message: "Quantity can't be less than 1",
    });
  }

  req.body.quantity = cartItem.quantity - 1;
  return updateQuantity(req, res);
};

export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await cartModel.findOne({ user: userId });

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "Cart is empty",
        data: {
          user: userId,
          items: [],
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: cart.items.length === 0 ? "Cart is empty" : "Cart found successfully",
      data: await populateCart(cart),
    });
  } catch (ex) {
    return res.status(500).json({
      success: false,
      message: ex.message,
    });
  }
};

export const deletecartproduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartItemId, productId, selectedVariants } = req.body;

    const cart = await cartModel.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const variantKey = buildVariantKey(normalizeSelectedVariants(selectedVariants));
    const cartItem = findCartItem(cart, { cartItemId, productId, variantKey });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      });
    }

    cart.items = cart.items.filter((item) => item._id.toString() !== cartItem._id.toString());
    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: await populateCart(cart),
    });
  } catch (ex) {
    return res.status(500).json({
      success: false,
      message: ex.message,
    });
  }
};

export const clearCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    cart.items = [];
    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      data: await populateCart(cart),
    });
  } catch (ex) {
    return res.status(500).json({
      success: false,
      message: ex.message,
    });
  }
};
