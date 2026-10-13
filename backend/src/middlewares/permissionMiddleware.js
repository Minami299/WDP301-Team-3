const { User } = require("../models");
const { permissionsOf } = require("../configs/permissions");

// Loads the caller fresh so a lock or role change applies before the token expires.
const requirePermission = (permission) => async (req, res, next) => {
  try {
    const actor = await User.findById(req.user.id)
      .select("status role_id")
      .populate("role_id");
    if (!actor || actor.status !== "ACTIVE" || !actor.role_id) {
      return res
        .status(403)
        .json({ success: false, message: "Account is locked or inactive" });
    }
    if (!permissionsOf(actor.role_id).includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: missing permission ${permission}`,
      });
    }
    req.user.role = actor.role_id.role_name;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { requirePermission };
