import { db } from "./db";
import { companies, inspections, defects, users, assets, inspectionTypes, inspectionTypeFormFields, inspectionTypeLayouts, inspectionAssets, layouts, layoutZones, layoutZoneComponents, componentDefects } from "@shared/schema";
import { storage } from "./storage";
import * as readline from "readline";

async function askConfirmation(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('\nType "DELETE ALL PRODUCTION DATA" to confirm: ', (answer) => {
      rl.close();
      resolve(answer === "DELETE ALL PRODUCTION DATA");
    });
  });
}

async function seedProduction() {
  console.log("\n" + "=".repeat(80));
  console.log("🚨 PRODUCTION DATABASE SEED SCRIPT");
  console.log("=".repeat(80));
  console.log("\n⚠️  WARNING: This will PERMANENTLY DELETE all production data!");
  console.log("⚠️  This includes:");
  console.log("   - All companies, users, and assets");
  console.log("   - All inspections and defects");
  console.log("   - All layouts and inspection types");
  console.log("\n✅ After deletion, the database will be reseeded with test data.");
  console.log("\n" + "=".repeat(80) + "\n");

  // Check if DATABASE_URL contains production indicators
  const dbUrl = process.env.DATABASE_URL || "";
  const isLikelyProduction = dbUrl.includes("pooler") || dbUrl.includes("prod");
  
  if (!isLikelyProduction && !dbUrl.includes("localhost")) {
    console.log("⚠️  Database URL doesn't look like production or local dev.");
    console.log("   Current DATABASE_URL: " + dbUrl.substring(0, 50) + "...");
  }

  const confirmed = await askConfirmation();

  if (!confirmed) {
    console.log("\n❌ Seed cancelled. No changes made to production database.");
    process.exit(0);
  }

  console.log("\n✅ Confirmation received. Starting production seed...\n");

  try {
    // Clear existing data (in reverse order due to foreign keys)
    console.log("🗑️  Clearing existing production data...");
    await db.delete(defects);
    await db.delete(inspectionAssets);
    await db.delete(inspections);
    await db.delete(inspectionTypeFormFields);
    await db.delete(inspectionTypeLayouts);
    await db.delete(inspectionTypes);
    await db.delete(componentDefects);
    await db.delete(layoutZoneComponents);
    await db.delete(layoutZones);
    await db.delete(layouts);
    await db.delete(assets);
    await db.delete(users);
    await db.delete(companies);
    console.log("✅ Cleared all production data");

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

    // Create inspection types with form fields
    console.log("📋 Creating inspection types...");
    
    // NEC Inspection Types (with layout mappings)
    const necInspectionTypesData = [
      {
        inspectionTypeName: "preflight",
        layoutKeys: [], // Empty array = ALL layouts
        status: "ACTIVE" as const,
        companyId: "NEC",
      },
      {
        inspectionTypeName: "pre-trip",
        layoutKeys: ["TRUCK"],
        status: "ACTIVE" as const,
        companyId: "NEC",
      },
      {
        inspectionTypeName: "post-trip",
        layoutKeys: ["TRUCK"],
        status: "ACTIVE" as const,
        companyId: "NEC",
      },
      {
        inspectionTypeName: "10000-mile-check",
        layoutKeys: ["TRUCK"],
        status: "ACTIVE" as const,
        companyId: "NEC",
      },
      {
        inspectionTypeName: "crane-daily",
        layoutKeys: ["CRANE"],
        status: "ACTIVE" as const,
        companyId: "NEC",
      },
    ];
    
    // WALMART Inspection Types
    const walmartInspectionTypesData = [
      {
        inspectionTypeName: "warehouse-safety",
        layoutKeys: [], // Empty array = ALL layouts
        status: "ACTIVE" as const,
        companyId: "WALMART",
      },
      {
        inspectionTypeName: "forklift-daily",
        layoutKeys: ["FORKLIFT"],
        status: "ACTIVE" as const,
        companyId: "WALMART",
      },
      {
        inspectionTypeName: "delivery-pre-trip",
        layoutKeys: ["VAN"],
        status: "ACTIVE" as const,
        companyId: "WALMART",
      },
      {
        inspectionTypeName: "equipment-monthly",
        layoutKeys: [], // Empty array = ALL layouts
        status: "INACTIVE" as const,
        companyId: "WALMART",
      },
    ];
    
    // FEDEX Inspection Types
    const fedexInspectionTypesData = [
      {
        inspectionTypeName: "sortation-check",
        layoutKeys: ["SORTATION-UNIT"],
        status: "ACTIVE" as const,
        companyId: "FEDEX",
      },
      {
        inspectionTypeName: "van-pre-route",
        layoutKeys: ["VAN"],
        status: "ACTIVE" as const,
        companyId: "FEDEX",
      },
      {
        inspectionTypeName: "conveyor-weekly",
        layoutKeys: ["CONVEYOR"],
        status: "ACTIVE" as const,
        companyId: "FEDEX",
      },
    ];
    
    // Insert inspection types (without layoutKeys field)
    const createdInspectionTypes = await db.insert(inspectionTypes).values([
      ...necInspectionTypesData.map(({ layoutKeys, ...rest }) => rest),
      ...walmartInspectionTypesData.map(({ layoutKeys, ...rest }) => rest),
      ...fedexInspectionTypesData.map(({ layoutKeys, ...rest }) => rest),
    ]).returning();
    console.log(`✅ Created ${necInspectionTypesData.length + walmartInspectionTypesData.length + fedexInspectionTypesData.length} inspection types`);
    
    // Create a mapping from (companyId + business inspectionTypeName) to UUID id
    // Use composite key to handle multiple companies using same business ID
    const inspectionTypeIdMap = new Map<string, string>();
    for (const it of createdInspectionTypes) {
      const compositeKey = `${it.companyId}:${it.inspectionTypeName}`;
      inspectionTypeIdMap.set(compositeKey, it.id);
    }
    
    // Create form fields for inspection types
    console.log("📝 Creating form fields...");
    
    const formFieldsData = [
      // Preflight inspection fields (ALL layouts) - NEC
      { formFieldName: "odometer", formFieldType: "NUM" as const, formFieldLength: 10, companyId: "NEC", businessInspectionTypeId: "preflight" },
      { formFieldName: "fuel-level", formFieldType: "NUM" as const, formFieldLength: 3, companyId: "NEC", businessInspectionTypeId: "preflight" },
      { formFieldName: "route", formFieldType: "TEXT" as const, formFieldLength: 64, companyId: "NEC", businessInspectionTypeId: "preflight" },
      { formFieldName: "destination", formFieldType: "TEXT" as const, formFieldLength: 64, companyId: "NEC", businessInspectionTypeId: "preflight" },
      
      // Pre-trip inspection fields (TRUCK layout) - NEC
      { formFieldName: "odometer", formFieldType: "NUM" as const, formFieldLength: 10, companyId: "NEC", businessInspectionTypeId: "pre-trip" },
      { formFieldName: "fuel-level", formFieldType: "NUM" as const, formFieldLength: 3, companyId: "NEC", businessInspectionTypeId: "pre-trip" },
      { formFieldName: "tire-pressure-fl", formFieldType: "NUM" as const, formFieldLength: 3, companyId: "NEC", businessInspectionTypeId: "pre-trip" },
      { formFieldName: "tire-pressure-fr", formFieldType: "NUM" as const, formFieldLength: 3, companyId: "NEC", businessInspectionTypeId: "pre-trip" },
      { formFieldName: "tire-pressure-rl", formFieldType: "NUM" as const, formFieldLength: 3, companyId: "NEC", businessInspectionTypeId: "pre-trip" },
      { formFieldName: "tire-pressure-rr", formFieldType: "NUM" as const, formFieldLength: 3, companyId: "NEC", businessInspectionTypeId: "pre-trip" },
      { formFieldName: "cargo-weight", formFieldType: "NUM" as const, formFieldLength: 6, companyId: "NEC", businessInspectionTypeId: "pre-trip" },
      
      // Post-trip inspection fields - NEC
      { formFieldName: "ending-odometer", formFieldType: "NUM" as const, formFieldLength: 10, companyId: "NEC", businessInspectionTypeId: "post-trip" },
      { formFieldName: "fuel-remaining", formFieldType: "NUM" as const, formFieldLength: 3, companyId: "NEC", businessInspectionTypeId: "post-trip" },
      { formFieldName: "issues-noted", formFieldType: "TEXT" as const, formFieldLength: 64, companyId: "NEC", businessInspectionTypeId: "post-trip" },
      
      // 10,000 mile check fields - NEC
      { formFieldName: "oil-level", formFieldType: "TEXT" as const, formFieldLength: 20, companyId: "NEC", businessInspectionTypeId: "10000-mile-check" },
      { formFieldName: "brake-wear", formFieldType: "NUM" as const, formFieldLength: 3, companyId: "NEC", businessInspectionTypeId: "10000-mile-check" },
      { formFieldName: "coolant-level", formFieldType: "TEXT" as const, formFieldLength: 20, companyId: "NEC", businessInspectionTypeId: "10000-mile-check" },
      
      // Crane daily inspection fields - NEC
      { formFieldName: "load-capacity", formFieldType: "NUM" as const, formFieldLength: 6, companyId: "NEC", businessInspectionTypeId: "crane-daily" },
      { formFieldName: "hydraulic-pressure", formFieldType: "NUM" as const, formFieldLength: 4, companyId: "NEC", businessInspectionTypeId: "crane-daily" },
      { formFieldName: "cable-condition", formFieldType: "TEXT" as const, formFieldLength: 32, companyId: "NEC", businessInspectionTypeId: "crane-daily" },
      
      // Warehouse safety fields - WALMART
      { formFieldName: "walkway-clear", formFieldType: "TEXT" as const, formFieldLength: 10, companyId: "WALMART", businessInspectionTypeId: "warehouse-safety" },
      { formFieldName: "emergency-exit", formFieldType: "TEXT" as const, formFieldLength: 10, companyId: "WALMART", businessInspectionTypeId: "warehouse-safety" },
      { formFieldName: "fire-extinguisher", formFieldType: "TEXT" as const, formFieldLength: 20, companyId: "WALMART", businessInspectionTypeId: "warehouse-safety" },
      
      // Forklift daily fields - WALMART
      { formFieldName: "battery-charge", formFieldType: "NUM" as const, formFieldLength: 3, companyId: "WALMART", businessInspectionTypeId: "forklift-daily" },
      { formFieldName: "forks-condition", formFieldType: "TEXT" as const, formFieldLength: 32, companyId: "WALMART", businessInspectionTypeId: "forklift-daily" },
      { formFieldName: "hours-meter", formFieldType: "NUM" as const, formFieldLength: 8, companyId: "WALMART", businessInspectionTypeId: "forklift-daily" },
      
      // Delivery pre-trip fields (WALMART VAN)
      { formFieldName: "odometer", formFieldType: "NUM" as const, formFieldLength: 10, companyId: "WALMART", businessInspectionTypeId: "delivery-pre-trip" },
      { formFieldName: "packages-loaded", formFieldType: "NUM" as const, formFieldLength: 4, companyId: "WALMART", businessInspectionTypeId: "delivery-pre-trip" },
      { formFieldName: "route-number", formFieldType: "TEXT" as const, formFieldLength: 16, companyId: "WALMART", businessInspectionTypeId: "delivery-pre-trip" },
      
      // Sortation check fields - FEDEX
      { formFieldName: "throughput-rate", formFieldType: "NUM" as const, formFieldLength: 6, companyId: "FEDEX", businessInspectionTypeId: "sortation-check" },
      { formFieldName: "error-rate", formFieldType: "NUM" as const, formFieldLength: 4, companyId: "FEDEX", businessInspectionTypeId: "sortation-check" },
      { formFieldName: "scanner-status", formFieldType: "TEXT" as const, formFieldLength: 20, companyId: "FEDEX", businessInspectionTypeId: "sortation-check" },
      
      // Van pre-route fields (FEDEX)
      { formFieldName: "odometer-start", formFieldType: "NUM" as const, formFieldLength: 10, companyId: "FEDEX", businessInspectionTypeId: "van-pre-route" },
      { formFieldName: "route-id", formFieldType: "TEXT" as const, formFieldLength: 16, companyId: "FEDEX", businessInspectionTypeId: "van-pre-route" },
      { formFieldName: "package-count", formFieldType: "NUM" as const, formFieldLength: 4, companyId: "FEDEX", businessInspectionTypeId: "van-pre-route" },
      
      // Conveyor weekly fields - FEDEX
      { formFieldName: "belt-tension", formFieldType: "NUM" as const, formFieldLength: 4, companyId: "FEDEX", businessInspectionTypeId: "conveyor-weekly" },
      { formFieldName: "motor-temp", formFieldType: "NUM" as const, formFieldLength: 4, companyId: "FEDEX", businessInspectionTypeId: "conveyor-weekly" },
      { formFieldName: "alignment-check", formFieldType: "TEXT" as const, formFieldLength: 20, companyId: "FEDEX", businessInspectionTypeId: "conveyor-weekly" },
    ];
    
    // Map business IDs to UUID FKs using composite key (companyId:inspectionTypeName)
    const formFields = formFieldsData.map(ff => ({
      formFieldName: ff.formFieldName,
      formFieldType: ff.formFieldType,
      formFieldLength: ff.formFieldLength,
      inspectionTypeId: inspectionTypeIdMap.get(`${ff.companyId}:${ff.businessInspectionTypeId}`)!,
    }));
    
    await db.insert(inspectionTypeFormFields).values(formFields);
    console.log(`✅ Created ${formFields.length} form fields for inspection types`);

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
      userTag: "SUPERVISOR",
      status: "ACTIVE",
      companyId: "NEC",
    });
    console.log("   ✅ Created user: john_nec (companyId: NEC)");
    
    await storage.createUser({
      userId: "sarah_walmart",
      password: "password123",
      userFullName: "Sarah Johnson",
      userTag: "MECHANIC",
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

    // Create layouts first (required for assets)
    console.log("📐 Creating layouts...");
    const layoutsData = [
      // NEC layouts
      { layoutName: "SCHOOL-BUS", companyId: "NEC" },
      { layoutName: "TRUCK", companyId: "NEC" },
      { layoutName: "VAN", companyId: "NEC" },
      { layoutName: "FORKLIFT", companyId: "NEC" },
      { layoutName: "CRANE", companyId: "NEC" },
      { layoutName: "PALLET-JACK", companyId: "NEC" },
      // WALMART layouts
      { layoutName: "SCHOOL-BUS", companyId: "WALMART" },
      { layoutName: "TRUCK", companyId: "WALMART" },
      { layoutName: "VAN", companyId: "WALMART" },
      { layoutName: "EXCAVATOR", companyId: "WALMART" },
      { layoutName: "LOADER", companyId: "WALMART" },
      { layoutName: "FORKLIFT", companyId: "WALMART" },
      { layoutName: "CONVEYOR", companyId: "WALMART" },
      { layoutName: "PALLET-JACK", companyId: "WALMART" },
      // FEDEX layouts
      { layoutName: "SCHOOL-BUS", companyId: "FEDEX" },
      { layoutName: "CONVEYOR", companyId: "FEDEX" },
      { layoutName: "SORTATION-UNIT", companyId: "FEDEX" },
      { layoutName: "VAN", companyId: "FEDEX" },
      { layoutName: "TRUCK", companyId: "FEDEX" },
      { layoutName: "FORKLIFT", companyId: "FEDEX" },
      { layoutName: "LOADER", companyId: "FEDEX" },
      { layoutName: "PALLET-JACK", companyId: "FEDEX" },
      { layoutName: "CRANE", companyId: "FEDEX" },
      // Multi-asset layouts
      { layoutName: "DOLLY", companyId: "NEC" },
      { layoutName: "TRAILER", companyId: "NEC" },
      { layoutName: "TRAILER", companyId: "WALMART" },
      { layoutName: "DOLLY", companyId: "FEDEX" },
      { layoutName: "TRAILER", companyId: "FEDEX" },
    ];
    const createdLayouts = await db.insert(layouts).values(layoutsData).returning();
    
    // Create layout mapping: "{companyId}:{layoutName}" → UUID
    const layoutMap = new Map<string, string>();
    for (const layout of createdLayouts) {
      layoutMap.set(`${layout.companyId}:${layout.layoutName}`, layout.id);
    }
    console.log(`✅ Created ${createdLayouts.length} layouts with UUID mapping`);

    // Create inspection type to layout mappings in junction table
    console.log("🔗 Creating inspection type to layout mappings...");
    const allInspectionTypesData = [...necInspectionTypesData, ...walmartInspectionTypesData, ...fedexInspectionTypesData];
    const inspectionTypeLayoutMappings: Array<{ inspectionTypeId: string; layoutId: string }> = [];
    
    for (const itData of allInspectionTypesData) {
      // Find the created inspection type UUID
      const createdIT = createdInspectionTypes.find(
        it => it.companyId === itData.companyId && it.inspectionTypeName === itData.inspectionTypeName
      );
      
      if (!createdIT) {
        throw new Error(`Inspection type not found: ${itData.companyId}:${itData.inspectionTypeName}`);
      }
      
      // If layoutKeys is empty, it means ALL layouts (no junction records needed)
      // If layoutKeys has values, create junction records for each layout
      if (itData.layoutKeys.length > 0) {
        for (const layoutKey of itData.layoutKeys) {
          const layoutId = layoutMap.get(`${itData.companyId}:${layoutKey}`);
          if (!layoutId) {
            throw new Error(`Layout not found for ${itData.companyId}:${layoutKey}`);
          }
          inspectionTypeLayoutMappings.push({
            inspectionTypeId: createdIT.id,
            layoutId,
          });
        }
      }
    }
    
    if (inspectionTypeLayoutMappings.length > 0) {
      await db.insert(inspectionTypeLayouts).values(inspectionTypeLayoutMappings);
      console.log(`✅ Created ${inspectionTypeLayoutMappings.length} inspection type to layout mappings`);
    } else {
      console.log("✅ No specific layout mappings needed (all inspection types apply to ALL layouts)");
    }

    console.log("\n" + "=".repeat(80));
    console.log("🎉 PRODUCTION SEEDING COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(80));
    console.log("\n📊 Summary:");
    console.log("   - 3 companies");
    console.log("   - 7 users (including superuser 'avazquez')");
    console.log("   - 28 layouts");
    console.log("   - 12 inspection types");
    console.log("   - 38 form fields");
    console.log("   - All data integrity checks passed\n");
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Production seeding failed:", error);
    console.error("\n⚠️  Your production database may be in an inconsistent state!");
    console.error("⚠️  Please review the error and consider running this script again.\n");
    process.exit(1);
  }
}

seedProduction();
