import { db } from "../db";
import { companies, inspections, defects, users, assets, inspectionTypes, inspectionTypeFormFields, inspectionTypeLayouts, inspectionAssets, layouts, layoutZones, layoutZoneComponents, componentDefects, zoneImages, uploadErrors } from "@shared/schema";
import { storage } from "../storage";
import { randomUUID } from "crypto";

export async function runSeed() {
  console.log("🌱 Starting database seed for demo environment...");
  
  // Clear existing data (in reverse order due to foreign keys)
  console.log("🗑️  Clearing existing data...");
  await db.delete(defects);
  await db.delete(inspectionAssets);
  await db.delete(inspections);
  await db.delete(uploadErrors);
  await db.delete(inspectionTypeFormFields);
  await db.delete(inspectionTypeLayouts);
  await db.delete(inspectionTypes);
  await db.delete(assets);
  await db.delete(componentDefects);
  await db.delete(layoutZoneComponents);
  await db.delete(layoutZones);
  await db.delete(zoneImages);
  await db.delete(layouts);
  await db.delete(users);
  await db.delete(companies);
  console.log("✅ Cleared existing data");

  // ========================================
  // 1. CREATE 3 COMPANIES
  // ========================================
  console.log("🏢 Creating 3 companies...");
  await db.insert(companies).values([
    {
      id: "ACME",
      name: "ACME Transportation",
      address: "1234 Industrial Blvd, Houston, TX 77001",
      dotNumber: "1234567",
      settings: JSON.stringify({ timezone: "America/Chicago", locale: "en-US" }),
    },
    {
      id: "SWIFT",
      name: "Swift Logistics",
      address: "5678 Freight Way, Denver, CO 80205",
      dotNumber: "2345678",
      settings: JSON.stringify({ timezone: "America/Denver", locale: "en-US" }),
    },
    {
      id: "ATLAS",
      name: "Atlas Fleet Services",
      address: "9012 Highway Dr, Phoenix, AZ 85001",
      dotNumber: "3456789",
      settings: JSON.stringify({ timezone: "America/Phoenix", locale: "en-US" }),
    },
  ]);
  console.log("✅ Created 3 companies: ACME, SWIFT, ATLAS");

  // ========================================
  // 2. CREATE USERS
  // ========================================
  console.log("👥 Creating users...");
  
  // Superuser (can access all companies)
  await storage.createUser({
    userId: "avazquez",
    password: "casio",
    userFullName: "Antonio Vazquez",
    userTag: "SUPERUSER",
    status: "ACTIVE",
    webAccess: true,
    customerAdminAccess: false,
    companyId: null,
  });
  console.log("   ✅ Superuser: avazquez (password: casio)");
  
  // ACME users
  await storage.createUser({
    userId: "jsmith",
    password: "acme123",
    userFullName: "John Smith",
    userTag: "ADMIN",
    status: "ACTIVE",
    webAccess: true,
    customerAdminAccess: true,
    companyId: "ACME",
  });
  await storage.createUser({
    userId: "mwilliams",
    password: "acme123",
    userFullName: "Mary Williams",
    userTag: "MECHANIC",
    status: "ACTIVE",
    webAccess: true,
    customerAdminAccess: false,
    companyId: "ACME",
  });
  await storage.createUser({
    userId: "rjohnson",
    password: "acme123",
    userFullName: "Robert Johnson",
    userTag: "DRIVER",
    status: "ACTIVE",
    webAccess: false,
    customerAdminAccess: false,
    companyId: "ACME",
  });
  console.log("   ✅ ACME users: jsmith (admin), mwilliams (mechanic), rjohnson (driver)");
  
  // SWIFT users
  await storage.createUser({
    userId: "egarcia",
    password: "swift123",
    userFullName: "Elena Garcia",
    userTag: "ADMIN",
    status: "ACTIVE",
    webAccess: true,
    customerAdminAccess: true,
    companyId: "SWIFT",
  });
  await storage.createUser({
    userId: "dlee",
    password: "swift123",
    userFullName: "David Lee",
    userTag: "MECHANIC",
    status: "ACTIVE",
    webAccess: true,
    customerAdminAccess: false,
    companyId: "SWIFT",
  });
  await storage.createUser({
    userId: "akim",
    password: "swift123",
    userFullName: "Andrew Kim",
    userTag: "DRIVER",
    status: "ACTIVE",
    webAccess: false,
    customerAdminAccess: false,
    companyId: "SWIFT",
  });
  console.log("   ✅ SWIFT users: egarcia (admin), dlee (mechanic), akim (driver)");
  
  // ATLAS users
  await storage.createUser({
    userId: "tbrown",
    password: "atlas123",
    userFullName: "Thomas Brown",
    userTag: "ADMIN",
    status: "ACTIVE",
    webAccess: true,
    customerAdminAccess: true,
    companyId: "ATLAS",
  });
  await storage.createUser({
    userId: "lmartinez",
    password: "atlas123",
    userFullName: "Lisa Martinez",
    userTag: "MECHANIC",
    status: "ACTIVE",
    webAccess: true,
    customerAdminAccess: false,
    companyId: "ATLAS",
  });
  await storage.createUser({
    userId: "cjones",
    password: "atlas123",
    userFullName: "Chris Jones",
    userTag: "DRIVER",
    status: "INACTIVE",
    webAccess: false,
    customerAdminAccess: false,
    companyId: "ATLAS",
  });
  console.log("   ✅ ATLAS users: tbrown (admin), lmartinez (mechanic), cjones (driver-inactive)");
  console.log("✅ Created 10 users (1 superuser + 9 company users)");

  // ========================================
  // 3. CREATE 3 LAYOUTS PER COMPANY (9 total)
  // ========================================
  console.log("📐 Creating 3 layouts per company (9 total)...");
  
  const companyIds = ["ACME", "SWIFT", "ATLAS"];
  const layoutNames = ["SEMI-TRUCK", "DELIVERY-VAN", "TRAILER"];
  
  const layoutsData = [];
  for (const companyId of companyIds) {
    for (const layoutName of layoutNames) {
      layoutsData.push({ layoutName, companyId, isActive: true });
    }
  }
  
  const createdLayouts = await db.insert(layouts).values(layoutsData).returning();
  
  // Create layout mapping: "{companyId}:{layoutName}" → UUID
  const layoutMap = new Map<string, string>();
  for (const layout of createdLayouts) {
    layoutMap.set(`${layout.companyId}:${layout.layoutName}`, layout.id);
  }
  console.log(`✅ Created ${createdLayouts.length} layouts with UUID mapping`);

  // ========================================
  // 4. CREATE LAYOUT STRUCTURES (Zones, Components, Defects)
  // ========================================
  console.log("🔧 Creating layout structures (zones, components, defects)...");
  
  // Layout templates based on DOT vehicle inspection requirements
  const layoutTemplates: Record<string, { zones: Array<{ name: string; tag: string; components: Array<{ name: string; instructions: string; defects: Array<{ name: string; severity: number; instructions: string }> }> }> }> = {
    "SEMI-TRUCK": {
      zones: [
        { name: "Engine Compartment", tag: "ENGINE", components: [
          { name: "Engine Oil", instructions: "Check oil level on dipstick", defects: [
            { name: "Oil level low", severity: 7, instructions: "Add oil to proper level" },
            { name: "Oil leak detected", severity: 9, instructions: "Identify source and repair before operation" },
          ]},
          { name: "Coolant System", instructions: "Check coolant level and hoses", defects: [
            { name: "Low coolant", severity: 6, instructions: "Top off coolant" },
            { name: "Hose leak", severity: 8, instructions: "Replace damaged hose" },
          ]},
          { name: "Belts", instructions: "Inspect all belts for wear and tension", defects: [
            { name: "Belt worn", severity: 5, instructions: "Schedule belt replacement" },
            { name: "Belt frayed", severity: 8, instructions: "Replace belt immediately" },
          ]},
        ]},
        { name: "Cab Interior", tag: "CAB", components: [
          { name: "Gauges and Indicators", instructions: "Verify all dashboard indicators function", defects: [
            { name: "Warning light on", severity: 8, instructions: "Diagnose and resolve issue" },
            { name: "Gauge malfunction", severity: 6, instructions: "Repair or replace gauge" },
          ]},
          { name: "Horn", instructions: "Test horn functionality", defects: [
            { name: "Horn not working", severity: 9, instructions: "Repair horn - safety requirement" },
          ]},
          { name: "Windshield and Wipers", instructions: "Check windshield condition and wiper operation", defects: [
            { name: "Cracked windshield", severity: 7, instructions: "Replace if in driver view" },
            { name: "Wipers streaking", severity: 4, instructions: "Replace wiper blades" },
            { name: "Wipers not working", severity: 9, instructions: "Repair wiper motor" },
          ]},
        ]},
        { name: "Brakes and Tires", tag: "BRAKES", components: [
          { name: "Air Brake System", instructions: "Check air pressure and brake response", defects: [
            { name: "Low air pressure", severity: 10, instructions: "OUT OF SERVICE - repair air system" },
            { name: "Air leak detected", severity: 9, instructions: "Find and repair leak" },
          ]},
          { name: "Tires", instructions: "Inspect tread depth and sidewall condition", defects: [
            { name: "Low tread depth", severity: 8, instructions: "Replace tire if below 4/32 inch" },
            { name: "Sidewall damage", severity: 10, instructions: "Replace tire immediately" },
            { name: "Tire underinflated", severity: 6, instructions: "Inflate to proper PSI" },
          ]},
          { name: "Wheel Seals", instructions: "Check for oil leaks at wheel hubs", defects: [
            { name: "Wheel seal leaking", severity: 8, instructions: "Replace wheel seal" },
          ]},
        ]},
        { name: "Lights and Reflectors", tag: "LIGHTS", components: [
          { name: "Headlights", instructions: "Test high and low beams", defects: [
            { name: "Headlight out", severity: 9, instructions: "Replace bulb before night operation" },
            { name: "Headlight dim", severity: 5, instructions: "Clean or replace lens" },
          ]},
          { name: "Brake Lights", instructions: "Verify all brake lights illuminate", defects: [
            { name: "Brake light out", severity: 10, instructions: "Replace immediately - safety critical" },
          ]},
          { name: "Turn Signals", instructions: "Test left and right turn signals", defects: [
            { name: "Turn signal out", severity: 8, instructions: "Replace bulb or fuse" },
            { name: "Turn signal flashing fast", severity: 5, instructions: "Replace failing bulb" },
          ]},
          { name: "Reflectors", instructions: "Ensure all reflectors are present and clean", defects: [
            { name: "Missing reflector", severity: 6, instructions: "Replace reflector" },
          ]},
        ]},
      ]
    },
    "DELIVERY-VAN": {
      zones: [
        { name: "Pre-Trip Cabin", tag: "CABIN", components: [
          { name: "Seat Belts", instructions: "Test all seat belts for proper operation", defects: [
            { name: "Seat belt frayed", severity: 8, instructions: "Replace seat belt" },
            { name: "Buckle not latching", severity: 9, instructions: "Repair or replace buckle" },
          ]},
          { name: "Mirrors", instructions: "Check all mirrors for visibility", defects: [
            { name: "Mirror cracked", severity: 6, instructions: "Replace mirror" },
            { name: "Mirror loose", severity: 5, instructions: "Tighten mounting hardware" },
          ]},
          { name: "Horn", instructions: "Test horn functionality", defects: [
            { name: "Horn weak", severity: 5, instructions: "Check wiring and replace if needed" },
            { name: "Horn not working", severity: 8, instructions: "Repair horn circuit" },
          ]},
        ]},
        { name: "Engine and Fluids", tag: "ENGINE", components: [
          { name: "Oil Level", instructions: "Check engine oil level", defects: [
            { name: "Oil low", severity: 6, instructions: "Add engine oil" },
            { name: "Oil dirty", severity: 4, instructions: "Schedule oil change" },
          ]},
          { name: "Brake Fluid", instructions: "Check brake fluid reservoir", defects: [
            { name: "Brake fluid low", severity: 8, instructions: "Add fluid and check for leaks" },
          ]},
          { name: "Washer Fluid", instructions: "Verify washer fluid level", defects: [
            { name: "Washer fluid empty", severity: 2, instructions: "Refill washer reservoir" },
          ]},
        ]},
        { name: "Exterior and Cargo", tag: "EXTERIOR", components: [
          { name: "Cargo Door", instructions: "Test cargo door operation and locks", defects: [
            { name: "Door won't latch", severity: 7, instructions: "Adjust or repair latch mechanism" },
            { name: "Door seal damaged", severity: 4, instructions: "Replace door seal" },
          ]},
          { name: "Tires", instructions: "Check all four tires", defects: [
            { name: "Tire worn", severity: 7, instructions: "Replace tire" },
            { name: "Tire flat", severity: 10, instructions: "Replace or repair immediately" },
          ]},
          { name: "Lights", instructions: "Test all exterior lights", defects: [
            { name: "Tail light out", severity: 8, instructions: "Replace bulb" },
            { name: "Backup light out", severity: 6, instructions: "Replace bulb" },
          ]},
        ]},
      ]
    },
    "TRAILER": {
      zones: [
        { name: "Coupling System", tag: "COUPLING", components: [
          { name: "Fifth Wheel", instructions: "Verify fifth wheel connection and lock", defects: [
            { name: "Fifth wheel not locked", severity: 10, instructions: "OUT OF SERVICE - secure kingpin" },
            { name: "Kingpin worn", severity: 9, instructions: "Replace kingpin" },
          ]},
          { name: "Glad Hands", instructions: "Check air and electrical connections", defects: [
            { name: "Air leak at glad hands", severity: 9, instructions: "Replace seals or connections" },
            { name: "Electrical connection loose", severity: 7, instructions: "Secure connection" },
          ]},
          { name: "Safety Chains", instructions: "Verify chains are properly attached", defects: [
            { name: "Safety chain not attached", severity: 10, instructions: "Attach chains before departure" },
            { name: "Chain links damaged", severity: 8, instructions: "Replace safety chains" },
          ]},
        ]},
        { name: "Trailer Body", tag: "BODY", components: [
          { name: "Rear Doors", instructions: "Test door operation and seals", defects: [
            { name: "Door hinge damaged", severity: 6, instructions: "Repair or replace hinge" },
            { name: "Door seal missing", severity: 4, instructions: "Install new door seal" },
            { name: "Door latch broken", severity: 8, instructions: "Repair latch mechanism" },
          ]},
          { name: "Floor Condition", instructions: "Inspect floor for damage or rot", defects: [
            { name: "Floor boards damaged", severity: 7, instructions: "Replace damaged sections" },
            { name: "Floor soft spots", severity: 8, instructions: "Evaluate structural integrity" },
          ]},
          { name: "Sidewalls", instructions: "Check sidewalls for damage", defects: [
            { name: "Sidewall puncture", severity: 6, instructions: "Repair or patch sidewall" },
            { name: "Rivets missing", severity: 4, instructions: "Replace missing rivets" },
          ]},
        ]},
        { name: "Trailer Running Gear", tag: "RUNNING", components: [
          { name: "Trailer Brakes", instructions: "Check brake adjustment and condition", defects: [
            { name: "Brakes out of adjustment", severity: 9, instructions: "Adjust brakes per specification" },
            { name: "Brake drum cracked", severity: 10, instructions: "OUT OF SERVICE - replace drum" },
          ]},
          { name: "Trailer Tires", instructions: "Inspect all trailer tires", defects: [
            { name: "Trailer tire worn", severity: 8, instructions: "Replace tire" },
            { name: "Tire separation", severity: 10, instructions: "Replace immediately" },
          ]},
          { name: "Trailer Lights", instructions: "Test all trailer lights", defects: [
            { name: "Marker light out", severity: 6, instructions: "Replace bulb" },
            { name: "All trailer lights out", severity: 10, instructions: "Check electrical connection" },
          ]},
          { name: "Landing Gear", instructions: "Test landing gear operation", defects: [
            { name: "Landing gear won't crank", severity: 7, instructions: "Lubricate or repair mechanism" },
            { name: "Landing gear bent", severity: 8, instructions: "Replace landing gear leg" },
          ]},
        ]},
      ]
    },
  };

  // Helper function to instantiate a layout template
  const instantiateLayout = async (template: typeof layoutTemplates["SEMI-TRUCK"], layoutUuid: string) => {
    for (const zoneTemplate of template.zones) {
      const [zone] = await db.insert(layoutZones).values({
        zoneName: zoneTemplate.name,
        zoneTag: zoneTemplate.tag,
        layoutId: layoutUuid,
      }).returning();
      
      for (const compTemplate of zoneTemplate.components) {
        const [component] = await db.insert(layoutZoneComponents).values({
          componentName: compTemplate.name,
          componentInspectionInstructions: compTemplate.instructions,
          zoneId: zone.id,
        }).returning();
        
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

  // Apply templates to all companies' layouts
  for (const company of companyIds) {
    for (const layoutName of layoutNames) {
      const layoutUuid = layoutMap.get(`${company}:${layoutName}`);
      if (layoutUuid && layoutTemplates[layoutName]) {
        await instantiateLayout(layoutTemplates[layoutName], layoutUuid);
        console.log(`   ✅ Created ${layoutName} structure for ${company}`);
      }
    }
  }
  console.log("✅ Created layout structures for 9 layouts (3 companies × 3 layout types)");

  // ========================================
  // 5. CREATE INSPECTION TYPES
  // ========================================
  console.log("📋 Creating inspection types...");
  
  const inspectionTypesData = [
    // ACME inspection types
    { inspectionTypeName: "Pre-Trip Inspection", status: "ACTIVE" as const, companyId: "ACME", layoutKeys: [] },
    { inspectionTypeName: "Post-Trip Inspection", status: "ACTIVE" as const, companyId: "ACME", layoutKeys: [] },
    { inspectionTypeName: "DOT Annual Inspection", status: "ACTIVE" as const, companyId: "ACME", layoutKeys: ["SEMI-TRUCK", "TRAILER"] },
    // SWIFT inspection types
    { inspectionTypeName: "Pre-Trip Inspection", status: "ACTIVE" as const, companyId: "SWIFT", layoutKeys: [] },
    { inspectionTypeName: "Post-Trip Inspection", status: "ACTIVE" as const, companyId: "SWIFT", layoutKeys: [] },
    { inspectionTypeName: "Weekly Safety Check", status: "ACTIVE" as const, companyId: "SWIFT", layoutKeys: ["DELIVERY-VAN"] },
    // ATLAS inspection types
    { inspectionTypeName: "Pre-Trip Inspection", status: "ACTIVE" as const, companyId: "ATLAS", layoutKeys: [] },
    { inspectionTypeName: "Post-Trip Inspection", status: "ACTIVE" as const, companyId: "ATLAS", layoutKeys: [] },
    { inspectionTypeName: "Maintenance Check", status: "INACTIVE" as const, companyId: "ATLAS", layoutKeys: [] },
  ];
  
  const createdInspectionTypes = await db.insert(inspectionTypes).values(
    inspectionTypesData.map(({ layoutKeys, ...rest }) => rest)
  ).returning();
  
  // Create inspection type ID map
  const inspectionTypeIdMap = new Map<string, string>();
  for (const it of createdInspectionTypes) {
    inspectionTypeIdMap.set(`${it.companyId}:${it.inspectionTypeName}`, it.id);
  }
  
  // Create inspection type to layout mappings
  const inspectionTypeLayoutMappings: Array<{ inspectionTypeId: string; layoutId: string }> = [];
  for (const itData of inspectionTypesData) {
    const createdIT = createdInspectionTypes.find(
      it => it.companyId === itData.companyId && it.inspectionTypeName === itData.inspectionTypeName
    );
    
    if (createdIT && itData.layoutKeys.length > 0) {
      for (const layoutKey of itData.layoutKeys) {
        const layoutId = layoutMap.get(`${itData.companyId}:${layoutKey}`);
        if (layoutId) {
          inspectionTypeLayoutMappings.push({ inspectionTypeId: createdIT.id, layoutId });
        }
      }
    }
  }
  
  if (inspectionTypeLayoutMappings.length > 0) {
    await db.insert(inspectionTypeLayouts).values(inspectionTypeLayoutMappings);
  }
  
  // Create form fields for inspection types
  const formFieldsData = [
    { formFieldName: "odometer", formFieldType: "NUM" as const, formFieldLength: 10, companyId: "ACME", businessInspectionTypeId: "Pre-Trip Inspection" },
    { formFieldName: "fuel-level", formFieldType: "NUM" as const, formFieldLength: 3, companyId: "ACME", businessInspectionTypeId: "Pre-Trip Inspection" },
    { formFieldName: "ending-odometer", formFieldType: "NUM" as const, formFieldLength: 10, companyId: "ACME", businessInspectionTypeId: "Post-Trip Inspection" },
    { formFieldName: "odometer", formFieldType: "NUM" as const, formFieldLength: 10, companyId: "SWIFT", businessInspectionTypeId: "Pre-Trip Inspection" },
    { formFieldName: "route-number", formFieldType: "TEXT" as const, formFieldLength: 20, companyId: "SWIFT", businessInspectionTypeId: "Pre-Trip Inspection" },
    { formFieldName: "odometer", formFieldType: "NUM" as const, formFieldLength: 10, companyId: "ATLAS", businessInspectionTypeId: "Pre-Trip Inspection" },
  ];
  
  const formFields = formFieldsData.map(ff => ({
    formFieldName: ff.formFieldName,
    formFieldType: ff.formFieldType,
    formFieldLength: ff.formFieldLength,
    inspectionTypeId: inspectionTypeIdMap.get(`${ff.companyId}:${ff.businessInspectionTypeId}`)!,
  })).filter(ff => ff.inspectionTypeId);
  
  if (formFields.length > 0) {
    await db.insert(inspectionTypeFormFields).values(formFields);
  }
  
  console.log(`✅ Created ${createdInspectionTypes.length} inspection types with form fields`);

  // ========================================
  // 6. CREATE ASSETS
  // ========================================
  console.log("📦 Creating assets...");
  
  const assetsData = [
    // ACME assets
    { assetId: "TRUCK-101", layoutKey: "SEMI-TRUCK", assetName: "Freightliner Cascadia 101", licensePlate: "TX-ABC1234", status: "ACTIVE" as const, companyId: "ACME" },
    { assetId: "TRUCK-102", layoutKey: "SEMI-TRUCK", assetName: "Peterbilt 579 102", licensePlate: "TX-DEF5678", status: "ACTIVE" as const, companyId: "ACME" },
    { assetId: "VAN-201", layoutKey: "DELIVERY-VAN", assetName: "Ford Transit 201", licensePlate: "TX-GHI9012", status: "ACTIVE" as const, companyId: "ACME" },
    { assetId: "VAN-202", layoutKey: "DELIVERY-VAN", assetName: "Mercedes Sprinter 202", licensePlate: "TX-JKL3456", status: "INACTIVE" as const, companyId: "ACME" },
    { assetId: "TRL-301", layoutKey: "TRAILER", assetName: "Great Dane Trailer 301", licensePlate: "TX-MNO7890", status: "ACTIVE" as const, companyId: "ACME" },
    { assetId: "TRL-302", layoutKey: "TRAILER", assetName: "Utility Trailer 302", licensePlate: "TX-PQR1234", status: "ACTIVE" as const, companyId: "ACME" },
    // SWIFT assets
    { assetId: "TRUCK-501", layoutKey: "SEMI-TRUCK", assetName: "Kenworth T680 501", licensePlate: "CO-AAA1111", status: "ACTIVE" as const, companyId: "SWIFT" },
    { assetId: "TRUCK-502", layoutKey: "SEMI-TRUCK", assetName: "Volvo VNL 502", licensePlate: "CO-BBB2222", status: "ACTIVE" as const, companyId: "SWIFT" },
    { assetId: "VAN-601", layoutKey: "DELIVERY-VAN", assetName: "RAM ProMaster 601", licensePlate: "CO-CCC3333", status: "ACTIVE" as const, companyId: "SWIFT" },
    { assetId: "VAN-602", layoutKey: "DELIVERY-VAN", assetName: "Chevrolet Express 602", licensePlate: "CO-DDD4444", status: "ACTIVE" as const, companyId: "SWIFT" },
    { assetId: "TRL-701", layoutKey: "TRAILER", assetName: "Wabash Trailer 701", licensePlate: "CO-EEE5555", status: "ACTIVE" as const, companyId: "SWIFT" },
    { assetId: "TRL-702", layoutKey: "TRAILER", assetName: "Hyundai Trailer 702", licensePlate: "CO-FFF6666", status: "INACTIVE" as const, companyId: "SWIFT" },
    // ATLAS assets
    { assetId: "TRUCK-801", layoutKey: "SEMI-TRUCK", assetName: "Mack Anthem 801", licensePlate: "AZ-XXX1111", status: "ACTIVE" as const, companyId: "ATLAS" },
    { assetId: "TRUCK-802", layoutKey: "SEMI-TRUCK", assetName: "International LT 802", licensePlate: "AZ-YYY2222", status: "ACTIVE" as const, companyId: "ATLAS" },
    { assetId: "VAN-901", layoutKey: "DELIVERY-VAN", assetName: "Nissan NV 901", licensePlate: "AZ-ZZZ3333", status: "ACTIVE" as const, companyId: "ATLAS" },
    { assetId: "TRL-1001", layoutKey: "TRAILER", assetName: "Stoughton Trailer 1001", licensePlate: "AZ-AAA4444", status: "ACTIVE" as const, companyId: "ATLAS" },
    { assetId: "TRL-1002", layoutKey: "TRAILER", assetName: "Vanguard Trailer 1002", licensePlate: "AZ-BBB5555", status: "ACTIVE" as const, companyId: "ATLAS" },
  ];
  
  const mappedAssets = assetsData.map(asset => {
    const layoutId = layoutMap.get(`${asset.companyId}:${asset.layoutKey}`);
    if (!layoutId) throw new Error(`Layout not found: ${asset.companyId}:${asset.layoutKey}`);
    return {
      assetId: asset.assetId,
      layout: layoutId,
      assetName: asset.assetName,
      licensePlate: asset.licensePlate,
      status: asset.status,
      companyId: asset.companyId,
    };
  });
  
  await db.insert(assets).values(mappedAssets);
  console.log(`✅ Created ${mappedAssets.length} assets`);

  // ========================================
  // 7. CREATE INSPECTIONS
  // ========================================
  console.log("📋 Creating inspections...");
  
  const drivers: Record<string, Array<{ name: string; id: string }>> = {
    ACME: [
      { name: "Robert Johnson", id: "DRV-A001" },
      { name: "Michael Davis", id: "DRV-A002" },
      { name: "James Wilson", id: "DRV-A003" },
    ],
    SWIFT: [
      { name: "Andrew Kim", id: "DRV-S001" },
      { name: "Steven Chen", id: "DRV-S002" },
      { name: "Daniel Park", id: "DRV-S003" },
    ],
    ATLAS: [
      { name: "Chris Jones", id: "DRV-T001" },
      { name: "Brian Taylor", id: "DRV-T002" },
      { name: "Kevin Moore", id: "DRV-T003" },
    ],
  };
  
  const assetsByCompany: Record<string, string[]> = {
    ACME: ["TRUCK-101", "TRUCK-102", "VAN-201", "TRL-301", "TRL-302"],
    SWIFT: ["TRUCK-501", "TRUCK-502", "VAN-601", "VAN-602", "TRL-701"],
    ATLAS: ["TRUCK-801", "TRUCK-802", "VAN-901", "TRL-1001", "TRL-1002"],
  };
  
  const inspectionTypesByCompany: Record<string, string[]> = {
    ACME: ["Pre-Trip Inspection", "Post-Trip Inspection", "DOT Annual Inspection"],
    SWIFT: ["Pre-Trip Inspection", "Post-Trip Inspection", "Weekly Safety Check"],
    ATLAS: ["Pre-Trip Inspection", "Post-Trip Inspection"],
  };
  
  const allInspections: Array<{
    id: string;
    companyId: string;
    datetime: Date;
    inspectionType: string;
    driverName: string;
    driverId: string;
    inspectionFormData: string;
  }> = [];
  
  // Generate 30 inspections per company (90 total)
  for (const company of companyIds) {
    const companyDrivers = drivers[company];
    const companyAssets = assetsByCompany[company];
    const companyTypes = inspectionTypesByCompany[company];
    
    for (let i = 0; i < 30; i++) {
      const day = Math.floor(i / 2) + 1;
      const hour = 6 + (i % 12);
      const minute = (i * 17) % 60;
      const driver = companyDrivers[i % companyDrivers.length];
      
      allInspections.push({
        id: randomUUID(),
        companyId: company,
        datetime: new Date(`2025-12-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`),
        inspectionType: companyTypes[i % companyTypes.length],
        driverName: driver.name,
        driverId: driver.id,
        inspectionFormData: JSON.stringify({ odometer: 50000 + (i * 100), notes: `Inspection #${i + 1}` }),
      });
    }
  }
  
  const createdInspections = await db.insert(inspections).values(allInspections).returning();
  
  // Create inspection_assets associations
  const inspectionAssetsData = createdInspections.map((insp, i) => {
    const companyAssets = assetsByCompany[insp.companyId];
    return {
      inspectionId: insp.id,
      assetId: companyAssets[i % companyAssets.length],
    };
  });
  
  await db.insert(inspectionAssets).values(inspectionAssetsData);
  console.log(`✅ Created ${createdInspections.length} inspections with asset associations`);

  // ========================================
  // 8. CREATE DEFECTS
  // ========================================
  console.log("🔧 Creating defects...");
  
  const defectTemplates = [
    // Critical (8-10)
    { zoneName: "Brakes and Tires", componentName: "Air Brake System", defect: "Low air pressure warning", severity: 10, status: "open" as const, driverNotes: "Pressure below 60 PSI on startup" },
    { zoneName: "Brakes and Tires", componentName: "Tires", defect: "Sidewall damage on front right tire", severity: 10, status: "pending" as const, driverNotes: "Visible cord showing", repairNotes: "New tire ordered" },
    { zoneName: "Coupling System", componentName: "Fifth Wheel", defect: "Fifth wheel not locking properly", severity: 10, status: "repaired" as const, driverNotes: "Had to re-couple twice", repairNotes: "Adjusted jaw mechanism", mechanicName: "Mary Williams" },
    { zoneName: "Lights and Reflectors", componentName: "Brake Lights", defect: "Both brake lights not functioning", severity: 10, status: "open" as const, driverNotes: "Noticed during pre-trip" },
    
    // High (7-8)
    { zoneName: "Engine Compartment", componentName: "Engine Oil", defect: "Oil leak detected at valve cover", severity: 8, status: "pending" as const, driverNotes: "Oil spots under truck after parking", repairNotes: "Scheduled for shop visit" },
    { zoneName: "Engine Compartment", componentName: "Coolant System", defect: "Coolant hose showing cracks", severity: 8, status: "open" as const, driverNotes: "Visible wear on upper radiator hose" },
    { zoneName: "Cab Interior", componentName: "Windshield and Wipers", defect: "Cracked windshield in driver view", severity: 7, status: "pending" as const, driverNotes: "Rock chip has spread", repairNotes: "Replacement scheduled" },
    { zoneName: "Trailer Running Gear", componentName: "Trailer Brakes", defect: "Brakes out of adjustment on axle 2", severity: 9, status: "repaired" as const, driverNotes: "Pulling to left when braking", repairNotes: "Adjusted per spec", mechanicName: "David Lee" },
    
    // Medium (4-6)
    { zoneName: "Cab Interior", componentName: "Gauges and Indicators", defect: "Fuel gauge reading inaccurately", severity: 6, status: "open" as const, driverNotes: "Shows empty when tank is half full" },
    { zoneName: "Pre-Trip Cabin", componentName: "Mirrors", defect: "Passenger mirror loose", severity: 5, status: "repaired" as const, driverNotes: "Vibrates at highway speed", repairNotes: "Tightened mounting bolts", mechanicName: "Lisa Martinez" },
    { zoneName: "Trailer Body", componentName: "Rear Doors", defect: "Door seal damaged on right door", severity: 4, status: "open" as const, driverNotes: "Rain getting into cargo area" },
    { zoneName: "Exterior and Cargo", componentName: "Cargo Door", defect: "Cargo door hinge squeaking", severity: 4, status: "not-needed" as const, driverNotes: "Makes noise when opening", repairNotes: "Lubricated per driver request" },
    
    // Low (1-3)
    { zoneName: "Engine and Fluids", componentName: "Washer Fluid", defect: "Washer fluid low", severity: 2, status: "repaired" as const, driverNotes: "Streaking on windshield", repairNotes: "Filled reservoir", mechanicName: "Mary Williams" },
    { zoneName: "Lights and Reflectors", componentName: "Reflectors", defect: "Reflector dirty on rear right", severity: 3, status: "open" as const, driverNotes: "Needs cleaning" },
  ];
  
  const allDefects: Array<{
    inspectionId: string;
    assetId: string;
    zoneName: string;
    componentName: string;
    defect: string;
    severity: number;
    status: "open" | "pending" | "repaired" | "not-needed";
    driverNotes?: string;
    repairNotes?: string | null;
    mechanicName?: string | null;
    repairDate?: Date | null;
  }> = [];
  
  // Add defects to ~60% of inspections
  for (let i = 0; i < createdInspections.length; i++) {
    if (Math.random() < 0.6) {
      const numDefects = Math.floor(Math.random() * 3) + 1; // 1-3 defects
      const usedTemplates = new Set<number>();
      
      for (let j = 0; j < numDefects; j++) {
        let templateIdx: number;
        do {
          templateIdx = Math.floor(Math.random() * defectTemplates.length);
        } while (usedTemplates.has(templateIdx) && usedTemplates.size < defectTemplates.length);
        usedTemplates.add(templateIdx);
        
        const template = defectTemplates[templateIdx];
        const inspection = createdInspections[i];
        const companyAssets = assetsByCompany[inspection.companyId];
        
        allDefects.push({
          inspectionId: inspection.id,
          assetId: companyAssets[i % companyAssets.length],
          zoneName: template.zoneName,
          componentName: template.componentName,
          defect: template.defect,
          severity: template.severity,
          status: template.status,
          driverNotes: template.driverNotes,
          repairNotes: template.repairNotes || null,
          mechanicName: template.mechanicName || null,
          repairDate: template.status === "repaired" ? new Date() : null,
        });
      }
    }
  }
  
  // Also add some severity=0 entries (no defect found - audit trail)
  for (let i = 0; i < 20; i++) {
    const inspection = createdInspections[Math.floor(Math.random() * createdInspections.length)];
    const companyAssets = assetsByCompany[inspection.companyId];
    
    allDefects.push({
      inspectionId: inspection.id,
      assetId: companyAssets[0],
      zoneName: "Engine Compartment",
      componentName: "Engine Oil",
      defect: "No defect found",
      severity: 0,
      status: "not-needed" as const,
      driverNotes: "Checked - OK",
    });
  }
  
  if (allDefects.length > 0) {
    await db.insert(defects).values(allDefects);
  }
  
  console.log(`✅ Created ${allDefects.length} defects (including ${allDefects.filter(d => d.severity === 0).length} audit entries)`);

  // ========================================
  // SUMMARY
  // ========================================
  console.log("\n🎉 Seeding completed successfully!");
  console.log("📊 Summary:");
  console.log("   - 3 companies: ACME, SWIFT, ATLAS");
  console.log("   - 3 layouts per company: SEMI-TRUCK, DELIVERY-VAN, TRAILER");
  console.log("   - 10 users (1 superuser + 9 company users)");
  console.log(`   - ${mappedAssets.length} assets`);
  console.log(`   - ${createdInspectionTypes.length} inspection types`);
  console.log(`   - ${createdInspections.length} inspections`);
  console.log(`   - ${allDefects.length} defects`);
  console.log("\n🔑 Login credentials:");
  console.log("   Superuser: avazquez / casio (access all companies)");
  console.log("   ACME Admin: jsmith / acme123");
  console.log("   SWIFT Admin: egarcia / swift123");
  console.log("   ATLAS Admin: tbrown / atlas123");
}
