import UserModel from "../../models/User.model.js";

export const canManageOrders = async (req, res, next) => {
  const allowedRoles = ["admin", "superAdmin", "orderManager"];

  if (!allowedRoles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: "You are not allowed to manage orders" });
  }

  const user = await UserModel.findById(req.user.id).select("role isActive");
  if (!user || user.isActive === false || !allowedRoles.includes(user.role)) {
    return res.status(403).json({ success: false, message: "You are not allowed to manage orders" });
  }

  req.user.role = user.role;
  next();
};
