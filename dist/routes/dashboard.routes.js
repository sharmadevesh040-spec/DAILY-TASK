"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/stats', dashboard_controller_1.getDashboardStats);
router.get('/streak', dashboard_controller_1.getStreak);
router.get('/calendar', dashboard_controller_1.getCalendarTasks);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map