-- Add finish flags for driver/passenger completion
ALTER TABLE "Route" ADD COLUMN "driverFinishedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "passengerFinishedAt" TIMESTAMP(3);
