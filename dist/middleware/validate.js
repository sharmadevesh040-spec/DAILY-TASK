"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const express_validator_1 = require("express-validator");
const response_1 = require("../utils/response");
function validate(req, res, next) {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        (0, response_1.errorResponse)(res, 'Validation failed', 422, errors.array());
        return;
    }
    next();
}
//# sourceMappingURL=validate.js.map