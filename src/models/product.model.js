import mango from "mongoose";
const productSchema = new mango.Schema(
  {
    category_id: {
      type: mango.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    mrp: {
      type: Number,
      default: function () {
        return this.price;
      },
      min: 0,
    },

    size: {
      type: String,
      default: "Standard",
    },

    producthightlight: {
      type: String,
      required: true,
    },

    stock: {
      type: Number,

      default: 0,
      min: 0,
    },

    brand: {
      type: String,
      required: true,
    },

    localimage: {
      type: String,
      required: true,
    },

    image: {
      type: String,
      required: true,
    },

    public_id: {
      type: String,
    },
    storageProvider: {
      type: String,
      enum: ["local", "cloudinary", "s3"],
      default: "cloudinary",
    },
  },
  {
    timestamps: true,
  },
);

export default mango.model("ProductModel", productSchema, "products");
