import { db } from "./db";
import { companies, inspections, defects, users } from "@shared/schema";
import { storage } from "./storage";

async function seed() {
  console.log("🌱 Seeding database with plain text passwords (pilot configuration)...");

  try {
    // Clear existing data (in reverse order due to foreign keys)
    console.log("🗑️  Clearing existing data...");
    await db.delete(defects);
    await db.delete(inspections);
    await db.delete(users);
    await db.delete(companies);
    console.log("✅ Cleared existing data");

    // Create sample companies
    console.log("🏢 Creating companies...");
    await db.insert(companies).values([
      {
        id: "NEC",
        name: "National Equipment Corp",
        address: "1234 Industrial Blvd, Houston, TX 77001",
        settings: JSON.stringify({ timezone: "America/Chicago", locale: "en-US" }),
      },
      {
        id: "WALMART",
        name: "Walmart Distribution",
        address: "5678 Logistics Way, Bentonville, AR 72712",
        settings: JSON.stringify({ timezone: "America/Chicago", locale: "en-US" }),
      },
      {
        id: "FEDEX",
        name: "FedEx Ground Operations",
        address: "9012 Freight Dr, Memphis, TN 38125",
        settings: JSON.stringify({ timezone: "America/Central", locale: "en-US" }),
      },
    ]);

    console.log("✅ Created 3 companies");

    // Create users with plain text passwords (pilot configuration)
    console.log("👥 Creating users...");
    
    // avazquez - can view all companies (no companyId assignment)
    await storage.createUser("avazquez", "password123", null);
    console.log("   ✅ Created superuser: avazquez (companyId: null)");
    
    // Company-specific users
    await storage.createUser("john_nec", "password123", "NEC");
    console.log("   ✅ Created user: john_nec (companyId: NEC)");
    
    await storage.createUser("sarah_walmart", "password123", "WALMART");
    console.log("   ✅ Created user: sarah_walmart (companyId: WALMART)");
    
    await storage.createUser("mike_fedex", "password123", "FEDEX");
    console.log("   ✅ Created user: mike_fedex (companyId: FEDEX)");
    
    console.log("✅ Created 4 users (1 superuser + 3 company users)");

    // Create sample inspections for NEC
    console.log("📋 Creating sample inspections...");
    const inspection1 = await db
      .insert(inspections)
      .values({
        companyId: "NEC",
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
        companyId: "NEC",
        datetime: new Date("2025-10-21T14:15:00"),
        inspectionType: "Equipment Safety Check",
        assetId: "FORKLIFT-089",
        driverName: "Sarah Johnson",
        driverId: "DRV-10567",
        inspectionFormData: "Routine maintenance inspection.",
      })
      .returning();

    // Create sample inspections for WALMART
    const inspection3 = await db
      .insert(inspections)
      .values({
        companyId: "WALMART",
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
        companyId: "WALMART",
        datetime: new Date("2025-10-19T16:45:00"),
        inspectionType: "Heavy Equipment Check",
        assetId: "EXCAVATOR-45",
        driverName: "Emily Davis",
        driverId: "DRV-10123",
        inspectionFormData: "End of day equipment check.",
      })
      .returning();

    // Create sample inspections for FEDEX
    const inspection5 = await db
      .insert(inspections)
      .values({
        companyId: "FEDEX",
        datetime: new Date("2025-10-22T11:30:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "TRUCK-5501",
        driverName: "James Wilson",
        driverId: "DRV-20445",
        inspectionFormData: "Morning pre-route inspection.",
      })
      .returning();

    console.log("✅ Created 5 inspections across 3 companies");

    // Create defects for NEC inspection 1
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

    // Create defects for NEC inspection 2
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

    // Create defects for WALMART inspection 3
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

    // Create defects for FEDEX inspection 5
    await db.insert(defects).values([
      {
        inspectionId: inspection5[0].id,
        zoneName: "Engine",
        componentName: "Check Engine Light",
        defect: "Check engine light illuminated",
        severity: 60,
        driverNotes: "Light came on during route",
        status: "open",
        repairNotes: null,
      },
    ]);

    // Inspection 4 (WALMART) has no defects (perfect inspection)

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
