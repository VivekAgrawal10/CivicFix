const express = require('express');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const c = require('../controllers/admin.controller');

const router = express.Router();
router.use(auth, authorize('admin'));

router.get('/analytics', c.getAnalytics);
router.get('/reports', c.listReports);
router.get('/reports/:id', c.getReportDetail);
router.post('/reports/:id/verify', c.verify);
router.post('/reports/:id/reject', c.reject);
router.post('/reports/:id/assign', c.assign);
router.post('/reports/:id/resolve', c.resolveDirect);
router.post('/reports/:id/priority-zone', c.setPriorityZone);
router.post('/reports/:id/severity', c.setSeverity);
router.get('/clusters', c.clusters);
router.get('/workorders', c.listWorkOrders);
router.get('/contractors', c.listContractors);
router.post('/contractors', c.createContractor);
router.get('/users', c.listUsers);
router.get('/users/:id/creds', c.userCreds);
router.post('/users/:id/creds', c.adjustCreds);
router.patch('/users/:id/active', c.setActive);
router.get('/activity', c.activity);
router.get('/export/reports.csv', c.exportReports);

module.exports = router;
