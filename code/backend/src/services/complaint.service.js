const prisma = require('../utils/prisma');

const createComplaint = async (complaintData) => {
    return await prisma.complaint.create({
        data: complaintData
    });
};

const getComplaintsByUserId = async (userId) => {
    return await prisma.complaint.findMany({
        where: { userId },
        include: {
            booking: {
                include: {
                    route: {
                        include: {
                            driver: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    profilePicture: true
                                }
                            }
                        }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};

const getComplaintById = async (id) => {
    return await prisma.complaint.findUnique({
        where: { id },
        include: {
            booking: {
                include: {
                    route: {
                        include: {
                            driver: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    profilePicture: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });
};

module.exports = {
    createComplaint,
    getComplaintsByUserId,
    getComplaintById
};
