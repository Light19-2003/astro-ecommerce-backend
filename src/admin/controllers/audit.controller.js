import AuditLog from "../../models/AuditLog.model.js";

export const GetAuditLogs = async (req, res) => {
  try {
    const { action, module, search } = req.query;
    const filter = {};

    if (action && action !== "all") filter.action = action;
    if (module && module !== "all") filter.module = module;

    let logs = await AuditLog.find(filter)
      .populate("admin", "email role")
      .sort({ createdAt: -1 });

    if (search) {
      const query = String(search).toLowerCase();
      logs = logs.filter((log) => {
        const haystack = [
          log.action,
          log.module,
          log.targetName,
          log.description,
          log.admin?.email,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      });
    }

    return res.status(200).json({
      success: true,
      total: logs.length,
      data: logs,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
