import { db } from "../db";
import { companies, inspections, defects, users, assets, inspectionTypes, inspectionTypeFormFields, inspectionTypeLayouts, inspectionAssets, layouts, layoutZones, layoutZoneComponents, componentDefects, locations } from "@shared/schema";
import { storage } from "../storage";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

export async function runSeed() {
  // Clear existing data (in reverse order due to foreign keys)
  // NOTE: inspection_photos table removed - photos now in App Storage
  console.log("🗑️  Clearing existing data...");
  await db.delete(defects);
  await db.delete(inspectionAssets);
  await db.delete(inspections);
  await db.delete(inspectionTypeFormFields);
  await db.delete(inspectionTypes);
  await db.delete(assets);
  await db.delete(componentDefects);
  await db.delete(layoutZoneComponents);
  await db.delete(layoutZones);
  await db.delete(layouts);
  await db.delete(users);
  await db.delete(locations);
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
    {
      id: "ACME",
      name: "ACME National Logistics",
      address: "1000 Commerce Parkway, Atlanta, GA 30301",
      dotNumber: "DOT-4567890",
      settings: JSON.stringify({ timezone: "America/New_York", locale: "en-US" }),
    },
  ]);

  console.log("✅ Created 4 companies");

  // Create locations for each company (required for users and assets)
  console.log("📍 Creating locations...");
  const locationsData = [
    // NEC locations
    { id: "NEC-HQ", locationName: "NEC Headquarters", address: "1234 Industrial Blvd, Houston, TX 77001", status: "ACTIVE" as const, companyId: "NEC" },
    { id: "NEC-WAREHOUSE", locationName: "NEC Warehouse", address: "5678 Storage Lane, Houston, TX 77002", status: "ACTIVE" as const, companyId: "NEC" },
    { id: "NEC-YARD", locationName: "NEC Equipment Yard", address: "910 Fleet Ave, Houston, TX 77003", status: "ACTIVE" as const, companyId: "NEC" },
    // WALMART locations
    { id: "WALMART-DC1", locationName: "Distribution Center 1", address: "5678 Logistics Way, Bentonville, AR 72712", status: "ACTIVE" as const, companyId: "WALMART" },
    { id: "WALMART-DC2", locationName: "Distribution Center 2", address: "9012 Shipping Blvd, Rogers, AR 72756", status: "ACTIVE" as const, companyId: "WALMART" },
    { id: "WALMART-STORE1", locationName: "Store 1", address: "123 Retail Ave, Fayetteville, AR 72701", status: "INACTIVE" as const, companyId: "WALMART" },
    // FEDEX locations
    { id: "FEDEX-HUB", locationName: "Memphis Hub", address: "9012 Freight Dr, Memphis, TN 38125", status: "ACTIVE" as const, companyId: "FEDEX" },
    { id: "FEDEX-SORT", locationName: "Sortation Center", address: "456 Package Ln, Memphis, TN 38126", status: "ACTIVE" as const, companyId: "FEDEX" },
    { id: "FEDEX-DEPOT", locationName: "Local Depot", address: "789 Delivery St, Nashville, TN 37203", status: "ACTIVE" as const, companyId: "FEDEX" },
    // ACME locations (5 locations for volume testing)
    { id: "ACME-ATL", locationName: "Atlanta Hub", address: "1000 Commerce Parkway, Atlanta, GA 30301", status: "ACTIVE" as const, companyId: "ACME" },
    { id: "ACME-DAL", locationName: "Dallas Terminal", address: "2500 Freight Boulevard, Dallas, TX 75201", status: "ACTIVE" as const, companyId: "ACME" },
    { id: "ACME-CHI", locationName: "Chicago Distribution", address: "3200 Logistics Ave, Chicago, IL 60601", status: "ACTIVE" as const, companyId: "ACME" },
    { id: "ACME-LAX", locationName: "Los Angeles Port", address: "4100 Harbor Way, Los Angeles, CA 90001", status: "ACTIVE" as const, companyId: "ACME" },
    { id: "ACME-NYC", locationName: "New York Terminal", address: "5500 Industrial Blvd, Newark, NJ 07101", status: "ACTIVE" as const, companyId: "ACME" },
  ];
  await db.insert(locations).values(locationsData);
  console.log(`✅ Created ${locationsData.length} locations`);

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
  
  // ACME Inspection Types (high volume company)
  const acmeInspectionTypesData = [
    {
      inspectionTypeName: "pre-trip",
      layoutKeys: ["TRUCK", "TRAILER"],
      status: "ACTIVE" as const,
      companyId: "ACME",
    },
    {
      inspectionTypeName: "post-trip",
      layoutKeys: ["TRUCK", "TRAILER"],
      status: "ACTIVE" as const,
      companyId: "ACME",
    },
    {
      inspectionTypeName: "yard-check",
      layoutKeys: [],
      status: "ACTIVE" as const,
      companyId: "ACME",
    },
    {
      inspectionTypeName: "forklift-daily",
      layoutKeys: ["FORKLIFT"],
      status: "ACTIVE" as const,
      companyId: "ACME",
    },
  ];
  
  // Insert inspection types (without layoutKeys field)
  const createdInspectionTypes = await db.insert(inspectionTypes).values([
    ...necInspectionTypesData.map(({ layoutKeys, ...rest }) => rest),
    ...walmartInspectionTypesData.map(({ layoutKeys, ...rest }) => rest),
    ...fedexInspectionTypesData.map(({ layoutKeys, ...rest }) => rest),
    ...acmeInspectionTypesData.map(({ layoutKeys, ...rest }) => rest),
  ]).returning();
  console.log(`✅ Created ${createdInspectionTypes.length} inspection types`);
  
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
    
    // ACME Pre-trip fields (DOT-compliant)
    { formFieldName: "odometer", formFieldType: "NUM" as const, formFieldLength: 10, companyId: "ACME", businessInspectionTypeId: "pre-trip" },
    { formFieldName: "fuel-level", formFieldType: "NUM" as const, formFieldLength: 3, companyId: "ACME", businessInspectionTypeId: "pre-trip" },
    { formFieldName: "trailer-number", formFieldType: "TEXT" as const, formFieldLength: 20, companyId: "ACME", businessInspectionTypeId: "pre-trip" },
    { formFieldName: "seal-number", formFieldType: "TEXT" as const, formFieldLength: 20, companyId: "ACME", businessInspectionTypeId: "pre-trip" },
    
    // ACME Post-trip fields
    { formFieldName: "ending-odometer", formFieldType: "NUM" as const, formFieldLength: 10, companyId: "ACME", businessInspectionTypeId: "post-trip" },
    { formFieldName: "fuel-remaining", formFieldType: "NUM" as const, formFieldLength: 3, companyId: "ACME", businessInspectionTypeId: "post-trip" },
    { formFieldName: "issues-noted", formFieldType: "TEXT" as const, formFieldLength: 64, companyId: "ACME", businessInspectionTypeId: "post-trip" },
    
    // ACME Yard-check fields
    { formFieldName: "dock-number", formFieldType: "TEXT" as const, formFieldLength: 10, companyId: "ACME", businessInspectionTypeId: "yard-check" },
    { formFieldName: "trailer-condition", formFieldType: "TEXT" as const, formFieldLength: 32, companyId: "ACME", businessInspectionTypeId: "yard-check" },
    
    // ACME Forklift daily fields
    { formFieldName: "hours-meter", formFieldType: "NUM" as const, formFieldLength: 8, companyId: "ACME", businessInspectionTypeId: "forklift-daily" },
    { formFieldName: "battery-charge", formFieldType: "NUM" as const, formFieldLength: 3, companyId: "ACME", businessInspectionTypeId: "forklift-daily" },
    { formFieldName: "propane-level", formFieldType: "NUM" as const, formFieldLength: 3, companyId: "ACME", businessInspectionTypeId: "forklift-daily" },
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
  
  // avazquez - can view all companies (no companyId assignment) - uses NEC-HQ as default location
  await storage.createUser({
    userId: "avazquez",
    password: "casio",
    userFullName: "Antonio Vazquez",
    status: "ACTIVE",
    webAccess: true,
    companyId: null,
    locationId: "NEC-HQ",
  });
  console.log("   ✅ Created superuser: avazquez (companyId: null)");
  
  // Company-specific users - john_nec is a customer admin
  await storage.createUser({
    userId: "john_nec",
    password: "password123",
    userFullName: "John Smith",
    userTag: "SUPERVISOR",
    status: "ACTIVE",
    webAccess: true,
    customerAdminAccess: true,
    companyId: "NEC",
    locationId: "NEC-HQ",
  });
  console.log("   ✅ Created customer admin: john_nec (companyId: NEC)");
  
  await storage.createUser({
    userId: "sarah_walmart",
    password: "password123",
    userFullName: "Sarah Johnson",
    userTag: "MECHANIC",
    status: "ACTIVE",
    webAccess: true,
    companyId: "WALMART",
    locationId: "WALMART-DC1",
  });
  console.log("   ✅ Created user: sarah_walmart (companyId: WALMART)");
  
  await storage.createUser({
    userId: "mike_fedex",
    password: "password123",
    userFullName: "Mike Davis",
    status: "ACTIVE",
    webAccess: true,
    companyId: "FEDEX",
    locationId: "FEDEX-HUB",
  });
  console.log("   ✅ Created user: mike_fedex (companyId: FEDEX)");
  
  // Additional user to test login (adrianal from production logs)
  await storage.createUser({
    userId: "adrianal",
    password: "password123",
    userFullName: "Adriana Lopez",
    status: "ACTIVE",
    webAccess: true,
    companyId: "WALMART",
    locationId: "WALMART-DC2",
  });
  console.log("   ✅ Created user: adrianal (companyId: WALMART)");
  
  // Add inactive users for testing filters
  await storage.createUser({
    userId: "bob_inactive",
    password: "password123",
    userFullName: "Bob Inactive",
    status: "INACTIVE",
    webAccess: false,
    companyId: "NEC",
    locationId: "NEC-WAREHOUSE",
  });
  console.log("   ✅ Created inactive user: bob_inactive (companyId: NEC)");
  
  await storage.createUser({
    userId: "jane_former",
    password: "password123",
    userFullName: "Jane Former",
    status: "INACTIVE",
    webAccess: false,
    companyId: "FEDEX",
    locationId: "FEDEX-DEPOT",
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
    // ACME layouts (high volume)
    { layoutName: "TRUCK", companyId: "ACME" },
    { layoutName: "TRAILER", companyId: "ACME" },
    { layoutName: "VAN", companyId: "ACME" },
    { layoutName: "FORKLIFT", companyId: "ACME" },
    { layoutName: "PALLET-JACK", companyId: "ACME" },
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
  const allInspectionTypesData = [...necInspectionTypesData, ...walmartInspectionTypesData, ...fedexInspectionTypesData, ...acmeInspectionTypesData];
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

  // Create layout zones, components, and defects based on NJ DOT inspection form
  console.log("🔧 Creating layout structures (zones, components, defects)...");
  
  // Layout templates based on NJ DOT vehicle inspection requirements
  const layoutTemplates = {
    "SCHOOL-BUS": {
      zones: [
        { name: "Before Operating", tag: "PRE-OP", components: [
          { name: "Bus Interior Damage", instructions: "Check for tears, damage, or unsafe conditions", defects: [
            { name: "Torn seat", severity: 4, instructions: "Repair or replace damaged seat" },
            { name: "Damaged handrails", severity: 6, instructions: "Replace or secure handrails" },
          ]},
          { name: "Fire Extinguisher", instructions: "Verify charged and accessible", defects: [
            { name: "Expired", severity: 8, instructions: "Replace immediately - safety critical" },
            { name: "Low pressure", severity: 7, instructions: "Recharge or replace" },
          ]},
          { name: "Emergency Exits", instructions: "Test all emergency doors and windows", defects: [
            { name: "Door won't open", severity: 10, instructions: "Out of service - repair immediately" },
            { name: "Buzzer not working", severity: 6, instructions: "Repair buzzer system" },
          ]},
          { name: "Seats", instructions: "Check all passenger seats for security", defects: [
            { name: "Loose mounting", severity: 7, instructions: "Tighten or replace mounts" },
            { name: "Missing seatbelt", severity: 8, instructions: "Install replacement belt" },
          ]},
        ]},
        { name: "During Warm-Up", tag: "WARM-UP", components: [
          { name: "Service Brakes", instructions: "Test brake pedal response and hold", defects: [
            { name: "Spongy pedal", severity: 8, instructions: "Bleed brakes or check for leaks" },
            { name: "Pulls to one side", severity: 7, instructions: "Inspect brake calipers" },
          ]},
          { name: "Windshield Wipers", instructions: "Test all speeds and washer fluid", defects: [
            { name: "Streaking", severity: 3, instructions: "Replace wiper blades" },
            { name: "Not working", severity: 9, instructions: "Repair wiper motor - weather safety" },
          ]},
          { name: "Headlights", instructions: "Check high and low beams", defects: [
            { name: "Bulb out", severity: 8, instructions: "Replace bulb before operation" },
            { name: "Lens cracked", severity: 5, instructions: "Replace headlight assembly" },
          ]},
          { name: "Stop Lights", instructions: "Verify all brake lights illuminate", defects: [
            { name: "Bulb out", severity: 9, instructions: "Replace immediately - safety critical" },
            { name: "Dim light", severity: 6, instructions: "Check wiring and bulb" },
          ]},
          { name: "School Bus Warning Lights", instructions: "Test amber and red warning lights", defects: [
            { name: "Lights not working", severity: 10, instructions: "Out of service - must repair" },
            { name: "Flashing incorrectly", severity: 8, instructions: "Repair flasher unit" },
          ]},
        ]},
        { name: "Exterior Walkaround", tag: "EXTERIOR", components: [
          { name: "Tires", instructions: "Check tread depth and sidewall condition", defects: [
            { name: "Low tread", severity: 8, instructions: "Replace if below 4/32 inch" },
            { name: "Sidewall damage", severity: 9, instructions: "Replace tire immediately" },
          ]},
          { name: "Mirrors", instructions: "Check all mirrors for visibility and security", defects: [
            { name: "Cracked", severity: 6, instructions: "Replace mirror" },
            { name: "Loose mounting", severity: 7, instructions: "Tighten or repair mount" },
          ]},
          { name: "Stop Arm", instructions: "Test stop arm extension and lights", defects: [
            { name: "Won't extend", severity: 10, instructions: "Out of service - repair mechanism" },
            { name: "Lights not working", severity: 9, instructions: "Repair stop arm lights" },
          ]},
        ]},
      ]
    },
    "TRUCK": {
      zones: [
        { name: "Before Operating", tag: "PRE-OP", components: [
          { name: "Fuel Level", instructions: "Verify sufficient fuel for route", defects: [
            { name: "Below 1/4 tank", severity: 4, instructions: "Refuel before departure" },
            { name: "Fuel leak detected", severity: 10, instructions: "Out of service - repair leak" },
          ]},
          { name: "Engine Oil", instructions: "Check oil level and condition", defects: [
            { name: "Low oil level", severity: 7, instructions: "Add oil to proper level" },
            { name: "Oil leak", severity: 8, instructions: "Repair leak before operation" },
          ]},
          { name: "Coolant", instructions: "Check coolant level in reservoir", defects: [
            { name: "Low coolant", severity: 6, instructions: "Top off coolant" },
            { name: "Leak detected", severity: 9, instructions: "Repair cooling system" },
          ]},
        ]},
        { name: "During Warm-Up", tag: "WARM-UP", components: [
          { name: "Air Brakes", instructions: "Test air pressure and brake response", defects: [
            { name: "Low air pressure", severity: 10, instructions: "Out of service - repair air system" },
            { name: "Slow build time", severity: 7, instructions: "Inspect compressor" },
          ]},
          { name: "Parking Brake", instructions: "Test parking brake hold", defects: [
            { name: "Won't hold", severity: 10, instructions: "Out of service - adjust or repair" },
            { name: "Slow release", severity: 5, instructions: "Inspect brake linkage" },
          ]},
          { name: "Gauges", instructions: "Check all instrument readings", defects: [
            { name: "Warning light on", severity: 8, instructions: "Diagnose and repair issue" },
            { name: "Gauge not working", severity: 6, instructions: "Replace gauge or sensor" },
          ]},
        ]},
        { name: "Exterior Walkaround", tag: "EXTERIOR", components: [
          { name: "Tires", instructions: "Inspect all tires for wear and damage", defects: [
            { name: "Tread below limit", severity: 9, instructions: "Replace tire" },
            { name: "Uneven wear", severity: 6, instructions: "Check alignment" },
          ]},
          { name: "Lights", instructions: "Test all exterior lights", defects: [
            { name: "Light out", severity: 8, instructions: "Replace bulb or fixture" },
            { name: "Lens damaged", severity: 5, instructions: "Replace lens" },
          ]},
          { name: "Cargo Securement", instructions: "Verify load is properly secured", defects: [
            { name: "Loose straps", severity: 9, instructions: "Tighten all cargo straps" },
            { name: "Shifted load", severity: 10, instructions: "Resecure load before departure" },
          ]},
        ]},
      ]
    },
    "TRAILER": {
      zones: [
        { name: "Coupling", tag: "COUPLING", components: [
          { name: "Fifth Wheel", instructions: "Check fifth wheel connection and lock", defects: [
            { name: "Not locked", severity: 10, instructions: "Out of service - ensure proper lock" },
            { name: "Worn kingpin", severity: 8, instructions: "Replace kingpin" },
          ]},
          { name: "Glad Hands", instructions: "Check air line connections", defects: [
            { name: "Leak detected", severity: 9, instructions: "Replace seals or lines" },
            { name: "Cross-threaded", severity: 7, instructions: "Replace glad hand" },
          ]},
          { name: "Safety Chains", instructions: "Verify chains are attached and secure", defects: [
            { name: "Not attached", severity: 10, instructions: "Attach safety chains" },
            { name: "Damaged links", severity: 8, instructions: "Replace chains" },
          ]},
        ]},
        { name: "Exterior Inspection", tag: "EXTERIOR", components: [
          { name: "Trailer Tires", instructions: "Inspect all trailer tires", defects: [
            { name: "Flat tire", severity: 10, instructions: "Replace or repair tire" },
            { name: "Low tread", severity: 8, instructions: "Replace tire" },
          ]},
          { name: "Trailer Lights", instructions: "Test all trailer lights", defects: [
            { name: "Light not working", severity: 9, instructions: "Repair wiring or replace bulb" },
            { name: "Corroded socket", severity: 6, instructions: "Clean or replace socket" },
          ]},
          { name: "Doors", instructions: "Check rear and side doors for operation", defects: [
            { name: "Won't latch", severity: 8, instructions: "Adjust or replace latch" },
            { name: "Damaged seals", severity: 4, instructions: "Replace door seals" },
          ]},
        ]},
        { name: "Brake System", tag: "BRAKES", components: [
          { name: "Brake Adjustment", instructions: "Check brake adjustment on all wheels", defects: [
            { name: "Out of adjustment", severity: 9, instructions: "Adjust brakes per spec" },
            { name: "Brake drag", severity: 7, instructions: "Inspect brake chamber" },
          ]},
          { name: "Brake Hoses", instructions: "Inspect all brake hoses for damage", defects: [
            { name: "Cracked hose", severity: 10, instructions: "Replace hose immediately" },
            { name: "Rubbing on frame", severity: 6, instructions: "Reroute or protect hose" },
          ]},
        ]},
      ]
    },
  };

  // Helper function to instantiate a layout template
  const instantiateLayout = async (template: typeof layoutTemplates["SCHOOL-BUS"], layoutUuid: string) => {
    const zoneMap = new Map<string, string>();
    
    for (const zoneTemplate of template.zones) {
      // Insert zone
      const [zone] = await db.insert(layoutZones).values({
        zoneName: zoneTemplate.name,
        zoneTag: zoneTemplate.tag,
        layoutId: layoutUuid,
      }).returning();
      
      zoneMap.set(zoneTemplate.name, zone.id);
      
      // Insert components for this zone
      for (const compTemplate of zoneTemplate.components) {
        const [component] = await db.insert(layoutZoneComponents).values({
          componentName: compTemplate.name,
          componentInspectionInstructions: compTemplate.instructions,
          zoneId: zone.id,
        }).returning();
        
        // Insert defects for this component
        for (const defectTemplate of compTemplate.defects) {
          await db.insert(componentDefects).values({
            defectName: defectTemplate.name,
            defectMaxSeverity: defectTemplate.severity,
            defectInstructions: defectTemplate.instructions,
            componentId: component.id,
          });
        }
      }
    }
  };

  // Apply templates to all companies' SCHOOL-BUS, TRUCK, and TRAILER layouts
  const layoutsToPopulate = ["SCHOOL-BUS", "TRUCK", "TRAILER"];
  const companiesToPopulate = ["NEC", "WALMART", "FEDEX", "ACME"];
  
  for (const company of companiesToPopulate) {
    for (const layoutType of layoutsToPopulate) {
      const layoutUuid = layoutMap.get(`${company}:${layoutType}`);
      if (layoutUuid && layoutTemplates[layoutType as keyof typeof layoutTemplates]) {
        await instantiateLayout(layoutTemplates[layoutType as keyof typeof layoutTemplates], layoutUuid);
        console.log(`   ✅ Created ${layoutType} structure for ${company}`);
      }
    }
  }
  
  console.log("✅ Created layout structures for all companies");

  // Create assets for all companies
  console.log("📦 Creating assets...");
  
  // Helper function to map asset data to include layout UUID and locationId
  const mapAssetToLayout = (asset: {assetId: string, layoutKey: string, assetName: string, status: "ACTIVE" | "INACTIVE", companyId: string, locationId: string}) => {
    const layoutId = layoutMap.get(`${asset.companyId}:${asset.layoutKey}`);
    if (!layoutId) {
      throw new Error(`Layout not found for ${asset.companyId}:${asset.layoutKey}`);
    }
    return {
      assetId: asset.assetId,
      layout: layoutId,
      assetName: asset.assetName,
      status: asset.status,
      companyId: asset.companyId,
      locationId: asset.locationId,
    };
  };
  
  // NEC Assets - matching the inspection data
  const necAssetData = [
    { assetId: "TRUCK-2401", layoutKey: "TRUCK", assetName: "Freightliner 2401", status: "ACTIVE" as const, companyId: "NEC", locationId: "NEC-YARD" },
    { assetId: "TRUCK-2402", layoutKey: "TRUCK", assetName: "Peterbilt 2402", status: "ACTIVE" as const, companyId: "NEC", locationId: "NEC-YARD" },
    { assetId: "TRUCK-2403", layoutKey: "TRUCK", assetName: "Kenworth 2403", status: "ACTIVE" as const, companyId: "NEC", locationId: "NEC-YARD" },
    { assetId: "VAN-1501", layoutKey: "VAN", assetName: "Ford Transit 1501", status: "ACTIVE" as const, companyId: "NEC", locationId: "NEC-HQ" },
    { assetId: "VAN-1502", layoutKey: "VAN", assetName: "Mercedes Sprinter 1502", status: "ACTIVE" as const, companyId: "NEC", locationId: "NEC-HQ" },
    { assetId: "FORKLIFT-089", layoutKey: "FORKLIFT", assetName: "Toyota 089", status: "ACTIVE" as const, companyId: "NEC", locationId: "NEC-WAREHOUSE" },
    { assetId: "FORKLIFT-090", layoutKey: "FORKLIFT", assetName: "Caterpillar 090", status: "ACTIVE" as const, companyId: "NEC", locationId: "NEC-WAREHOUSE" },
    { assetId: "CRANE-12", layoutKey: "CRANE", assetName: "Mobile Crane 12", status: "ACTIVE" as const, companyId: "NEC", locationId: "NEC-YARD" },
    { assetId: "CRANE-13", layoutKey: "CRANE", assetName: "Tower Crane 13", status: "INACTIVE" as const, companyId: "NEC", locationId: "NEC-YARD" },
    { assetId: "PALLET-JACK-05", layoutKey: "PALLET-JACK", assetName: "Electric Jack 05", status: "ACTIVE" as const, companyId: "NEC", locationId: "NEC-WAREHOUSE" },
  ];
  
  // WALMART Assets
  const walmartAssetData = [
    { assetId: "VAN-1145", layoutKey: "VAN", assetName: "Delivery Van 1145", status: "ACTIVE" as const, companyId: "WALMART", locationId: "WALMART-DC1" },
    { assetId: "VAN-1146", layoutKey: "VAN", assetName: "Delivery Van 1146", status: "ACTIVE" as const, companyId: "WALMART", locationId: "WALMART-DC1" },
    { assetId: "TRUCK-5001", layoutKey: "TRUCK", assetName: "Semi Truck 5001", status: "ACTIVE" as const, companyId: "WALMART", locationId: "WALMART-DC2" },
    { assetId: "TRUCK-5002", layoutKey: "TRUCK", assetName: "Semi Truck 5002", status: "ACTIVE" as const, companyId: "WALMART", locationId: "WALMART-DC2" },
    { assetId: "EXCAVATOR-45", layoutKey: "EXCAVATOR", assetName: "Excavator 45", status: "INACTIVE" as const, companyId: "WALMART", locationId: "WALMART-STORE1" },
    { assetId: "LOADER-22", layoutKey: "LOADER", assetName: "Front Loader 22", status: "ACTIVE" as const, companyId: "WALMART", locationId: "WALMART-DC1" },
    { assetId: "FORKLIFT-W01", layoutKey: "FORKLIFT", assetName: "Warehouse Forklift W01", status: "ACTIVE" as const, companyId: "WALMART", locationId: "WALMART-DC1" },
    { assetId: "FORKLIFT-W02", layoutKey: "FORKLIFT", assetName: "Warehouse Forklift W02", status: "ACTIVE" as const, companyId: "WALMART", locationId: "WALMART-DC2" },
    { assetId: "CONVEYOR-W3", layoutKey: "CONVEYOR", assetName: "Belt Conveyor W3", status: "ACTIVE" as const, companyId: "WALMART", locationId: "WALMART-DC1" },
    { assetId: "PALLET-JACK-W10", layoutKey: "PALLET-JACK", assetName: "Manual Jack W10", status: "ACTIVE" as const, companyId: "WALMART", locationId: "WALMART-DC2" },
  ];
  
  // FEDEX Assets
  const fedexAssetData = [
    { assetId: "CONVEYOR-C3", layoutKey: "CONVEYOR", assetName: "Sortation Belt C3", status: "ACTIVE" as const, companyId: "FEDEX", locationId: "FEDEX-SORT" },
    { assetId: "SORTATION-UNIT-4", layoutKey: "SORTATION-UNIT", assetName: "Auto Sort Unit 4", status: "ACTIVE" as const, companyId: "FEDEX", locationId: "FEDEX-SORT" },
    { assetId: "VAN-8803", layoutKey: "VAN", assetName: "Delivery Van 8803", status: "ACTIVE" as const, companyId: "FEDEX", locationId: "FEDEX-DEPOT" },
    { assetId: "TRUCK-5503", layoutKey: "TRUCK", assetName: "Box Truck 5503", status: "ACTIVE" as const, companyId: "FEDEX", locationId: "FEDEX-HUB" },
    { assetId: "FORKLIFT-F10", layoutKey: "FORKLIFT", assetName: "Hyster F10", status: "ACTIVE" as const, companyId: "FEDEX", locationId: "FEDEX-SORT" },
    { assetId: "LOADER-F22", layoutKey: "LOADER", assetName: "Front Loader F22", status: "ACTIVE" as const, companyId: "FEDEX", locationId: "FEDEX-HUB" },
    { assetId: "PALLET-JACK-F05", layoutKey: "PALLET-JACK", assetName: "Electric Jack F05", status: "ACTIVE" as const, companyId: "FEDEX", locationId: "FEDEX-SORT" },
    { assetId: "TRUCK-5504", layoutKey: "TRUCK", assetName: "Box Truck 5504", status: "INACTIVE" as const, companyId: "FEDEX", locationId: "FEDEX-HUB" },
    { assetId: "VAN-8804", layoutKey: "VAN", assetName: "Delivery Van 8804", status: "ACTIVE" as const, companyId: "FEDEX", locationId: "FEDEX-DEPOT" },
    { assetId: "CRANE-F1", layoutKey: "CRANE", assetName: "Gantry Crane F1", status: "ACTIVE" as const, companyId: "FEDEX", locationId: "FEDEX-HUB" },
  ];
  
  // Map asset data to include layout UUIDs and insert
  const allAssets = [
    ...necAssetData.map(mapAssetToLayout),
    ...walmartAssetData.map(mapAssetToLayout),
    ...fedexAssetData.map(mapAssetToLayout),
  ];
  await db.insert(assets).values(allAssets);
  
  console.log(`✅ Created ${necAssetData.length + walmartAssetData.length + fedexAssetData.length} assets (${necAssetData.length} NEC, ${walmartAssetData.length} WALMART, ${fedexAssetData.length} FEDEX)`);

  // Create sample inspections - 45 per company with varied data
  console.log("📋 Creating sample inspections...");
  
  // Helper arrays for varied data
  const inspectionTypeNames = [
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
  
  // NEC locations for inspections
  const necLocations = [
    { id: "NEC-HQ", name: "NEC Headquarters" },
    { id: "NEC-WAREHOUSE", name: "NEC Warehouse" },
    { id: "NEC-YARD", name: "NEC Equipment Yard" },
  ];
  
  // Generate 45 NEC inspections across October 2025
  const necInspectionData = [];
  for (let i = 0; i < 45; i++) {
    const day = (i % 22) + 1; // Days 1-22
    const hour = 7 + (i % 10); // Hours 7-16
    const minute = (i * 15) % 60;
    const location = necLocations[i % necLocations.length];
    
    necInspectionData.push({
      id: randomUUID(),
      companyId: "NEC",
      datetime: new Date(`2025-10-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`),
      inspectionType: inspectionTypeNames[i % inspectionTypeNames.length],
      driverName: necDrivers[i % necDrivers.length].name,
      driverId: necDrivers[i % necDrivers.length].id,
      inspectionFormData: `Inspection #${i + 1} - Routine check completed.`,
      locationId: location.id,
      locationName: location.name,
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
  
  // WALMART locations for inspections
  const walmartLocations = [
    { id: "WALMART-DC1", name: "Distribution Center 1" },
    { id: "WALMART-DC2", name: "Distribution Center 2" },
    { id: "WALMART-STORE1", name: "Store 1" },
  ];
  
  // Generate 45 WALMART inspections
  const walmartInspectionData = [];
  for (let i = 0; i < 45; i++) {
    const day = (i % 22) + 1;
    const hour = 8 + (i % 9);
    const minute = (i * 20) % 60;
    const location = walmartLocations[i % walmartLocations.length];
    
    walmartInspectionData.push({
      id: randomUUID(),
      companyId: "WALMART",
      datetime: new Date(`2025-10-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`),
      inspectionType: inspectionTypeNames[i % inspectionTypeNames.length],
      driverName: walmartDrivers[i % walmartDrivers.length].name,
      driverId: walmartDrivers[i % walmartDrivers.length].id,
      inspectionFormData: `Inspection #${i + 1} - Standard inspection protocol.`,
      locationId: location.id,
      locationName: location.name,
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
  
  // FEDEX locations for inspections
  const fedexLocations = [
    { id: "FEDEX-HUB", name: "Memphis Hub" },
    { id: "FEDEX-SORT", name: "Sortation Center" },
    { id: "FEDEX-DEPOT", name: "Local Depot" },
  ];
  
  // Generate 45 FEDEX inspections
  const fedexInspectionData = [];
  for (let i = 0; i < 45; i++) {
    const day = (i % 22) + 1;
    const hour = 6 + (i % 11);
    const minute = (i * 13) % 60;
    const location = fedexLocations[i % fedexLocations.length];
    
    fedexInspectionData.push({
      id: randomUUID(),
      companyId: "FEDEX",
      datetime: new Date(`2025-10-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`),
      inspectionType: inspectionTypeNames[i % inspectionTypeNames.length],
      driverName: fedexDrivers[i % fedexDrivers.length].name,
      driverId: fedexDrivers[i % fedexDrivers.length].id,
      inspectionFormData: `Inspection #${i + 1} - Operations check complete.`,
      locationId: location.id,
      locationName: location.name,
    });
  }
  
  const fedexInspections = await db.insert(inspections).values(fedexInspectionData).returning();
  
  console.log(`✅ Created ${necInspections.length + walmartInspections.length + fedexInspections.length} inspections (${necInspections.length} NEC, ${walmartInspections.length} WALMART, ${fedexInspections.length} FEDEX)`);

  // Populate inspection_assets for all single-asset inspections
  console.log("🔗 Creating inspection_assets for single-asset inspections...");
  const singleAssetAssociations = [
    ...necInspections.map((insp, i) => ({ inspectionId: insp.id, assetId: necAssets[i % necAssets.length] })),
    ...walmartInspections.map((insp, i) => ({ inspectionId: insp.id, assetId: walmartAssets[i % walmartAssets.length] })),
    ...fedexInspections.map((insp, i) => ({ inspectionId: insp.id, assetId: fedexAssets[i % fedexAssets.length] })),
  ];
  await db.insert(inspectionAssets).values(singleAssetAssociations);
  console.log(`✅ Created ${singleAssetAssociations.length} single-asset associations`);

  // Create multi-asset inspection test data
  console.log("🚛 Creating multi-asset inspection test data...");
  
  // NEC Multi-Asset Inspections
  const necMultiAssetInspections = await db.insert(inspections).values([
    {
      id: randomUUID(),
      companyId: "NEC",
      datetime: new Date('2025-11-01T08:00:00'),
      inspectionType: "pre-trip",
      driverName: "John Smith",
      driverId: "DRV-12345",
      inspectionFormData: "Multi-asset inspection: Tractor + Dolly + Trailer",
      locationId: "NEC-HQ",
      locationName: "NEC Headquarters",
    },
    {
      id: randomUUID(),
      companyId: "NEC",
      datetime: new Date('2025-11-05T14:30:00'),
      inspectionType: "post-trip",
      driverName: "Sarah Johnson",
      driverId: "DRV-54321",
      inspectionFormData: "Multi-asset inspection: Tractor + Trailer",
      locationId: "NEC-WAREHOUSE",
      locationName: "NEC Warehouse",
    },
  ]).returning();
  
  // WALMART Multi-Asset Inspections
  const walmartMultiAssetInspections = await db.insert(inspections).values([
    {
      id: randomUUID(),
      companyId: "WALMART",
      datetime: new Date('2025-11-02T09:15:00'),
      inspectionType: "delivery-pre-trip",
      driverName: "Michael Brown",
      driverId: "DRV-10892",
      inspectionFormData: "Multi-asset inspection: Truck + Trailer combo",
      locationId: "WALMART-DC1",
      locationName: "Distribution Center 1",
    },
    {
      id: randomUUID(),
      companyId: "WALMART",
      datetime: new Date('2025-11-06T07:45:00'),
      inspectionType: "delivery-pre-trip",
      driverName: "Emily Davis",
      driverId: "DRV-10123",
      inspectionFormData: "Multi-asset inspection: Van with attached equipment",
      locationId: "WALMART-DC2",
      locationName: "Distribution Center 2",
    },
  ]).returning();
  
  // FEDEX Multi-Asset Inspections
  const fedexMultiAssetInspections = await db.insert(inspections).values([
    {
      id: randomUUID(),
      companyId: "FEDEX",
      datetime: new Date('2025-11-03T06:30:00'),
      inspectionType: "van-pre-route",
      driverName: "James Wilson",
      driverId: "DRV-20445",
      inspectionFormData: "Multi-asset inspection: Van + Dolly + Trailer",
      locationId: "FEDEX-HUB",
      locationName: "Memphis Hub",
    },
    {
      id: randomUUID(),
      companyId: "FEDEX",
      datetime: new Date('2025-11-07T13:00:00'),
      inspectionType: "van-pre-route",
      driverName: "Maria Garcia",
      driverId: "DRV-20567",
      inspectionFormData: "Multi-asset inspection: Truck + Trailer",
      locationId: "FEDEX-SORT",
      locationName: "Sortation Center",
    },
  ]).returning();
  
  // Create inspection_assets junction table entries
  console.log("🔗 Creating inspection_assets associations...");
  
  const inspectionAssetsData = [
    // NEC multi-asset associations
    { inspectionId: necMultiAssetInspections[0].id, assetId: "127" },
    { inspectionId: necMultiAssetInspections[0].id, assetId: "DOLLY-5" },
    { inspectionId: necMultiAssetInspections[0].id, assetId: "TRAILER-101" },
    { inspectionId: necMultiAssetInspections[1].id, assetId: "127" },
    { inspectionId: necMultiAssetInspections[1].id, assetId: "TRAILER-102" },
    
    // WALMART multi-asset associations
    { inspectionId: walmartMultiAssetInspections[0].id, assetId: "TRUCK-5001" },
    { inspectionId: walmartMultiAssetInspections[0].id, assetId: "TRAILER-W50" },
    { inspectionId: walmartMultiAssetInspections[1].id, assetId: "VAN-1145" },
    { inspectionId: walmartMultiAssetInspections[1].id, assetId: "LOADER-22" },
    
    // FEDEX multi-asset associations
    { inspectionId: fedexMultiAssetInspections[0].id, assetId: "VAN-8803" },
    { inspectionId: fedexMultiAssetInspections[0].id, assetId: "DOLLY-F2" },
    { inspectionId: fedexMultiAssetInspections[0].id, assetId: "TRAILER-F10" },
    { inspectionId: fedexMultiAssetInspections[1].id, assetId: "TRUCK-5503" },
    { inspectionId: fedexMultiAssetInspections[1].id, assetId: "TRAILER-F11" },
  ];
  
  await db.insert(inspectionAssets).values(inspectionAssetsData);
  
  console.log(`✅ Created ${necMultiAssetInspections.length + walmartMultiAssetInspections.length + fedexMultiAssetInspections.length} multi-asset inspections with ${inspectionAssetsData.length} asset associations`);
  
  // Create asset-to-location lookup maps for defect location data (used for both multi-asset and regular defects)
  const locationNameMap = new Map(locationsData.map(loc => [loc.id, loc.locationName]));
  const assetLocationMap = new Map<string, { locationId: string; locationName: string }>();
  
  [...necAssetData, ...walmartAssetData, ...fedexAssetData].forEach(asset => {
    assetLocationMap.set(asset.assetId, {
      locationId: asset.locationId,
      locationName: locationNameMap.get(asset.locationId) || "Unknown Location"
    });
  });

  // Helper function to get location from asset
  const getAssetLocation = (assetId: string) => {
    const loc = assetLocationMap.get(assetId);
    return loc ? { locationId: loc.locationId, locationName: loc.locationName } : { locationId: null, locationName: null };
  };

  // Create defects for multi-asset inspections with specific assetId values
  console.log("🔧 Creating defects for multi-asset inspections...");
  
  const multiAssetDefectsBase = [
    // NEC Inspection 1: Tractor + Dolly + Trailer
    { inspectionId: necMultiAssetInspections[0].id, assetId: "127", zoneName: "Brakes", componentName: "Front Brake Pads", defect: "Worn brake pads", severity: 9, status: "open" as const, driverNotes: "Tractor brakes need attention" },
    { inspectionId: necMultiAssetInspections[0].id, assetId: "DOLLY-5", zoneName: "Tires", componentName: "Left Tire", defect: "Low tire pressure", severity: 5, status: "open" as const, driverNotes: "Dolly tire needs inflation" },
    { inspectionId: necMultiAssetInspections[0].id, assetId: "TRAILER-101", zoneName: "Lights", componentName: "Brake Lights", defect: "Broken brake light", severity: 8, status: "pending" as const, driverNotes: "Trailer light not working" },
    
    // NEC Inspection 2: Tractor + Trailer
    { inspectionId: necMultiAssetInspections[1].id, assetId: "127", zoneName: "Engine", componentName: "Oil Level", defect: "Oil level low", severity: 6, status: "repaired" as const, driverNotes: "Tractor oil topped up", repairNotes: "Added 2 quarts" },
    { inspectionId: necMultiAssetInspections[1].id, assetId: "TRAILER-102", zoneName: "Cargo Area", componentName: "Tie-Down Points", defect: "Rusty tie-down anchor", severity: 5, status: "open" as const, driverNotes: "Trailer cargo anchors need inspection" },
    
    // WALMART Inspection 1: Truck + Trailer
    { inspectionId: walmartMultiAssetInspections[0].id, assetId: "TRUCK-5001", zoneName: "Steering", componentName: "Power Steering", defect: "Steering fluid leak", severity: 8, status: "pending" as const, driverNotes: "Truck steering issue", repairNotes: "Scheduled for repair" },
    { inspectionId: walmartMultiAssetInspections[0].id, assetId: "TRAILER-W50", zoneName: "Suspension", componentName: "Leaf Springs", defect: "Cracked leaf spring", severity: 7, status: "open" as const, driverNotes: "Trailer suspension damaged" },
    
    // WALMART Inspection 2: Van + Equipment
    { inspectionId: walmartMultiAssetInspections[1].id, assetId: "VAN-1145", zoneName: "Electrical", componentName: "Battery", defect: "Weak battery", severity: 6, status: "open" as const, driverNotes: "Van battery needs testing" },
    { inspectionId: walmartMultiAssetInspections[1].id, assetId: "LOADER-22", zoneName: "Hydraulics", componentName: "Lift Cylinder", defect: "Hydraulic leak", severity: 9, status: "open" as const, driverNotes: "Loader hydraulics leaking" },
    
    // FEDEX Inspection 1: Van + Dolly + Trailer
    { inspectionId: fedexMultiAssetInspections[0].id, assetId: "VAN-8803", zoneName: "Cabin", componentName: "Driver Seat", defect: "Torn seat cover", severity: 3, status: "open" as const, driverNotes: "Van seat needs repair" },
    { inspectionId: fedexMultiAssetInspections[0].id, assetId: "DOLLY-F2", zoneName: "Brakes", componentName: "Brake Lines", defect: "Corroded brake line", severity: 10, status: "pending" as const, driverNotes: "Dolly brake line critical", repairNotes: "Emergency repair scheduled" },
    { inspectionId: fedexMultiAssetInspections[0].id, assetId: "TRAILER-F10", zoneName: "Body", componentName: "Door Seals", defect: "Damaged door seal", severity: 4, status: "open" as const, driverNotes: "Trailer door seal worn" },
    
    // FEDEX Inspection 2: Truck + Trailer
    { inspectionId: fedexMultiAssetInspections[1].id, assetId: "TRUCK-5503", zoneName: "Tires", componentName: "Front Tires", defect: "Uneven tire wear", severity: 7, status: "open" as const, driverNotes: "Truck tires need rotation" },
    { inspectionId: fedexMultiAssetInspections[1].id, assetId: "TRAILER-F11", zoneName: "Lights", componentName: "Marker Lights", defect: "Missing marker light cover", severity: 4, status: "repaired" as const, driverNotes: "Trailer light cover replaced", repairNotes: "New cover installed" },
  ];
  
  // Add location data from asset lookup
  const multiAssetDefects = multiAssetDefectsBase.map(defect => ({
    ...defect,
    ...getAssetLocation(defect.assetId),
  }));
  
  await db.insert(defects).values(multiAssetDefects);
  
  console.log(`✅ Created ${multiAssetDefects.length} defects for multi-asset inspections`);

  // Create comprehensive defects for realistic legal inspection reports
  console.log("🔧 Creating comprehensive defect data...");
  
  // Defect templates for variety
  const defectTemplates = [
    // Critical Safety Defects (Severity 8-10)
    { zoneName: "Brakes", componentName: "Front Brake Pads", defect: "Brake pads worn below minimum thickness (2mm remaining)", severity: 9, status: "open" as const, driverNotes: "Grinding noise when braking, requires immediate attention" },
    { zoneName: "Steering", componentName: "Power Steering Pump", defect: "Power steering fluid leak detected at pump seal", severity: 9, status: "pending" as const, driverNotes: "Leak rate approximately 10ml/hour, steering becoming stiff", repairNotes: "Parts ordered, scheduled for replacement" },
    { zoneName: "Lights", componentName: "Brake Lights", defect: "Both rear brake lights not functioning", severity: 10, status: "open" as const, driverNotes: "Critical safety issue - vehicle not road safe" },
    { zoneName: "Tires", componentName: "Front Right Tire", defect: "Tire tread depth below legal minimum (1.6mm), visible steel belts", severity: 10, status: "pending" as const, driverNotes: "Tire failure risk - immediate replacement required", repairNotes: "New tire on order" },
    
    // Moderate Defects (Severity 4-7)
    { zoneName: "Engine", componentName: "Air Filter", defect: "Air filter heavily contaminated, restricting airflow", severity: 5, status: "repaired" as const, driverNotes: "Reduced engine performance noted", repairNotes: "Air filter replaced with OEM part" },
    { zoneName: "Suspension", componentName: "Shock Absorbers", defect: "Front left shock absorber leaking hydraulic fluid", severity: 7, status: "pending" as const, driverNotes: "Vehicle handling affected, bouncing on rough roads", repairNotes: "Repair scheduled for next maintenance window" },
    { zoneName: "Electrical", componentName: "Battery Terminals", defect: "Battery terminals corroded, loose connection on positive terminal", severity: 6, status: "repaired" as const, driverNotes: "Intermittent starting issues reported", repairNotes: "Terminals cleaned and tightened, protective coating applied" },
    { zoneName: "Windshield", componentName: "Wiper Blades", defect: "Wiper blades cracked and torn, leaving streaks", severity: 5, status: "repaired" as const, driverNotes: "Poor visibility during rain", repairNotes: "Both wiper blades replaced" },
    { zoneName: "Cabin", componentName: "Driver Seat", defect: "Driver seat adjustment mechanism jammed, seat will not move", severity: 4, status: "open" as const, driverNotes: "Unable to adjust seat position for proper driving posture" },
    
    // Minor Defects (Severity 1-3)
    { zoneName: "Exterior", componentName: "Side Mirror", defect: "Passenger side mirror glass has small crack in lower corner", severity: 3, status: "pending" as const, driverNotes: "Does not affect visibility significantly", repairNotes: "Replacement mirror ordered" },
    { zoneName: "Interior", componentName: "Door Handle", defect: "Interior door handle loose, requires extra force to open", severity: 2, status: "open" as const, driverNotes: "Minor inconvenience, handle still functional" },
    { zoneName: "Fluids", componentName: "Windshield Washer Fluid", defect: "Windshield washer fluid reservoir empty", severity: 1, status: "repaired" as const, driverNotes: "Unable to clean windshield during inspection", repairNotes: "Reservoir refilled with winter formula" },
    { zoneName: "Body", componentName: "Front Bumper", defect: "Minor cosmetic damage - small dent on front bumper", severity: 2, status: "open" as const, driverNotes: "Cosmetic only, no structural damage" },
    { zoneName: "Lights", componentName: "License Plate Light", defect: "License plate light bulb burned out", severity: 3, status: "repaired" as const, driverNotes: "May result in traffic citation", repairNotes: "Bulb replaced" },
    
    // Equipment-Specific Defects
    { zoneName: "Hydraulics", componentName: "Lift Cylinder", defect: "Hydraulic lift cylinder showing slow leak at rod seal", severity: 7, status: "pending" as const, driverNotes: "Lift operation becoming sluggish, safety concern", repairNotes: "Seal replacement parts requisitioned" },
    { zoneName: "Safety Equipment", componentName: "Fire Extinguisher", defect: "Fire extinguisher pressure gauge in red zone, expired inspection tag", severity: 8, status: "open" as const, driverNotes: "Fire extinguisher may not function properly in emergency" },
    { zoneName: "Cargo Area", componentName: "Tie-Down Points", defect: "Two cargo tie-down anchors showing signs of stress fractures", severity: 6, status: "pending" as const, driverNotes: "Load securing capability compromised", repairNotes: "Structural engineer assessment scheduled" },
  ];
  
  let totalDefects = 0;
  
  // Add varied defects to first 20 NEC inspections (will appear in first 2 pages)
  for (let i = 0; i < Math.min(20, necInspections.length); i++) {
    // 70% chance of having defects
    if (Math.random() < 0.7) {
      const numDefects = Math.floor(Math.random() * 4) + 1; // 1-4 defects per inspection
      const selectedDefects = [];
      const assetId = necAssets[i % necAssets.length];
      const assetLocation = assetLocationMap.get(assetId);
      
      for (let j = 0; j < numDefects; j++) {
        const template = defectTemplates[Math.floor(Math.random() * defectTemplates.length)];
        selectedDefects.push({
          inspectionId: necInspections[i].id,
          assetId: assetId,
          zoneName: template.zoneName,
          componentName: template.componentName,
          defect: template.defect,
          severity: template.severity,
          driverNotes: template.driverNotes,
          status: template.status,
          repairNotes: template.repairNotes || null,
          locationId: assetLocation?.locationId || null,
          locationName: assetLocation?.locationName || null,
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
      const assetId = walmartAssets[i % walmartAssets.length];
      const assetLocation = assetLocationMap.get(assetId);
      
      for (let j = 0; j < numDefects; j++) {
        const template = defectTemplates[Math.floor(Math.random() * defectTemplates.length)];
        selectedDefects.push({
          inspectionId: walmartInspections[i].id,
          assetId: assetId,
          zoneName: template.zoneName,
          componentName: template.componentName,
          defect: template.defect,
          severity: template.severity,
          driverNotes: template.driverNotes,
          status: template.status,
          repairNotes: template.repairNotes || null,
          locationId: assetLocation?.locationId || null,
          locationName: assetLocation?.locationName || null,
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
      const assetId = fedexAssets[i % fedexAssets.length];
      const assetLocation = assetLocationMap.get(assetId);
      
      for (let j = 0; j < numDefects; j++) {
        const template = defectTemplates[Math.floor(Math.random() * defectTemplates.length)];
        selectedDefects.push({
          inspectionId: fedexInspections[i].id,
          assetId: assetId,
          zoneName: template.zoneName,
          componentName: template.componentName,
          defect: template.defect,
          severity: template.severity,
          driverNotes: template.driverNotes,
          status: template.status,
          repairNotes: template.repairNotes || null,
          locationId: assetLocation?.locationId || null,
          locationName: assetLocation?.locationName || null,
        });
      }
      
      await db.insert(defects).values(selectedDefects);
      totalDefects += selectedDefects.length;
    }
  }

  console.log(`✅ Created ${totalDefects} defects for existing companies`);

  // ============================================
  // ACME VOLUME DATA - 500 users, 500 assets, 10,000 inspections
  // ============================================
  console.log("🏭 Creating ACME volume data (500 users, 500 assets, 10,000 inspections)...");
  
  const acmeLocations = [
    { id: "ACME-ATL", name: "Atlanta Hub" },
    { id: "ACME-DAL", name: "Dallas Terminal" },
    { id: "ACME-CHI", name: "Chicago Distribution" },
    { id: "ACME-LAX", name: "Los Angeles Port" },
    { id: "ACME-NYC", name: "New York Terminal" },
  ];
  
  const acmeLayoutKeys = ["TRUCK", "TRAILER", "VAN", "FORKLIFT", "PALLET-JACK"];
  
  // Create 500 ACME users (100 per location) using direct DB insert for speed
  console.log("👥 Creating 500 ACME users...");
  const acmeUsersData = [];
  const firstNames = ["James", "Michael", "Robert", "David", "John", "William", "Richard", "Joseph", "Thomas", "Christopher", 
                      "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
                     "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];
  const userTags = ["DRIVER", "MECHANIC", "SUPERVISOR", "OPERATOR", null];
  
  for (let locIdx = 0; locIdx < acmeLocations.length; locIdx++) {
    const location = acmeLocations[locIdx];
    for (let i = 0; i < 100; i++) {
      const userNum = locIdx * 100 + i + 1;
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[Math.floor(i / 20) % lastNames.length];
      const randomPin = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit PIN
      acmeUsersData.push({
        id: randomUUID(),
        userId: `acme_user_${userNum.toString().padStart(3, '0')}`,
        password: randomPin, // Plain text 6-digit PIN
        userFullName: `${firstName} ${lastName}`,
        userTag: userTags[i % userTags.length],
        status: (i < 95 ? "ACTIVE" : "INACTIVE") as "ACTIVE" | "INACTIVE", // 5% inactive
        webAccess: i < 10, // First 10 per location have web access
        customerAdminAccess: i === 0, // First user per location is admin
        companyId: "ACME",
        locationId: location.id,
      });
    }
  }
  await db.insert(users).values(acmeUsersData);
  console.log(`   ✅ Created ${acmeUsersData.length} ACME users`);
  
  // Create 500 ACME assets (100 per location)
  console.log("📦 Creating 500 ACME assets...");
  const acmeAssetsData = [];
  const assetPrefixes = ["TRK", "TRL", "VAN", "FLT", "PLT"];
  const assetNames = ["Freightliner", "Peterbilt", "Kenworth", "Volvo", "International", "Mack", "Western Star", "Hino", "Isuzu", "Ford"];
  
  for (let locIdx = 0; locIdx < acmeLocations.length; locIdx++) {
    const location = acmeLocations[locIdx];
    for (let i = 0; i < 100; i++) {
      const assetNum = locIdx * 100 + i + 1;
      const layoutKey = acmeLayoutKeys[i % acmeLayoutKeys.length];
      const prefix = assetPrefixes[i % assetPrefixes.length];
      const layoutId = layoutMap.get(`ACME:${layoutKey}`);
      
      if (layoutId) {
        acmeAssetsData.push({
          assetId: `${prefix}-${assetNum.toString().padStart(4, '0')}`,
          layout: layoutId,
          assetName: `${assetNames[i % assetNames.length]} ${assetNum}`,
          licensePlate: `ACME${assetNum.toString().padStart(4, '0')}`,
          status: i < 90 ? "ACTIVE" as const : "INACTIVE" as const, // 10% inactive
          companyId: "ACME",
          locationId: location.id,
        });
      }
    }
  }
  await db.insert(assets).values(acmeAssetsData);
  console.log(`   ✅ Created ${acmeAssetsData.length} ACME assets`);
  
  // Build ACME asset location map for defects
  const acmeAssetLocationMap = new Map<string, { locationId: string; locationName: string }>();
  for (const asset of acmeAssetsData) {
    const loc = acmeLocations.find(l => l.id === asset.locationId);
    if (loc) {
      acmeAssetLocationMap.set(asset.assetId, { locationId: loc.id, locationName: loc.name });
    }
  }
  
  // Create 10,000 ACME inspections (spread across 6 months)
  console.log("📋 Creating 10,000 ACME inspections...");
  const acmeInspectionTypes = ["pre-trip", "post-trip", "yard-check", "forklift-daily"];
  const BATCH_SIZE = 500;
  let acmeInspectionsCreated = 0;
  const allAcmeInspections: Array<{ id: string; assetId: string; locationId: string; locationName: string }> = [];
  
  for (let batch = 0; batch < 20; batch++) { // 20 batches of 500 = 10,000
    const inspectionBatch = [];
    const inspectionAssetBatch = [];
    
    for (let i = 0; i < BATCH_SIZE; i++) {
      const inspNum = batch * BATCH_SIZE + i;
      // Spread across 6 months (180 days)
      const dayOffset = inspNum % 180;
      const startDate = new Date('2025-05-01');
      const inspDate = new Date(startDate);
      inspDate.setDate(inspDate.getDate() + dayOffset);
      inspDate.setHours(6 + (inspNum % 16), (inspNum * 7) % 60, 0);
      
      const location = acmeLocations[inspNum % acmeLocations.length];
      const userIdx = inspNum % acmeUsersData.length;
      const user = acmeUsersData[userIdx];
      const assetIdx = inspNum % acmeAssetsData.length;
      const asset = acmeAssetsData[assetIdx];
      
      const inspId = randomUUID();
      inspectionBatch.push({
        id: inspId,
        companyId: "ACME",
        datetime: inspDate,
        inspectionType: acmeInspectionTypes[inspNum % acmeInspectionTypes.length],
        driverName: user.userFullName,
        driverId: user.userId,
        inspectionFormData: JSON.stringify({ odometer: 10000 + inspNum * 50, fuelLevel: 50 + (inspNum % 50) }),
        locationId: location.id,
        locationName: location.name,
      });
      
      inspectionAssetBatch.push({
        inspectionId: inspId,
        assetId: asset.assetId,
      });
      
      allAcmeInspections.push({
        id: inspId,
        assetId: asset.assetId,
        locationId: location.id,
        locationName: location.name,
      });
    }
    
    await db.insert(inspections).values(inspectionBatch);
    await db.insert(inspectionAssets).values(inspectionAssetBatch);
    acmeInspectionsCreated += BATCH_SIZE;
    console.log(`   📋 Inserted batch ${batch + 1}/20 (${acmeInspectionsCreated} inspections)`);
  }
  console.log(`   ✅ Created ${acmeInspectionsCreated} ACME inspections`);
  
  // Create defects for ~40% of ACME inspections (4,000 inspections with 1-3 defects each)
  console.log("🔧 Creating defects for ACME inspections...");
  let acmeDefectsCreated = 0;
  const defectBatchSize = 1000;
  let defectBatch: any[] = [];
  
  for (let i = 0; i < allAcmeInspections.length; i++) {
    // 40% chance of having defects
    if (Math.random() < 0.4) {
      const insp = allAcmeInspections[i];
      const numDefects = Math.floor(Math.random() * 3) + 1; // 1-3 defects
      const assetLoc = acmeAssetLocationMap.get(insp.assetId);
      
      for (let j = 0; j < numDefects; j++) {
        const template = defectTemplates[Math.floor(Math.random() * defectTemplates.length)];
        defectBatch.push({
          inspectionId: insp.id,
          assetId: insp.assetId,
          zoneName: template.zoneName,
          componentName: template.componentName,
          defect: template.defect,
          severity: template.severity,
          driverNotes: template.driverNotes,
          status: template.status,
          repairNotes: template.repairNotes || null,
          locationId: assetLoc?.locationId || null,
          locationName: assetLoc?.locationName || null,
        });
        
        // Insert in batches
        if (defectBatch.length >= defectBatchSize) {
          await db.insert(defects).values(defectBatch);
          acmeDefectsCreated += defectBatch.length;
          console.log(`   🔧 Inserted ${acmeDefectsCreated} defects...`);
          defectBatch = [];
        }
      }
    }
  }
  
  // Insert remaining defects
  if (defectBatch.length > 0) {
    await db.insert(defects).values(defectBatch);
    acmeDefectsCreated += defectBatch.length;
  }
  console.log(`   ✅ Created ${acmeDefectsCreated} ACME defects`);
  
  totalDefects += acmeDefectsCreated;

  // Create test inspection photos for one NEC inspection
  console.log("📸 Creating test inspection photos...");
  
  // Create a minimal but valid test JPEG (red-ish 1x1 pixel)
  // This is a minimal valid JPEG with SOI, APP0, DQT, SOF0, DHT, SOS, and EOI markers
  const minimalJpeg = Buffer.from([
    // SOI (Start of Image)
    0xFF, 0xD8,
    // APP0 JFIF marker
    0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    // DQT (Define Quantization Table)
    0xFF, 0xDB, 0x00, 0x43, 0x00,
    0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14,
    0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12, 0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A,
    0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C,
    0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32,
    // SOF0 (Start of Frame, baseline DCT)
    0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
    // DHT (Define Huffman Table - DC)
    0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B,
    // DHT (Define Huffman Table - AC)
    0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03, 0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04,
    0x04, 0x00, 0x00, 0x01, 0x7D, 0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41,
    0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08, 0x23, 0x42, 0xB1,
    0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19,
    0x1A, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44,
    0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x63, 0x64,
    0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84,
    0x85, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2,
    0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9,
    0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9, 0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7,
    0xD8, 0xD9, 0xDA, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3,
    0xF4, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA,
    // SOS (Start of Scan)
    0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x7F, 0xFF, 0xD9,
  ]);
  
  // Create two test photos with UUIDs
  const testPhotoId1 = randomUUID();
  const testPhotoId2 = randomUUID();
  
  await db.insert(inspectionPhotos).values([
    {
      id: testPhotoId1,
      type: 0, // defect photo
      imageData: minimalJpeg,
      companyId: "NEC",
    },
    {
      id: testPhotoId2,
      type: 0, // defect photo
      imageData: minimalJpeg,
      companyId: "NEC",
    },
  ]);
  
  // Update the first NEC multi-asset inspection to have these photos
  if (necMultiAssetInspections.length > 0) {
    await db.update(inspections)
      .set({ photoIds: [testPhotoId1, testPhotoId2] })
      .where(eq(inspections.id, necMultiAssetInspections[0].id));
    console.log(`✅ Created 2 test photos and linked to inspection ${necMultiAssetInspections[0].id}`);
  }

  console.log("🎉 Seeding completed successfully!");
  console.log("📊 Summary:");
  console.log("   - 4 companies (NEC, WALMART, FEDEX, ACME)");
  console.log(`   - ${7 + acmeUsersData.length} users (507 total)`);
  console.log(`   - ${30 + acmeAssetsData.length} assets (530 total)`);
  console.log(`   - ${necInspections.length + walmartInspections.length + fedexInspections.length + acmeInspectionsCreated} inspections (10,135+ total)`);
  console.log(`   - ${totalDefects} defects across different statuses`);
  console.log("   - 2 test inspection photos (linked to first NEC multi-asset inspection)");
}
