/**
 * socketEvents.js
 * Helper functions to emit Socket.IO events from anywhere in the application.
 * Import getIO from config/socket.js which returns the initialised io instance.
 */

const { getIO } = require('../config/socket');

/**
 * Emit a report status change to:
 *  - All admins (via the 'admins' room)
 *  - The report submitter (via their personal user room)
 *
 * @param {Object} report - Report object (submittedBy populated)
 */
const emitReportStatusChange = (report) => {
  try {
    const io = getIO();
    const payload = {
      reportId: report._id,
      title: report.title,
      status: report.status,
      updatedAt: report.updatedAt,
    };

    // Notify all admins
    io.to('admins').emit('report_update', payload);

    // Notify the citizen who submitted the report
    if (report.submittedBy) {
      const userId = report.submittedBy._id
        ? report.submittedBy._id.toString()
        : report.submittedBy.toString();
      io.to(`user_${userId}`).emit('report_update', payload);
    }
  } catch (err) {
    console.error('[SocketEvents] emitReportStatusChange error:', err.message);
  }
};

/**
 * Emit a new work order assignment to a specific contractor.
 *
 * @param {Object} workOrder - WorkOrder object
 * @param {String} contractorId - ObjectId string of the contractor user
 */
const emitNewWorkOrder = (workOrder, contractorId) => {
  try {
    const io = getIO();
    io.to(`user_${contractorId.toString()}`).emit('work_order', {
      workOrderId: workOrder._id,
      reportId: workOrder.report,
      status: workOrder.status,
      scheduledDate: workOrder.scheduledDate,
      priority: workOrder.priority,
    });
  } catch (err) {
    console.error('[SocketEvents] emitNewWorkOrder error:', err.message);
  }
};

/**
 * Broadcast a civic alert to ALL connected users.
 *
 * @param {Object} alert - { title, message, severity, area }
 */
const emitCivicAlert = (alert) => {
  try {
    const io = getIO();
    io.emit('civic_alert', {
      ...alert,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[SocketEvents] emitCivicAlert error:', err.message);
  }
};

/**
 * Emit a notification to a specific user's personal room.
 *
 * @param {String} userId - ObjectId string of the recipient user
 * @param {Object} notification - Notification object
 */
const emitNotification = (userId, notification) => {
  try {
    const io = getIO();
    io.to(`user_${userId.toString()}`).emit('notification', {
      _id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      relatedReport: notification.relatedReport,
      createdAt: notification.createdAt,
    });
  } catch (err) {
    console.error('[SocketEvents] emitNotification error:', err.message);
  }
};

module.exports = {
  emitReportStatusChange,
  emitNewWorkOrder,
  emitCivicAlert,
  emitNotification,
};
