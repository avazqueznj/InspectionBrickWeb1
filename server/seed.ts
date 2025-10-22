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

    // Create sample inspections - 45 per company with varied data
    console.log("📋 Creating sample inspections...");
    
    // Helper arrays for varied data
    const inspectionTypes = [
      "DOT Vehicle Inspection",
      "Equipment Safety Check",
      "Heavy Equipment Check",
      "Warehouse Equipment Check",
      "Pre-Trip Safety Check",
    ];
    
    const necAssets = ["TRUCK-2401", "TRUCK-2402", "TRUCK-2403", "VAN-1501", "VAN-1502", "FORKLIFT-089", "FORKLIFT-090", "CRANE-12", "CRANE-13", "PALLET-JACK-05"];
    const necDrivers = [
      { name: "John Smith", id: "DRV-10234" },
      { name: "Sarah Johnson", id: "DRV-10567" },
      { name: "Mike Davis", id: "DRV-10890" },
      { name: "Emily Chen", id: "DRV-10445" },
      { name: "Robert Wilson", id: "DRV-10778" },
    ];
    
    // Generate 45 NEC inspections across October 2025
    const necInspectionData = [];
    for (let i = 0; i < 45; i++) {
      const day = (i % 22) + 1; // Days 1-22
      const hour = 7 + (i % 10); // Hours 7-16
      const minute = (i * 15) % 60;
      
      necInspectionData.push({
        companyId: "NEC",
        datetime: new Date(`2025-10-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`),
        inspectionType: inspectionTypes[i % inspectionTypes.length],
        assetId: necAssets[i % necAssets.length],
        driverName: necDrivers[i % necDrivers.length].name,
        driverId: necDrivers[i % necDrivers.length].id,
        inspectionFormData: `Inspection #${i + 1} - Routine check completed.`,
      });
    }
    
    const necInspections = await db.insert(inspections).values(necInspectionData).returning();
    
    // WALMART data
    const walmartAssets = ["VAN-1145", "VAN-1146", "TRUCK-5001", "TRUCK-5002", "EXCAVATOR-45", "LOADER-22", "FORKLIFT-W01", "FORKLIFT-W02", "CONVEYOR-C3", "PALLET-JACK-W10"];
    const walmartDrivers = [
      { name: "Michael Brown", id: "DRV-10892" },
      { name: "Emily Davis", id: "DRV-10123" },
      { name: "Robert Lee", id: "DRV-10678" },
      { name: "Jennifer Park", id: "DRV-10334" },
      { name: "David Martinez", id: "DRV-10556" },
    ];
    
    // Generate 45 WALMART inspections
    const walmartInspectionData = [];
    for (let i = 0; i < 45; i++) {
      const day = (i % 22) + 1;
      const hour = 8 + (i % 9);
      const minute = (i * 20) % 60;
      
      walmartInspectionData.push({
        companyId: "WALMART",
        datetime: new Date(`2025-10-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`),
        inspectionType: inspectionTypes[i % inspectionTypes.length],
        assetId: walmartAssets[i % walmartAssets.length],
        driverName: walmartDrivers[i % walmartDrivers.length].name,
        driverId: walmartDrivers[i % walmartDrivers.length].id,
        inspectionFormData: `Inspection #${i + 1} - Standard inspection protocol.`,
      });
    }
    
    const walmartInspections = await db.insert(inspections).values(walmartInspectionData).returning();
    
    // FEDEX data
    const fedexAssets = ["CONVEYOR-C3", "SORTATION-UNIT-4", "VAN-8803", "TRUCK-5503", "FORKLIFT-F10", "LOADER-F22", "PALLET-JACK-F05", "TRUCK-5504", "VAN-8804", "CRANE-F1"];
    const fedexDrivers = [
      { name: "James Wilson", id: "DRV-20445" },
      { name: "Maria Garcia", id: "DRV-20567" },
      { name: "David Chen", id: "DRV-20789" },
      { name: "Linda Martinez", id: "DRV-20123" },
      { name: "Thomas Anderson", id: "DRV-20334" },
    ];
    
    // Generate 45 FEDEX inspections
    const fedexInspectionData = [];
    for (let i = 0; i < 45; i++) {
      const day = (i % 22) + 1;
      const hour = 6 + (i % 11);
      const minute = (i * 13) % 60;
      
      fedexInspectionData.push({
        companyId: "FEDEX",
        datetime: new Date(`2025-10-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`),
        inspectionType: inspectionTypes[i % inspectionTypes.length],
        assetId: fedexAssets[i % fedexAssets.length],
        driverName: fedexDrivers[i % fedexDrivers.length].name,
        driverId: fedexDrivers[i % fedexDrivers.length].id,
        inspectionFormData: `Inspection #${i + 1} - Operations check complete.`,
      });
    }
    
    const fedexInspections = await db.insert(inspections).values(fedexInspectionData).returning();
    
    console.log(`✅ Created ${necInspections.length + walmartInspections.length + fedexInspections.length} inspections (${necInspections.length} NEC, ${walmartInspections.length} WALMART, ${fedexInspections.length} FEDEX)`);

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
    console.log(`   - ${necInspections.length + walmartInspections.length + fedexInspections.length} inspections (${necInspections.length} per company)`);
    console.log("   - Multiple defects across different statuses");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
