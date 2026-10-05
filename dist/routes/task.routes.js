"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const task_controller_1 = require("../controllers/task.controller");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/today', task_controller_1.getTodayTasks);
router.get('/', task_controller_1.getTasks);
router.get('/:id', task_controller_1.getTask);
router.post('/', [(0, express_validator_1.body)('title').trim().notEmpty().withMessage('Title is required')], validate_1.validate, task_controller_1.createTask);
router.put('/:id', [(0, express_validator_1.body)('title').optional().trim().notEmpty().withMessage('Title cannot be empty')], validate_1.validate, task_controller_1.updateTask);
router.delete('/:id', task_controller_1.deleteTask);
router.patch('/:id/status', [
    (0, express_validator_1.body)('status')
        .isIn(['TODO', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'])
        .withMessage('Invalid status'),
], validate_1.validate, task_controller_1.updateTaskStatus);
exports.default = router;
//# sourceMappingURL=task.routes.js.map