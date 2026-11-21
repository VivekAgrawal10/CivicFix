const Report = require('../models/Report');
const User = require('../models/User');
const WorkOrder = require('../models/WorkOrder');

// GET /api/v1/dashboard/summary
const getDashboardSummary = async (req, res, next) => {
  try {
    const { role, _id: userId } = req.user;

    if (role === 'citizen') {
      const [myReports, pendingReports, resolvedReports, nearbyIssues] = await Promise.all([
        Report.count({ submittedBy: userId }),
        Report.count({ submittedBy: userId, status: 'pending' }),
        Report.count({ submittedBy: userId, status: 'resolved' }),
        Report.count({ statusIn: ['pending', 'assigned', 'in_progress'] }),
      ]);

      return res.json({
        success: true,
        role: 'citizen',
        data: { myReports, pendingReports, resolvedReports, nearbyIssues },
      });
    }

    if (role === 'admin') {
      const [
        totalReports,
        pendingReports,
        inProgress,
        resolved,
        totalUsers,
        openWorkOrders,
        criticalIssues,
        totalContractors,
      ] = await Promise.all([
        Report.count(),
        Report.count({ status: 'pending' }),
        Report.count({ status: 'in_progress' }),
        Report.count({ status: 'resolved' }),
        User.count({ isActive: true }),
        WorkOrder.count({ statusIn: ['open', 'in_progress'] }),
        Report.count({ priority: 'critical', statusNotIn: ['resolved', 'closed'] }),
        User.count({ role: 'contractor', isActive: true }),
      ]);

      return res.json({
        success: true,
        role: 'admin',
        data: {
          totalReports,
          pendingReports,
          inProgress,
          resolved,
          totalUsers,
          openWorkOrders,
          criticalIssues,
          totalContractors,
        },
      });
    }

    if (role === 'contractor') {
      const [assignedOrders, inProgress, completed, pendingEvidence] = await Promise.all([
        WorkOrder.count({ assignedContractor: userId }),
        WorkOrder.count({ assignedContractor: userId, status: 'in_progress' }),
        WorkOrder.count({ assignedContractor: userId, statusIn: ['completed', 'verified'] }),
        WorkOrder.count({ assignedContractor: userId, status: 'completed', withoutEvidence: true }),
      ]);

      return res.json({
        success: true,
        role: 'contractor',
        data: { assignedOrders, inProgress, completed, pendingEvidence },
      });
    }

    res.status(400).json({ success: false, message: 'Unknown role.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardSummary };
