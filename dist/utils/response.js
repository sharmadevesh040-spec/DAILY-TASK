"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
function successResponse(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
}
function errorResponse(res, message, statusCode = 400, errors) {
    const body = { success: false, message };
    if (errors)
        body['errors'] = errors;
    return res.status(statusCode).json(body);
}
//# sourceMappingURL=response.js.map