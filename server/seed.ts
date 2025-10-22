import { db } from "./db";
import { companies, inspections, defects, users, assets } from "@shared/schema";
import { storage } from "./storage";

async function seed() {
  console.log("🌱 Seeding database with plain text passwords (pilot configuration)...");

  try {
    // Clear existing data (in reverse order due to foreign keys)
    console.log("🗑️  Clearing existing data...");
    await db.delete(defects);
    await db.delete(inspections);
    await db.delete(assets);
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
    await storage.createUser({
      userId: "avazquez",
      password: "password123",
      userFullName: "Antonio Vazquez",
      status: "ACTIVE",
      companyId: null,
    });
    console.log("   ✅ Created superuser: avazquez (companyId: null)");
    
    // Company-specific users
    await storage.createUser({
      userId: "john_nec",
      password: "password123",
      userFullName: "John Smith",
      status: "ACTIVE",
      companyId: "NEC",
    });
    console.log("   ✅ Created user: john_nec (companyId: NEC)");
    
    await storage.createUser({
      userId: "sarah_walmart",
      password: "password123",
      userFullName: "Sarah Johnson",
      status: "ACTIVE",
      companyId: "WALMART",
    });
    console.log("   ✅ Created user: sarah_walmart (companyId: WALMART)");
    
    await storage.createUser({
      userId: "mike_fedex",
      password: "password123",
      userFullName: "Mike Davis",
      status: "ACTIVE",
      companyId: "FEDEX",
    });
    console.log("   ✅ Created user: mike_fedex (companyId: FEDEX)");
    
    // Additional user to test login (adrianal from production logs)
    await storage.createUser({
      userId: "adrianal",
      password: "password123",
      userFullName: "Adriana Lopez",
      status: "ACTIVE",
      companyId: "WALMART",
    });
    console.log("   ✅ Created user: adrianal (companyId: WALMART)");
    
    // Add inactive users for testing filters
    await storage.createUser({
      userId: "bob_inactive",
      password: "password123",
      userFullName: "Bob Inactive",
      status: "INACTIVE",
      companyId: "NEC",
    });
    console.log("   ✅ Created inactive user: bob_inactive (companyId: NEC)");
    
    await storage.createUser({
      userId: "jane_former",
      password: "password123",
      userFullName: "Jane Former",
      status: "INACTIVE",
      companyId: "FEDEX",
    });
    console.log("   ✅ Created inactive user: jane_former (companyId: FEDEX)");
    
    console.log("✅ Created 7 users (1 superuser + 4 active company users + 2 inactive users)");

    // Create assets for all companies
    console.log("📦 Creating assets...");
    
    // NEC Assets - matching the inspection data
    const necAssetData = [
      { assetId: "TRUCK-2401", assetConfig: "TRUCK", assetName: "Freightliner 2401", status: "ACTIVE" as const, companyId: "NEC" },
      { assetId: "TRUCK-2402", assetConfig: "TRUCK", assetName: "Peterbilt 2402", status: "ACTIVE" as const, companyId: "NEC" },
      { assetId: "TRUCK-2403", assetConfig: "TRUCK", assetName: "Kenworth 2403", status: "ACTIVE" as const, companyId: "NEC" },
      { assetId: "VAN-1501", assetConfig: "VAN", assetName: "Ford Transit 1501", status: "ACTIVE" as const, companyId: "NEC" },
      { assetId: "VAN-1502", assetConfig: "VAN", assetName: "Mercedes Sprinter 1502", status: "ACTIVE" as const, companyId: "NEC" },
      { assetId: "FORKLIFT-089", assetConfig: "FORKLIFT", assetName: "Toyota 089", status: "ACTIVE" as const, companyId: "NEC" },
      { assetId: "FORKLIFT-090", assetConfig: "FORKLIFT", assetName: "Caterpillar 090", status: "ACTIVE" as const, companyId: "NEC" },
      { assetId: "CRANE-12", assetConfig: "CRANE", assetName: "Mobile Crane 12", status: "ACTIVE" as const, companyId: "NEC" },
      { assetId: "CRANE-13", assetConfig: "CRANE", assetName: "Tower Crane 13", status: "INACTIVE" as const, companyId: "NEC" },
      { assetId: "PALLET-JACK-05", assetConfig: "PALLET JACK", assetName: "Electric Jack 05", status: "ACTIVE" as const, companyId: "NEC" },
    ];
    
    // WALMART Assets
    const walmartAssetData = [
      { assetId: "VAN-1145", assetConfig: "VAN", assetName: "Delivery Van 1145", status: "ACTIVE" as const, companyId: "WALMART" },
      { assetId: "VAN-1146", assetConfig: "VAN", assetName: "Delivery Van 1146", status: "ACTIVE" as const, companyId: "WALMART" },
      { assetId: "TRUCK-5001", assetConfig: "TRUCK", assetName: "Semi Truck 5001", status: "ACTIVE" as const, companyId: "WALMART" },
      { assetId: "TRUCK-5002", assetConfig: "TRUCK", assetName: "Semi Truck 5002", status: "ACTIVE" as const, companyId: "WALMART" },
      { assetId: "EXCAVATOR-45", assetConfig: "EXCAVATOR", assetName: "Excavator 45", status: "INACTIVE" as const, companyId: "WALMART" },
      { assetId: "LOADER-22", assetConfig: "LOADER", assetName: "Front Loader 22", status: "ACTIVE" as const, companyId: "WALMART" },
      { assetId: "FORKLIFT-W01", assetConfig: "FORKLIFT", assetName: "Warehouse Forklift W01", status: "ACTIVE" as const, companyId: "WALMART" },
      { assetId: "FORKLIFT-W02", assetConfig: "FORKLIFT", assetName: "Warehouse Forklift W02", status: "ACTIVE" as const, companyId: "WALMART" },
      { assetId: "CONVEYOR-C3", assetConfig: "CONVEYOR", assetName: "Belt Conveyor C3", status: "ACTIVE" as const, companyId: "WALMART" },
      { assetId: "PALLET-JACK-W10", assetConfig: "PALLET JACK", assetName: "Manual Jack W10", status: "ACTIVE" as const, companyId: "WALMART" },
    ];
    
    // FEDEX Assets
    const fedexAssetData = [
      { assetId: "CONVEYOR-C3", assetConfig: "CONVEYOR", assetName: "Sortation Belt C3", status: "ACTIVE" as const, companyId: "FEDEX" },
      { assetId: "SORTATION-UNIT-4", assetConfig: "SORTATION UNIT", assetName: "Auto Sort Unit 4", status: "ACTIVE" as const, companyId: "FEDEX" },
      { assetId: "VAN-8803", assetConfig: "VAN", assetName: "Delivery Van 8803", status: "ACTIVE" as const, companyId: "FEDEX" },
      { assetId: "TRUCK-5503", assetConfig: "TRUCK", assetName: "Box Truck 5503", status: "ACTIVE" as const, companyId: "FEDEX" },
      { assetId: "FORKLIFT-F10", assetConfig: "FORKLIFT", assetName: "Hyster F10", status: "ACTIVE" as const, companyId: "FEDEX" },
      { assetId: "LOADER-F22", assetConfig: "LOADER", assetName: "Front Loader F22", status: "ACTIVE" as const, companyId: "FEDEX" },
      { assetId: "PALLET-JACK-F05", assetConfig: "PALLET JACK", assetName: "Electric Jack F05", status: "ACTIVE" as const, companyId: "FEDEX" },
      { assetId: "TRUCK-5504", assetConfig: "TRUCK", assetName: "Box Truck 5504", status: "INACTIVE" as const, companyId: "FEDEX" },
      { assetId: "VAN-8804", assetConfig: "VAN", assetName: "Delivery Van 8804", status: "ACTIVE" as const, companyId: "FEDEX" },
      { assetId: "CRANE-F1", assetConfig: "CRANE", assetName: "Gantry Crane F1", status: "ACTIVE" as const, companyId: "FEDEX" },
    ];
    
    // Insert all assets
    await db.insert(assets).values([...necAssetData, ...walmartAssetData, ...fedexAssetData]);
    
    console.log(`✅ Created ${necAssetData.length + walmartAssetData.length + fedexAssetData.length} assets (${necAssetData.length} NEC, ${walmartAssetData.length} WALMART, ${fedexAssetData.length} FEDEX)`);

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

    // Create comprehensive defects for realistic legal inspection reports
    console.log("🔧 Creating comprehensive defect data...");
    
    // Defect templates for variety
    const defectTemplates = [
      // Critical Safety Defects (Severity 70-100)
      { zoneName: "Brakes", componentName: "Front Brake Pads", defect: "Brake pads worn below minimum thickness (2mm remaining)", severity: 90, status: "open" as const, driverNotes: "Grinding noise when braking, requires immediate attention" },
      { zoneName: "Steering", componentName: "Power Steering Pump", defect: "Power steering fluid leak detected at pump seal", severity: 85, status: "pending" as const, driverNotes: "Leak rate approximately 10ml/hour, steering becoming stiff", repairNotes: "Parts ordered, scheduled for replacement" },
      { zoneName: "Lights", componentName: "Brake Lights", defect: "Both rear brake lights not functioning", severity: 95, status: "open" as const, driverNotes: "Critical safety issue - vehicle not road safe" },
      { zoneName: "Tires", componentName: "Front Right Tire", defect: "Tire tread depth below legal minimum (1.6mm), visible steel belts", severity: 100, status: "pending" as const, driverNotes: "Tire failure risk - immediate replacement required", repairNotes: "New tire on order" },
      
      // Moderate Defects (Severity 40-69)
      { zoneName: "Engine", componentName: "Air Filter", defect: "Air filter heavily contaminated, restricting airflow", severity: 50, status: "repaired" as const, driverNotes: "Reduced engine performance noted", repairNotes: "Air filter replaced with OEM part" },
      { zoneName: "Suspension", componentName: "Shock Absorbers", defect: "Front left shock absorber leaking hydraulic fluid", severity: 65, status: "pending" as const, driverNotes: "Vehicle handling affected, bouncing on rough roads", repairNotes: "Repair scheduled for next maintenance window" },
      { zoneName: "Electrical", componentName: "Battery Terminals", defect: "Battery terminals corroded, loose connection on positive terminal", severity: 55, status: "repaired" as const, driverNotes: "Intermittent starting issues reported", repairNotes: "Terminals cleaned and tightened, protective coating applied" },
      { zoneName: "Windshield", componentName: "Wiper Blades", defect: "Wiper blades cracked and torn, leaving streaks", severity: 45, status: "repaired" as const, driverNotes: "Poor visibility during rain", repairNotes: "Both wiper blades replaced" },
      { zoneName: "Cabin", componentName: "Driver Seat", defect: "Driver seat adjustment mechanism jammed, seat will not move", severity: 40, status: "open" as const, driverNotes: "Unable to adjust seat position for proper driving posture" },
      
      // Minor Defects (Severity 10-39)
      { zoneName: "Exterior", componentName: "Side Mirror", defect: "Passenger side mirror glass has small crack in lower corner", severity: 25, status: "pending" as const, driverNotes: "Does not affect visibility significantly", repairNotes: "Replacement mirror ordered" },
      { zoneName: "Interior", componentName: "Door Handle", defect: "Interior door handle loose, requires extra force to open", severity: 15, status: "open" as const, driverNotes: "Minor inconvenience, handle still functional" },
      { zoneName: "Fluids", componentName: "Windshield Washer Fluid", defect: "Windshield washer fluid reservoir empty", severity: 10, status: "repaired" as const, driverNotes: "Unable to clean windshield during inspection", repairNotes: "Reservoir refilled with winter formula" },
      { zoneName: "Body", componentName: "Front Bumper", defect: "Minor cosmetic damage - small dent on front bumper", severity: 20, status: "open" as const, driverNotes: "Cosmetic only, no structural damage" },
      { zoneName: "Lights", componentName: "License Plate Light", defect: "License plate light bulb burned out", severity: 30, status: "repaired" as const, driverNotes: "May result in traffic citation", repairNotes: "Bulb replaced" },
      
      // Equipment-Specific Defects
      { zoneName: "Hydraulics", componentName: "Lift Cylinder", defect: "Hydraulic lift cylinder showing slow leak at rod seal", severity: 70, status: "pending" as const, driverNotes: "Lift operation becoming sluggish, safety concern", repairNotes: "Seal replacement parts requisitioned" },
      { zoneName: "Safety Equipment", componentName: "Fire Extinguisher", defect: "Fire extinguisher pressure gauge in red zone, expired inspection tag", severity: 75, status: "open" as const, driverNotes: "Fire extinguisher may not function properly in emergency" },
      { zoneName: "Cargo Area", componentName: "Tie-Down Points", defect: "Two cargo tie-down anchors showing signs of stress fractures", severity: 60, status: "pending" as const, driverNotes: "Load securing capability compromised", repairNotes: "Structural engineer assessment scheduled" },
    ];
    
    let totalDefects = 0;
    
    // Add varied defects to first 20 NEC inspections (will appear in first 2 pages)
    for (let i = 0; i < Math.min(20, necInspections.length); i++) {
      // 70% chance of having defects
      if (Math.random() < 0.7) {
        const numDefects = Math.floor(Math.random() * 4) + 1; // 1-4 defects per inspection
        const selectedDefects = [];
        
        for (let j = 0; j < numDefects; j++) {
          const template = defectTemplates[Math.floor(Math.random() * defectTemplates.length)];
          selectedDefects.push({
            inspectionId: necInspections[i].id,
            zoneName: template.zoneName,
            componentName: template.componentName,
            defect: template.defect,
            severity: template.severity,
            driverNotes: template.driverNotes,
            status: template.status,
            repairNotes: template.repairNotes || null,
          });
        }
        
        await db.insert(defects).values(selectedDefects);
        totalDefects += selectedDefects.length;
      }
    }
    
    // Add varied defects to first 20 WALMART inspections
    for (let i = 0; i < Math.min(20, walmartInspections.length); i++) {
      if (Math.random() < 0.7) {
        const numDefects = Math.floor(Math.random() * 4) + 1;
        const selectedDefects = [];
        
        for (let j = 0; j < numDefects; j++) {
          const template = defectTemplates[Math.floor(Math.random() * defectTemplates.length)];
          selectedDefects.push({
            inspectionId: walmartInspections[i].id,
            zoneName: template.zoneName,
            componentName: template.componentName,
            defect: template.defect,
            severity: template.severity,
            driverNotes: template.driverNotes,
            status: template.status,
            repairNotes: template.repairNotes || null,
          });
        }
        
        await db.insert(defects).values(selectedDefects);
        totalDefects += selectedDefects.length;
      }
    }
    
    // Add varied defects to first 20 FEDEX inspections
    for (let i = 0; i < Math.min(20, fedexInspections.length); i++) {
      if (Math.random() < 0.7) {
        const numDefects = Math.floor(Math.random() * 4) + 1;
        const selectedDefects = [];
        
        for (let j = 0; j < numDefects; j++) {
          const template = defectTemplates[Math.floor(Math.random() * defectTemplates.length)];
          selectedDefects.push({
            inspectionId: fedexInspections[i].id,
            zoneName: template.zoneName,
            componentName: template.componentName,
            defect: template.defect,
            severity: template.severity,
            driverNotes: template.driverNotes,
            status: template.status,
            repairNotes: template.repairNotes || null,
          });
        }
        
        await db.insert(defects).values(selectedDefects);
        totalDefects += selectedDefects.length;
      }
    }

    console.log(`✅ Created ${totalDefects} defects across ${Math.floor(totalDefects / 2)} inspections with varied severity levels`);
    console.log("🎉 Seeding completed successfully!");
    console.log("📊 Summary:");
    console.log("   - 3 companies");
    console.log("   - 7 users (1 superuser + 4 active company users + 2 inactive users)");
    console.log("   - 30 assets (10 per company with varied types and statuses)");
    console.log(`   - ${necInspections.length + walmartInspections.length + fedexInspections.length} inspections (${necInspections.length} per company)`);
    console.log(`   - ${totalDefects} defects across different statuses`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
