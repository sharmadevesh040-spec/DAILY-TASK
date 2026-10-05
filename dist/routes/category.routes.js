"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const category_controller_1 = require("../controllers/category.controller");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', category_controller_1.getCategories);
router.post('/', [
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Category name is required'),
    (0, express_validator_1.body)('color').optional().isHexColor().withMessage('Invalid color format'),
], validate_1.validate, category_controller_1.createCategory);
router.put('/:id', [
    (0, express_validator_1.body)('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    (0, express_validator_1.body)('color').optional().isHexColor().withMessage('Invalid color format'),
], validate_1.validate, category_controller_1.updateCategory);
router.delete('/:id', category_controller_1.deleteCategory);
exports.default = router;
//# sourceMappingURL=category.routes.js.map