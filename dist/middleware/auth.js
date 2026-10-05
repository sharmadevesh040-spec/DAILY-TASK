"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jwt_1 = require("../utils/jwt");
const response_1 = require("../utils/response");
function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            (0, response_1.errorResponse)(res, 'Access token required', 401);
            return;
        }
        const token = authHeader.split(' ')[1];
        const decoded = (0, jwt_1.verifyToken)(token);
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        next();
    }
    catch {
        (0, response_1.errorResponse)(res, 'Invalid or expired token', 401);
    }
}
//# sourceMappingURL=auth.js.map