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
    
    // Additional user to test login (adrianal from production logs)
    await storage.createUser("adrianal", "password123", "WALMART");
    console.log("   ✅ Created user: adrianal (companyId: WALMART)");
    
    console.log("✅ Created 5 users (1 superuser + 4 company users)");

    // Create sample inspections - 12+ per company with varied data
    console.log("📋 Creating sample inspections...");
    
    // NEC Inspections (12 inspections)
    const necInspections = await db.insert(inspections).values([
      {
        companyId: "NEC",
        datetime: new Date("2025-10-01T08:30:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "TRUCK-2401",
        driverName: "John Smith",
        driverId: "DRV-10234",
        inspectionFormData: "Pre-trip inspection completed.",
      },
      {
        companyId: "NEC",
        datetime: new Date("2025-10-03T14:15:00"),
        inspectionType: "Equipment Safety Check",
        assetId: "FORKLIFT-089",
        driverName: "Sarah Johnson",
        driverId: "DRV-10567",
        inspectionFormData: "Routine safety inspection.",
      },
      {
        companyId: "NEC",
        datetime: new Date("2025-10-05T09:00:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "TRUCK-2402",
        driverName: "Mike Davis",
        driverId: "DRV-10890",
        inspectionFormData: "Morning pre-route check.",
      },
      {
        companyId: "NEC",
        datetime: new Date("2025-10-07T11:30:00"),
        inspectionType: "Heavy Equipment Check",
        assetId: "CRANE-12",
        driverName: "John Smith",
        driverId: "DRV-10234",
        inspectionFormData: "Weekly equipment inspection.",
      },
      {
        companyId: "NEC",
        datetime: new Date("2025-10-10T07:45:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "VAN-1501",
        driverName: "Emily Chen",
        driverId: "DRV-10445",
        inspectionFormData: "Daily vehicle check.",
      },
      {
        companyId: "NEC",
        datetime: new Date("2025-10-12T16:20:00"),
        inspectionType: "Equipment Safety Check",
        assetId: "FORKLIFT-090",
        driverName: "Sarah Johnson",
        driverId: "DRV-10567",
        inspectionFormData: "End of shift inspection.",
      },
      {
        companyId: "NEC",
        datetime: new Date("2025-10-15T10:00:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "TRUCK-2401",
        driverName: "Mike Davis",
        driverId: "DRV-10890",
        inspectionFormData: "Mid-month check.",
      },
      {
        companyId: "NEC",
        datetime: new Date("2025-10-17T13:30:00"),
        inspectionType: "Warehouse Equipment Check",
        assetId: "PALLET-JACK-05",
        driverName: "Emily Chen",
        driverId: "DRV-10445",
        inspectionFormData: "Equipment maintenance check.",
      },
      {
        companyId: "NEC",
        datetime: new Date("2025-10-19T08:00:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "TRUCK-2403",
        driverName: "John Smith",
        driverId: "DRV-10234",
        inspectionFormData: "Regular vehicle inspection.",
      },
      {
        companyId: "NEC",
        datetime: new Date("2025-10-20T15:15:00"),
        inspectionType: "Equipment Safety Check",
        assetId: "FORKLIFT-089",
        driverName: "Sarah Johnson",
        driverId: "DRV-10567",
        inspectionFormData: "Afternoon safety check.",
      },
      {
        companyId: "NEC",
        datetime: new Date("2025-10-21T09:30:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "VAN-1502",
        driverName: "Mike Davis",
        driverId: "DRV-10890",
        inspectionFormData: "Pre-delivery inspection.",
      },
      {
        companyId: "NEC",
        datetime: new Date("2025-10-22T12:00:00"),
        inspectionType: "Heavy Equipment Check",
        assetId: "CRANE-13",
        driverName: "Emily Chen",
        driverId: "DRV-10445",
        inspectionFormData: "Crane safety inspection.",
      },
    ]).returning();

    // WALMART Inspections (12 inspections)
    const walmartInspections = await db.insert(inspections).values([
      {
        companyId: "WALMART",
        datetime: new Date("2025-10-02T07:00:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "VAN-1145",
        driverName: "Michael Brown",
        driverId: "DRV-10892",
        inspectionFormData: "Daily route inspection.",
      },
      {
        companyId: "WALMART",
        datetime: new Date("2025-10-04T10:30:00"),
        inspectionType: "Heavy Equipment Check",
        assetId: "EXCAVATOR-45",
        driverName: "Emily Davis",
        driverId: "DRV-10123",
        inspectionFormData: "Equipment check.",
      },
      {
        companyId: "WALMART",
        datetime: new Date("2025-10-06T14:00:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "TRUCK-5001",
        driverName: "Robert Lee",
        driverId: "DRV-10678",
        inspectionFormData: "Standard vehicle check.",
      },
      {
        companyId: "WALMART",
        datetime: new Date("2025-10-08T08:30:00"),
        inspectionType: "Equipment Safety Check",
        assetId: "LOADER-22",
        driverName: "Michael Brown",
        driverId: "DRV-10892",
        inspectionFormData: "Morning safety check.",
      },
      {
        companyId: "WALMART",
        datetime: new Date("2025-10-11T11:45:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "VAN-1146",
        driverName: "Jennifer Park",
        driverId: "DRV-10334",
        inspectionFormData: "Pre-trip vehicle inspection.",
      },
      {
        companyId: "WALMART",
        datetime: new Date("2025-10-13T09:15:00"),
        inspectionType: "Warehouse Equipment Check",
        assetId: "FORKLIFT-201",
        driverName: "Emily Davis",
        driverId: "DRV-10123",
        inspectionFormData: "Warehouse equipment review.",
      },
      {
        companyId: "WALMART",
        datetime: new Date("2025-10-14T16:00:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "TRUCK-5002",
        driverName: "Robert Lee",
        driverId: "DRV-10678",
        inspectionFormData: "End of day inspection.",
      },
      {
        companyId: "WALMART",
        datetime: new Date("2025-10-16T07:30:00"),
        inspectionType: "Equipment Safety Check",
        assetId: "LOADER-23",
        driverName: "Michael Brown",
        driverId: "DRV-10892",
        inspectionFormData: "Equipment safety review.",
      },
      {
        companyId: "WALMART",
        datetime: new Date("2025-10-18T13:00:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "VAN-1145",
        driverName: "Jennifer Park",
        driverId: "DRV-10334",
        inspectionFormData: "Midday vehicle check.",
      },
      {
        companyId: "WALMART",
        datetime: new Date("2025-10-19T10:20:00"),
        inspectionType: "Heavy Equipment Check",
        assetId: "EXCAVATOR-46",
        driverName: "Emily Davis",
        driverId: "DRV-10123",
        inspectionFormData: "Heavy equipment inspection.",
      },
      {
        companyId: "WALMART",
        datetime: new Date("2025-10-21T08:45:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "TRUCK-5003",
        driverName: "Robert Lee",
        driverId: "DRV-10678",
        inspectionFormData: "Regular DOT inspection.",
      },
      {
        companyId: "WALMART",
        datetime: new Date("2025-10-22T15:30:00"),
        inspectionType: "Equipment Safety Check",
        assetId: "FORKLIFT-202",
        driverName: "Michael Brown",
        driverId: "DRV-10892",
        inspectionFormData: "Afternoon equipment check.",
      },
    ]).returning();

    // FEDEX Inspections (12 inspections)
    const fedexInspections = await db.insert(inspections).values([
      {
        companyId: "FEDEX",
        datetime: new Date("2025-10-01T06:00:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "TRUCK-5501",
        driverName: "James Wilson",
        driverId: "DRV-20445",
        inspectionFormData: "Early morning inspection.",
      },
      {
        companyId: "FEDEX",
        datetime: new Date("2025-10-03T09:30:00"),
        inspectionType: "Equipment Safety Check",
        assetId: "CONVEYOR-A1",
        driverName: "Maria Garcia",
        driverId: "DRV-20567",
        inspectionFormData: "Conveyor safety check.",
      },
      {
        companyId: "FEDEX",
        datetime: new Date("2025-10-05T12:15:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "VAN-8801",
        driverName: "David Chen",
        driverId: "DRV-20789",
        inspectionFormData: "Midday vehicle inspection.",
      },
      {
        companyId: "FEDEX",
        datetime: new Date("2025-10-07T07:45:00"),
        inspectionType: "Heavy Equipment Check",
        assetId: "SORTATION-UNIT-3",
        driverName: "James Wilson",
        driverId: "DRV-20445",
        inspectionFormData: "Sortation unit check.",
      },
      {
        companyId: "FEDEX",
        datetime: new Date("2025-10-09T14:30:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "TRUCK-5502",
        driverName: "Linda Martinez",
        driverId: "DRV-20123",
        inspectionFormData: "Afternoon vehicle check.",
      },
      {
        companyId: "FEDEX",
        datetime: new Date("2025-10-11T10:00:00"),
        inspectionType: "Equipment Safety Check",
        assetId: "CONVEYOR-B2",
        driverName: "Maria Garcia",
        driverId: "DRV-20567",
        inspectionFormData: "Equipment maintenance review.",
      },
      {
        companyId: "FEDEX",
        datetime: new Date("2025-10-13T08:15:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "VAN-8802",
        driverName: "David Chen",
        driverId: "DRV-20789",
        inspectionFormData: "Morning route inspection.",
      },
      {
        companyId: "FEDEX",
        datetime: new Date("2025-10-15T15:45:00"),
        inspectionType: "Warehouse Equipment Check",
        assetId: "FORKLIFT-F10",
        driverName: "James Wilson",
        driverId: "DRV-20445",
        inspectionFormData: "Forklift inspection.",
      },
      {
        companyId: "FEDEX",
        datetime: new Date("2025-10-17T11:30:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "TRUCK-5503",
        driverName: "Linda Martinez",
        driverId: "DRV-20123",
        inspectionFormData: "Vehicle safety inspection.",
      },
      {
        companyId: "FEDEX",
        datetime: new Date("2025-10-19T09:00:00"),
        inspectionType: "Equipment Safety Check",
        assetId: "SORTATION-UNIT-4",
        driverName: "Maria Garcia",
        driverId: "DRV-20567",
        inspectionFormData: "Safety equipment check.",
      },
      {
        companyId: "FEDEX",
        datetime: new Date("2025-10-20T13:20:00"),
        inspectionType: "DOT Vehicle Inspection",
        assetId: "VAN-8803",
        driverName: "David Chen",
        driverId: "DRV-20789",
        inspectionFormData: "Delivery van inspection.",
      },
      {
        companyId: "FEDEX",
        datetime: new Date("2025-10-22T07:00:00"),
        inspectionType: "Heavy Equipment Check",
        assetId: "CONVEYOR-C3",
        driverName: "James Wilson",
        driverId: "DRV-20445",
        inspectionFormData: "Heavy equipment review.",
      },
    ]).returning();

    console.log("✅ Created 36 inspections (12 per company)");

    // Create sample defects for some inspections
    console.log("🔧 Creating sample defects...");
    
    // Add defects to first NEC inspection
    await db.insert(defects).values([
      {
        inspectionId: necInspections[0].id,
        zoneName: "Front End",
        componentName: "Left Headlight",
        defect: "Headlight cracked, reduced visibility",
        severity: 75,
        driverNotes: "Noticed during pre-trip inspection",
        status: "open",
        repairNotes: null,
      },
      {
        inspectionId: necInspections[0].id,
        zoneName: "Rear",
        componentName: "Brake Light",
        defect: "Brake light not functioning",
        severity: 85,
        driverNotes: "Safety hazard for night driving",
        status: "pending",
        repairNotes: "Parts ordered",
      },
    ]);

    // Add defects to third NEC inspection
    await db.insert(defects).values([
      {
        inspectionId: necInspections[2].id,
        zoneName: "Tires",
        componentName: "Rear Left Tire",
        defect: "Low tire pressure detected",
        severity: 40,
        driverNotes: "Tire pressure at 28 PSI",
        status: "repaired",
        repairNotes: "Inflated to 35 PSI",
      },
    ]);

    // Add defects to first WALMART inspection
    await db.insert(defects).values([
      {
        inspectionId: walmartInspections[0].id,
        zoneName: "Engine",
        componentName: "Oil Level",
        defect: "Oil level slightly low",
        severity: 20,
        driverNotes: "Within acceptable range",
        status: "repaired",
        repairNotes: "Oil topped up",
      },
      {
        inspectionId: walmartInspections[0].id,
        zoneName: "Cabin",
        componentName: "Windshield",
        defect: "Small chip in windshield",
        severity: 30,
        driverNotes: "Upper right corner",
        status: "pending",
        repairNotes: "Scheduled for repair",
      },
    ]);

    // Add defects to first FEDEX inspection
    await db.insert(defects).values([
      {
        inspectionId: fedexInspections[0].id,
        zoneName: "Engine",
        componentName: "Check Engine Light",
        defect: "Check engine light illuminated",
        severity: 60,
        driverNotes: "Light came on during route",
        status: "open",
        repairNotes: null,
      },
    ]);

    console.log("✅ Created sample defects");
    console.log("🎉 Seeding completed successfully!");
    console.log("📊 Summary:");
    console.log("   - 3 companies");
    console.log("   - 5 users (1 superuser + 4 company users)");
    console.log("   - 36 inspections (12 per company)");
    console.log("   - Multiple defects across different statuses");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
