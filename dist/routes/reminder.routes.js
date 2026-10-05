"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const reminder_controller_1 = require("../controllers/reminder.controller");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', reminder_controller_1.getReminders);
router.post('/', [
    (0, express_validator_1.body)('taskId').notEmpty().withMessage('Task ID is required'),
    (0, express_validator_1.body)('reminderTime').isISO8601().withMessage('Valid reminder time is required'),
], validate_1.validate, reminder_controller_1.createReminder);
router.delete('/:id', reminder_controller_1.deleteReminder);
exports.default = router;
//# sourceMappingURL=reminder.routes.js.map