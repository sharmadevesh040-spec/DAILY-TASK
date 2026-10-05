"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getMe = getMe;
exports.updateProfile = updateProfile;
exports.changePassword = changePassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../utils/prisma");
const jwt_1 = require("../utils/jwt");
const response_1 = require("../utils/response");
const DEFAULT_CATEGORIES = [
    { name: 'Work', color: '#3b82f6' },
    { name: 'Personal', color: '#8b5cf6' },
    { name: 'Study', color: '#f59e0b' },
    { name: 'Fitness', color: '#10b981' },
    { name: 'Projects', color: '#ef4444' },
    { name: 'Other', color: '#6b7280' },
];
async function register(req, res) {
    try {
        const { name, email, password } = req.body;
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            (0, response_1.errorResponse)(res, 'Email already in use', 409);
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma_1.prisma.user.create({
            data: { name, email, passwordHash },
            select: { id: true, name: true, email: true, avatar: true, createdAt: true },
        });
        // Seed default categories for the new user
        await prisma_1.prisma.category.createMany({
            data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: user.id })),
            skipDuplicates: true,
        });
        const token = (0, jwt_1.signToken)({ userId: user.id, email: user.email });
        (0, response_1.successResponse)(res, { token, user }, 'Account created successfully', 201);
    }
    catch (err) {
        console.error('Register error:', err);
        (0, response_1.errorResponse)(res, 'Failed to create account', 500);
    }
}
async function login(req, res) {
    try {
        const { email, password } = req.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            (0, response_1.errorResponse)(res, 'Invalid email or password', 401);
            return;
        }
        const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!valid) {
            (0, response_1.errorResponse)(res, 'Invalid email or password', 401);
            return;
        }
        const token = (0, jwt_1.signToken)({ userId: user.id, email: user.email });
        const { passwordHash: _, ...safeUser } = user;
        (0, response_1.successResponse)(res, { token, user: safeUser }, 'Login successful');
    }
    catch (err) {
        console.error('Login error:', err);
        (0, response_1.errorResponse)(res, 'Login failed', 500);
    }
}
async function getMe(req, res) {
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.userId },
            select: { id: true, name: true, email: true, avatar: true, createdAt: true, updatedAt: true },
        });
        if (!user) {
            (0, response_1.errorResponse)(res, 'User not found', 404);
            return;
        }
        (0, response_1.successResponse)(res, { user });
    }
    catch (err) {
        console.error('GetMe error:', err);
        (0, response_1.errorResponse)(res, 'Failed to fetch user', 500);
    }
}
async function updateProfile(req, res) {
    try {
        const { name, avatar } = req.body;
        const user = await prisma_1.prisma.user.update({
            where: { id: req.userId },
            data: { name, avatar },
            select: { id: true, name: true, email: true, avatar: true, createdAt: true, updatedAt: true },
        });
        (0, response_1.successResponse)(res, { user }, 'Profile updated');
    }
    catch (err) {
        console.error('UpdateProfile error:', err);
        (0, response_1.errorResponse)(res, 'Failed to update profile', 500);
    }
}
async function changePassword(req, res) {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { id: req.userId } });
        if (!user) {
            (0, response_1.errorResponse)(res, 'User not found', 404);
            return;
        }
        const valid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!valid) {
            (0, response_1.errorResponse)(res, 'Current password is incorrect', 401);
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
        await prisma_1.prisma.user.update({ where: { id: req.userId }, data: { passwordHash } });
        (0, response_1.successResponse)(res, null, 'Password changed successfully');
    }
    catch (err) {
        console.error('ChangePassword error:', err);
        (0, response_1.errorResponse)(res, 'Failed to change password', 500);
    }
}
//# sourceMappingURL=auth.controller.js.map