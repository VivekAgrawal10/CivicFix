const express = require('express');
const router = express.Router();
const {
  createWorkOrder,
  getWorkOrders,
  getWorkOrderById,
  updateWorkOrderStatus,
  uploadEvidence,
  getWorkOrdersByContractor,
} = require('../controllers/workorder.controller');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const upload = require('../middleware/upload');

// Specific routes before parameterized
router.get('/contractor/:contractorId', auth, authorize('admin'), getWorkOrdersByContractor);

router.post('/', auth, authorize('admin'), createWorkOrder);
router.get('/', auth, authorize('admin', 'contractor'), getWorkOrders);
router.get('/:id', auth, authorize('admin', 'contractor'), getWorkOrderById);
router.patch('/:id/status', auth, authorize('admin', 'contractor'), updateWorkOrderStatus);
router.post('/:id/evidence', auth, authorize('admin', 'contractor'), upload.array('images', 5), uploadEvidence);

module.exports = router;
