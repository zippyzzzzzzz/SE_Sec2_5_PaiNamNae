const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const ApiError = require("../utils/ApiError");

class ReportService {
  // Create a new report
  async createReport(reportData, passengerId) {
    const { bookingId, category, reportTopic, reportDescription, reportImages, reportVideo, contactFirstName, contactLastName, contactPhoneNumber, contactEmail } = reportData;

    // Validate booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        route: {
          select: { status: true, updatedAt: true }
        }
      }
    });

    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }

    // Verify passenger owns this booking
    if (booking.passengerId !== passengerId) {
      throw new ApiError(403, "You can only report your own bookings");
    }

    // Check if route is completed
    if (booking.route.status !== "COMPLETED") {
      throw new ApiError(400, "Can only report completed routes");
    }

    // Check if within 3-day report window (from route updatedAt)
    const routeCompletedAt = new Date(booking.route.updatedAt);
    const now = new Date();
    const daysDifference = (now - routeCompletedAt) / (1000 * 60 * 60 * 24);

    if (daysDifference > 3) {
      throw new ApiError(400, "Report window closed. You can only report within 3 days of trip completion");
    }

    // Get passenger contact info from user
    const passenger = await prisma.user.findUnique({
      where: { id: passengerId },
      select: { firstName: true, lastName: true, phoneNumber: true, email: true }
    });

    // Validate contact info
    const contactInfo = {
      firstName: contactFirstName || passenger?.firstName || "",
      lastName: contactLastName || passenger?.lastName || "",
      phoneNumber: contactPhoneNumber || passenger?.phoneNumber || "",
      email: contactEmail || passenger?.email || ""
    };

    if (!contactInfo.phoneNumber || !contactInfo.email) {
      throw new ApiError(400, "Contact phone number and email are required");
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        bookingId,
        passengerId,
        category,
        reportTopic,
        reportDescription,
        reportImages: reportImages || null,
        reportVideo: reportVideo || null,
        contactFirstName: contactInfo.firstName,
        contactLastName: contactInfo.lastName,
        contactPhoneNumber: contactInfo.phoneNumber,
        contactEmail: contactInfo.email,
        reportStatus: "PENDING"
      },
      include: {
        booking: {
          select: {
            id: true,
            route: {
              select: {
                driver: { select: { id: true, firstName: true, lastName: true } }
              }
            }
          }
        }
      }
    });

    return report;
  }

  // Get user's reports with pagination
  async getUserReports(passengerId, queryParams = {}) {
    const { page = 1, limit = 10, status, category } = queryParams;
    const skip = (page - 1) * limit;

    const whereClause = { passengerId };
    
    if (status) {
      whereClause.reportStatus = status;
    }
    if (category) {
      whereClause.category = category;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: whereClause,
        include: {
          booking: {
            select: {
              route: {
                select: {
                  id: true,
                  startLocation: true,
                  endLocation: true,
                  departureTime: true,
                  driver: { select: { firstName: true, lastName: true, profilePicture: true } }
                }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit)
      }),
      prisma.report.count({ where: whereClause })
    ]);

    return {
      data: reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get single report by ID
  async getReportById(reportId, userId) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        booking: {
          include: {
            route: {
              select: {
                id: true,
                startLocation: true,
                endLocation: true,
                departureTime: true,
                driver: { select: { id: true, firstName: true, lastName: true, profilePicture: true } }
              }
            }
          }
        }
      }
    });

    if (!report) {
      throw new ApiError(404, "Report not found");
    }

    // Only passenger can view their own report
    if (report.passengerId !== userId) {
      throw new ApiError(403, "Unauthorized access to report");
    }

    return report;
  }

  // Get reports for a specific booking (passenger view only)
  async getBookingReports(bookingId, passengerId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { passengerId: true }
    });

    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }

    if (booking.passengerId !== passengerId) {
      throw new ApiError(403, "Unauthorized access to booking");
    }

    const reports = await prisma.report.findMany({
      where: { bookingId },
      orderBy: { createdAt: "desc" }
    });

    return reports;
  }

  // Update report status (admin/system only - for future admin panel)
  async updateReportStatus(reportId, newStatus) {
    const validStatuses = ["PENDING", "UNDER_REVIEW", "CONTACTING_DRIVER", "RESOLVED", "CLOSED"];
    
    if (!validStatuses.includes(newStatus)) {
      throw new ApiError(400, "Invalid report status");
    }

    const report = await prisma.report.update({
      where: { id: reportId },
      data: {
        reportStatus: newStatus,
        updatedAt: new Date()
      }
    });

    return report;
  }

  // Check if passenger can report this trip
  async canReportTrip(bookingId, passengerId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        route: {
          include: {
            driver: {
              select: { id: true, firstName: true, lastName: true, profilePicture: true }
            },
            vehicle: {
              select: { id: true, vehicleModel: true, vehicleType: true, color: true, licensePlate: true }
            }
          }
        }
      }
    });

    if (!booking) {
      return { canReport: false, reason: "Booking not found" };
    }

    if (booking.passengerId !== passengerId) {
      return { canReport: false, reason: "Not your booking" };
    }

    if (booking.route.status !== "COMPLETED") {
      return { canReport: false, reason: "Route not completed yet" };
    }

    const routeCompletedAt = new Date(booking.route.updatedAt);
    const now = new Date();
    const daysDifference = (now - routeCompletedAt) / (1000 * 60 * 60 * 24);

    if (daysDifference > 3) {
      return { 
        canReport: false, 
        reason: `Report window closed (${Math.floor(daysDifference)} days ago). Can only report within 3 days.`,
        daysElapsed: Math.floor(daysDifference)
      };
    }

    return { 
      canReport: true,
      daysRemaining: Math.ceil(3 - daysDifference),
      booking: {
        id: booking.id,
        route: {
          locationFrom: booking.route.startLocation,
          locationTo: booking.route.endLocation,
          updatedAt: booking.route.updatedAt,
          driver: booking.route.driver,
          vehicle: booking.route.vehicle
        }
      }
    };
  }

  // Get report statistics for a specific booking
  async getBookingReportStats(bookingId) {
    const reports = await prisma.report.findMany({
      where: { bookingId },
      select: { reportStatus: true, category: true }
    });

    const stats = {
      total: reports.length,
      byStatus: {},
      byCategory: {}
    };

    reports.forEach(report => {
      stats.byStatus[report.reportStatus] = (stats.byStatus[report.reportStatus] || 0) + 1;
      stats.byCategory[report.category] = (stats.byCategory[report.category] || 0) + 1;
    });

    return stats;
  }
}

module.exports = new ReportService();
