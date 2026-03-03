const prisma = require('../utils/prisma')

const registerToken = async (userId, token, platform = 'web') => {
    if (!token) return null

    return prisma.pushSubscription.upsert({
        where: { endpoint: token },
        update: { userId, key: { platform } },
        create: { endpoint: token, key: { platform }, userId },
    })
}

const getTokensByUser = async (userId) => {
    return prisma.pushSubscription.findMany({
        where: { userId },
        select: { endpoint: true },
    })
}

const deleteToken = async (endpoint) => {
    if (!endpoint) return null
    try {
        return await prisma.pushSubscription.delete({ where: { endpoint } })
    } catch (err) {
        return null
    }
}

module.exports = {
    registerToken,
    getTokensByUser,
    deleteToken,
}