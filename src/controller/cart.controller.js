import cartModel from "../Model/cart.model.js";

export const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "Items are required",
      });
    }

    // Find user's cart
    let cart = await cartModel.findOne({ user: userId });

    // If cart doesn't exist, create one
    if (!cart) {
      cart = await cartModel.create({
        user: userId,
        items: [],
      });
    }

    // Loop through all incoming items
    for (const item of items) {
      // Check if product already exists in cart
      const existingItem = cart.items.find(
        (cartItem) => cartItem.product.toString() === item.productId,
      );

      if (existingItem) {
        return res.status(400).json({
          message: "Product already exists in cart",
        });
      }

      // Add new product
      cart.items.push({
        product: item.productId,
        quantity: item.quantity,
      });
    }

    // Save cart
    await cart.save();

    return res.status(200).json({
      message: "Items added successfully",
      data: cart,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const singleProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    // Validate request
    if (!productId) {
      return res.status(400).json({
        message: "ProductId is required",
      });
    }

    // Find user's cart
    let cart = await cartModel.findOne({ user: userId });

    // If cart doesn't exist, create one with the first product
    if (!cart) {
      cart = await cartModel.create({
        user: userId,
        items: [
          {
            product: productId,
            quantity: 1,
          },
        ],
      });

      return res.status(201).json({
        message: "Product added successfully",
        data: cart,
      });
    }

    // Check if product already exists
    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId,
    );

    if (existingItem) {
      return res.status(400).json({
        message: "Product already exists in cart",
      });
    }

    // Add new product
    cart.items.push({
      product: productId,
      quantity: 1,
    });

    // Save changes
    await cart.save();

    return res.status(200).json({
      message: "Product added successfully",
      data: cart,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

export const incrementQuantity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    let cart = await cartModel.findOne({ user: userId });

    if (!cart) {
      return res.status(400).json({
        message: "Cart not found",
      });
    }

    let product = cart.items.find(
      (item) => item.product.toString() === productId,
    );

    if (!product) {
      return res.status(400).json({
        message: "No product found in cart",
      });
    } else {
      product.quantity += 1;
      await cart.save();
      return res.status(200).json({
        message: "Quantity incremented successfully",
        data: cart,
      });
    }
  } catch (ex) {
    console.log(ex);
    return res.status(500).json({
      message: ex.message,
    });
  }
};

export const decrementedQuantity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    let cart = await cartModel.findOne({ user: userId });

    if (!cart) {
      return res.status(400).json({
        message: "Cart not found",
      });
    }

    let product = cart.items.find(
      (item) => item.product.toString() === productId,
    );

    if (!product) {
      return res.status(400).json({
        message: "No product found in cart",
      });
    } else {
      if (product.quantity > 1) {
        product.quantity -= 1;
      } else {
        return res.status(400).json({
          message: "Quantity can't be less than 1",
        });
      }

      await cart.save();
      return res.status(200).json({
        message: "Quantity decremented successfully",
        data: cart,
      });
    }
  } catch (ex) {
    console.log(ex);
    return res.status(500).json({
      message: ex.message,
    });
  }
};

export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await cartModel
      .findOne({ user: userId })
      .populate("items.product");

    if (!cart) {
      return res.status(400).json({
        message: "Cart not found",
      });
    }

    if (cart.items.length === 0) {
      return res.status(200).json({
        message: "Cart is empty",
        data: {
          items: [],
        },
      });
    }

    return res.status(200).json({
      message: "Cart found successfully",
      data: cart,
    });
  } catch (ex) {
    console.log(ex);
    return res.status(500).json({
      message: ex.message,
    });
  }
};

export const deletecartproduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        message: "ProductId is required",
      });
    }

    let cart = await cartModel.findOne({ user: userId });

    if (!cart) {
      return res.status(400).json({
        message: "Cart not found",
      });
    }

    const product = cart.items.find(
      (item) => item.product.toString() === productId,
    );

    if (!product) {
      return res.status(400).json({
        message: "product not found in cart",
      });
    } else {
      const newItems = cart.items.filter(
        (item) => item.product.toString() !== productId,
      );
      cart.items = newItems;
      await cart.save();
      return res.status(200).json({
        message: "Product deleted successfully",
        data: cart,
      });
    }
  } catch (ex) {
    console.log(ex);
    return res.status(500).json({
      message: ex.message,
    });
  }
};
