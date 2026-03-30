const userService = require("../services/user.service");

exports.getUserDashboard = async (req, res) => {
  const viewerId = req.headers["x-user-id"] || 0;
  const { userId } = req.params;

  const data = await userService.getUserDashboard(viewerId, userId);
  res.json(data);
};
