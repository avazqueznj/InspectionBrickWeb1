import { db } from "./db";
import { inspections, defects } from "@shared/schema";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create sample inspections
    const inspection1 = await db
      .insert(inspections)
      .values({
        datetime: new Date("2025-10-20T08:30:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "TRUCK-2401",
        driverName: "John Smith",
        driverId: "DRV-10234",
        inspectionFormData: "Pre-trip inspection completed. All systems checked.",
      })
      .returning();

    const inspection2 = await db
      .insert(inspections)
      .values({
        datetime: new Date("2025-10-21T14:15:00"),
        inspectionType: "Equipment Safety Check",
        assetId: "FORKLIFT-089",
        driverName: "Sarah Johnson",
        driverId: "DRV-10567",
        inspectionFormData: "Routine maintenance inspection.",
      })
      .returning();

    const inspection3 = await db
      .insert(inspections)
      .values({
        datetime: new Date("2025-10-22T09:00:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "VAN-1145",
        driverName: "Michael Brown",
        driverId: "DRV-10892",
        inspectionFormData: "Daily vehicle inspection before route.",
      })
      .returning();

    const inspection4 = await db
      .insert(inspections)
      .values({
        datetime: new Date("2025-10-19T16:45:00"),
        inspectionType: "Heavy Equipment Check",
        assetId: "EXCAVATOR-45",
        driverName: "Emily Davis",
        driverId: "DRV-10123",
        inspectionFormData: "End of day equipment check.",
      })
      .returning();

    console.log("✅ Created 4 inspections");

    // Create defects for inspection 1
    await db.insert(defects).values([
      {
        inspectionId: inspection1[0].id,
        zoneName: "Front End",
        componentName: "Left Headlight",
        defect: "Headlight cracked, reduced visibility",
        severity: 75,
        driverNotes: "Noticed during pre-trip inspection",
        status: "open",
        repairNotes: null,
      },
      {
        inspectionId: inspection1[0].id,
        zoneName: "Rear",
        componentName: "Brake Light",
        defect: "Brake light not functioning",
        severity: 85,
        driverNotes: "Safety hazard for night driving",
        status: "pending",
        repairNotes: "Parts ordered, scheduled for repair",
      },
    ]);

    // Create defects for inspection 2
    await db.insert(defects).values([
      {
        inspectionId: inspection2[0].id,
        zoneName: "Hydraulics",
        componentName: "Lift Cylinder",
        defect: "Minor hydraulic fluid leak",
        severity: 45,
        driverNotes: "Small drip noticed under unit",
        status: "repaired",
        repairNotes: "Seal replaced, leak fixed",
      },
    ]);

    // Create defects for inspection 3
    await db.insert(defects).values([
      {
        inspectionId: inspection3[0].id,
        zoneName: "Tires",
        componentName: "Front Right Tire",
        defect: "Tire tread below legal limit",
        severity: 95,
        driverNotes: "Immediate replacement required",
        status: "open",
        repairNotes: null,
      },
      {
        inspectionId: inspection3[0].id,
        zoneName: "Engine",
        componentName: "Oil Level",
        defect: "Oil level slightly low",
        severity: 20,
        driverNotes: "Within acceptable range",
        status: "repaired",
        repairNotes: "Oil topped up to proper level",
      },
      {
        inspectionId: inspection3[0].id,
        zoneName: "Cabin",
        componentName: "Windshield",
        defect: "Small chip in windshield",
        severity: 30,
        driverNotes: "Upper right corner, not in line of sight",
        status: "pending",
        repairNotes: "Scheduled for repair next week",
      },
    ]);

    // Inspection 4 has no defects (perfect inspection)

    console.log("✅ Created sample defects");
    console.log("🎉 Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
