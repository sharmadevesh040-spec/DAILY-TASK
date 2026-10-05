"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
router.post('/register', [
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Name is required'),
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    (0, express_validator_1.body)('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password)
            throw new Error('Passwords do not match');
        return true;
    }),
], validate_1.validate, auth_controller_1.register);
router.post('/login', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
], validate_1.validate, auth_controller_1.login);
router.get('/me', auth_1.authenticate, auth_controller_1.getMe);
router.put('/profile', auth_1.authenticate, auth_controller_1.updateProfile);
router.put('/change-password', auth_1.authenticate, [
    (0, express_validator_1.body)('currentPassword').notEmpty().withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
], validate_1.validate, auth_controller_1.changePassword);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map