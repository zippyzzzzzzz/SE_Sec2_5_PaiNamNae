const prisma = require('../utils/prisma');
const ApiError = require('../utils/ApiError');
//New from Weerawong
const pushService = require('./push.service.js');
const { sendFcmNotification } = require('../utils/fcm');

const baseSelect = {
    id: true,
    userId: true,
    type: true,
    title: true,
    body: true,
    link: true,
    metadata: true,
    readAt: true,
    adminReviewedAt: true,
    createdAt: true,
};

const buildWhere = (opts = {}) => {
    const { q, type, read, createdFrom, createdTo, userId, adminReviewed } = opts;

    return {
        ...(userId && { userId }),
        ...(type && { type }),
        ...(typeof read === 'boolean'
            ? (read
                ? { readAt: { not: null } }
                : { readAt: null })
            : {}),
        ...(typeof adminReviewed === 'boolean'
            ? (adminReviewed ? { adminReviewedAt: { not: null } } : { adminReviewedAt: null })
            : {}),
        ...((createdFrom || createdTo)
            ? {
                createdAt: {
                    ...(createdFrom ? { gte: new Date(createdFrom) } : {}),
                    ...(createdTo ? { lte: new Date(createdTo) } : {}),
                },
            }
            : {}),
        ...(q
            ? {
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { body: { contains: q, mode: 'insensitive' } },
                ],
            }
            : {}),
    };
};

const listMyNotifications = async (ownerId, opts = {}) => {
    const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        ...filters
    } = opts;

    const where = buildWhere({ ...filters, userId: ownerId });

    const skip = (page - 1) * limit;
    const take = limit;

    const [total, data] = await prisma.$transaction([
        prisma.notification.count({ where }),
        prisma.notification.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip,
            take,
            select: baseSelect,
        }),
    ]);

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const listNotificationsAdmin = async (opts = {}) => {
    const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        ...filters
    } = opts;

    const where = buildWhere(filters);

    const skip = (page - 1) * limit;
    const take = limit;

    const [total, data] = await prisma.$transaction([
        prisma.notification.count({ where }),
        prisma.notification.findMany({
            where,
            orderBy: { [sortBy]: sortOrder },
            skip,
            take,
            select: {
                ...baseSelect,
                user: { select: { id: true, email: true, username: true, firstName: true, lastName: true } },
            },
        }),
    ]);

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const getMyNotificationById = async (id, ownerId) => {
    const n = await prisma.notification.findUnique({
        where: { id },
        select: baseSelect,
    });
    if (!n || n.userId !== ownerId) {
        throw new ApiError(404, 'Notification not found');
    }
    return n;
};

const createNotificationByAdmin = async (payload) => {
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true } });
    if (!user) throw new ApiError(404, 'User not found');

    const created = await prisma.notification.create({
        data: payload,
        select: baseSelect,
    });
    return created;
};

const markRead = async (id, ownerId) => {
    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n || n.userId !== ownerId) throw new ApiError(404, 'Notification not found');

    return prisma.notification.update({
        where: { id },
        data: { readAt: new Date() },
        select: baseSelect,
    });
};

const markUnread = async (id, ownerId) => {
    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n || n.userId !== ownerId) throw new ApiError(404, 'Notification not found');

    return prisma.notification.update({
        where: { id },
        data: { readAt: null },
        select: baseSelect,
    });
};

const adminMarkRead = async (id) => {
    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n) throw new ApiError(404, 'Notification not found');

    return prisma.notification.update({
        where: { id },
        data: { adminReviewedAt: new Date() },
        select: baseSelect,
    });
};

const markAllRead = async (ownerId) => {
    const result = await prisma.notification.updateMany({
        where: { userId: ownerId, readAt: null },
        data: { readAt: new Date() },
    });
    return { updated: result.count };
};

const deleteMyNotification = async (id, ownerId) => {
    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n || n.userId !== ownerId) throw new ApiError(404, 'Notification not found');

    await prisma.notification.delete({ where: { id } });
    return { id };
};

const deleteNotificationByAdmin = async (id) => {
    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n) throw new ApiError(404, 'Notification not found');

    await prisma.notification.delete({ where: { id } });
    return { id };
};

const countUnread = async (ownerId) => {
    const total = await prisma.notification.count({
        where: { userId: ownerId, readAt: null },
    });
    return { unread: total };
};

const createMessageNotification = async ({
    recipientId,
    bookingId,
    routeId,
    senderId,
    senderName,
    content,
}) => {
    const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient) throw new ApiError(404, 'Recipient not found');

    const notification = await prisma.notification.create({
        data: {
            userId: recipientId,
            type: 'BOOKING',
            title: 'มีข้อความใหม่ จาก painamnae',
            body: `${senderName}: ${content.slice(0, 120)}`,
            link: `/myTrip/${routeId}`,
            metadata: {
                category: 'MESSAGE',
                bookingId,
                senderId,
                recipientId,
                routeId,
            },
        },
        select: baseSelect,
    });

    const tokens = await pushService.getTokensByUser(recipientId);
    const endpoints = [...tokens.map((t) => t.endpoint)]
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i);

    let pushResult = { sent: false, reason: 'no-tokens' };

    if (endpoints.length) {
        try {
            const fcmResult = await sendFcmNotification({
                tokens: endpoints,
                title: notification.title,
                body: notification.body,
                data: {
                    notificationId: String(notification.id),
                    bookingId: String(bookingId),
                    category: 'MESSAGE',
                    link: notification.link || '/notifications',
                    click_action: notification.link || '/notifications',
                },
            });

            pushResult = { sent: true, fcmResult };

            if (fcmResult?.skipped) {
                pushResult = { sent: false, reason: fcmResult.reason || 'skipped' };
            }
        } catch (err) {
            const msg = err?.response?.data?.error?.message || err?.message;
            const token = err?.token;
            if (msg === 'NotRegistered' && token) {
                await pushService.deleteToken(token);
            }
            pushResult = { sent: false, reason: msg };
            console.warn('[FCM] send error', msg);
        }
    } else {
        console.warn('[FCM] no tokens for recipient', { recipientId });
    }

    return { notification, pushResult };
};

const createBookingMessage = async ({ bookingId, content, senderId }) => {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { route: true },
    });
    if (!booking) throw new ApiError(404, 'Booking not found');

    const isDriver = booking.route.driverId === senderId;
    const isPassenger = booking.passengerId === senderId;
    if (!isDriver && !isPassenger) throw new ApiError(403, 'Forbidden');

    const recipientId = isDriver ? booking.passengerId : booking.route.driverId;

    const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { firstName: true, lastName: true },
    });
    const senderName = [sender?.firstName, sender?.lastName].filter(Boolean).join(' ') || 'ผู้ใช้';

    const message = await prisma.message.create({
        data: { bookingId, senderId, content },
    });

    const { notification, pushResult } = await createMessageNotification({
        recipientId,
        bookingId,
        routeId: booking.routeId,
        senderId,
        senderName,
        content,
    });

    return { message, notification, pushResult };
};

const getBookingMessages = async (bookingId, userId) => {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { route: true },
    });

    if (!booking) {
        throw new ApiError(404, 'Booking not found');
    }

    const isDriver = booking.route.driverId === userId;
    const isPassenger = booking.passengerId === userId;
    if (!isDriver && !isPassenger) {
        throw new ApiError(403, 'You are not part of this booking');
    }

    return await prisma.bookingMessage.findMany({
        where: { bookingId },
        orderBy: { createdAt: 'asc' },
    });
}

module.exports = {
    listMyNotifications,
    listNotificationsAdmin,
    getMyNotificationById,
    createNotificationByAdmin,
    markRead,
    markUnread,
    markAllRead,
    deleteMyNotification,
    deleteNotificationByAdmin,
    countUnread,
    adminMarkRead,
    //New from Weerawong
    createMessageNotification,
    createBookingMessage,
    getBookingMessages,
};
