import mango from "mongoose";
import { type } from "node:os";

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
    size: {
      type: String,
      enum: ["small", "medium", "large"],
      required: true,
      default: "small",
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
  },
  {
    timestamps: true,
  },
);

export default mango.model("ProductModel", productSchema);
