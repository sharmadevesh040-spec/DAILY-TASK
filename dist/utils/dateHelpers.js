"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addDays = addDays;
exports.addWeeks = addWeeks;
exports.addMonths = addMonths;
exports.isWeekend = isWeekend;
exports.startOfDay = startOfDay;
exports.endOfDay = endOfDay;
exports.startOfWeek = startOfWeek;
exports.endOfWeek = endOfWeek;
exports.startOfMonth = startOfMonth;
exports.endOfMonth = endOfMonth;
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
function addWeeks(date, weeks) {
    return addDays(date, weeks * 7);
}
function addMonths(date, months) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
}
function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
}
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}
function startOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return startOfDay(d);
}
function endOfWeek(date) {
    const start = startOfWeek(date);
    return endOfDay(addDays(start, 6));
}
function startOfMonth(date) {
    return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}
function endOfMonth(date) {
    return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}
//# sourceMappingURL=dateHelpers.js.map