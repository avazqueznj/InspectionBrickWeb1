import { db } from "./db";
import { companies, inspections, defects, users, assets, inspectionTypes, inspectionTypeFormFields, inspectionTypeLayouts, inspectionAssets, layouts, layoutZones, layoutZoneComponents, componentDefects } from "@shared/schema";
import { storage } from "./storage";

async function seed() {
  console.log("🌱 Seeding database with plain text passwords (pilot configuration)...");

  try {
    // Clear existing data (in reverse order due to foreign keys)
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
    const companiesToPopulate = ["NEC", "WALMART", "FEDEX"];
    
    for (const company of companiesToPopulate) {
      for (const layoutType of layoutsToPopulate) {
        const layoutUuid = layoutMap.get(`${company}:${layoutType}`);
        if (layoutUuid && layoutTemplates[layoutType as keyof typeof layoutTemplates]) {
          await instantiateLayout(layoutTemplates[layoutType as keyof typeof layoutTemplates], layoutUuid);
          console.log(`   ✅ Created ${layoutType} structure for ${company}`);
        }
      }
    }
    
    console.log("✅ Created layout structures for 9 vehicle layouts (3 companies × 3 layout types)");

    // Create assets for all companies
    console.log("📦 Creating assets...");
    
    // Helper function to map asset data to include layout UUID
    const mapAssetToLayout = (asset: {assetId: string, layoutKey: string, assetName: string, status: "ACTIVE" | "INACTIVE", companyId: string}) => {
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
      };
    };
    
    // NEC Assets - matching the inspection data
    const necAssetData = [
      { assetId: "TRUCK-2401", layoutKey: "TRUCK", assetName: "Freightliner 2401", status: "ACTIVE" as const, companyId: "NEC" },
      { assetId: "TRUCK-2402", layoutKey: "TRUCK", assetName: "Peterbilt 2402", status: "ACTIVE" as const, companyId: "NEC" },
      { assetId: "TRUCK-2403", layoutKey: "TRUCK", assetName: "Kenworth 2403", status: "ACTIVE" as const, companyId: "NEC" },
      { assetId: "VAN-1501", layoutKey: "VAN", assetName: "Ford Transit 1501", status: "ACTIVE" as const, companyId: "NEC" },
      { assetId: "VAN-1502", layoutKey: "VAN", assetName: "Mercedes Sprinter 1502", status: "ACTIVE" as const, companyId: "NEC" },
      { assetId: "FORKLIFT-089", layoutKey: "FORKLIFT", assetName: "Toyota 089", status: "ACTIVE" as const, companyId: "NEC" },
      { assetId: "FORKLIFT-090", layoutKey: "FORKLIFT", assetName: "Caterpillar 090", status: "ACTIVE" as const, companyId: "NEC" },
      { assetId: "CRANE-12", layoutKey: "CRANE", assetName: "Mobile Crane 12", status: "ACTIVE" as const, companyId: "NEC" },
      { assetId: "CRANE-13", layoutKey: "CRANE", assetName: "Tower Crane 13", status: "INACTIVE" as const, companyId: "NEC" },
      { assetId: "PALLET-JACK-05", layoutKey: "PALLET-JACK", assetName: "Electric Jack 05", status: "ACTIVE" as const, companyId: "NEC" },
    ];
    
    // WALMART Assets
    const walmartAssetData = [
      { assetId: "VAN-1145", layoutKey: "VAN", assetName: "Delivery Van 1145", status: "ACTIVE" as const, companyId: "WALMART" },
      { assetId: "VAN-1146", layoutKey: "VAN", assetName: "Delivery Van 1146", status: "ACTIVE" as const, companyId: "WALMART" },
      { assetId: "TRUCK-5001", layoutKey: "TRUCK", assetName: "Semi Truck 5001", status: "ACTIVE" as const, companyId: "WALMART" },
      { assetId: "TRUCK-5002", layoutKey: "TRUCK", assetName: "Semi Truck 5002", status: "ACTIVE" as const, companyId: "WALMART" },
      { assetId: "EXCAVATOR-45", layoutKey: "EXCAVATOR", assetName: "Excavator 45", status: "INACTIVE" as const, companyId: "WALMART" },
      { assetId: "LOADER-22", layoutKey: "LOADER", assetName: "Front Loader 22", status: "ACTIVE" as const, companyId: "WALMART" },
      { assetId: "FORKLIFT-W01", layoutKey: "FORKLIFT", assetName: "Warehouse Forklift W01", status: "ACTIVE" as const, companyId: "WALMART" },
      { assetId: "FORKLIFT-W02", layoutKey: "FORKLIFT", assetName: "Warehouse Forklift W02", status: "ACTIVE" as const, companyId: "WALMART" },
      { assetId: "CONVEYOR-W3", layoutKey: "CONVEYOR", assetName: "Belt Conveyor W3", status: "ACTIVE" as const, companyId: "WALMART" },
      { assetId: "PALLET-JACK-W10", layoutKey: "PALLET-JACK", assetName: "Manual Jack W10", status: "ACTIVE" as const, companyId: "WALMART" },
    ];
    
    // FEDEX Assets
    const fedexAssetData = [
      { assetId: "CONVEYOR-C3", layoutKey: "CONVEYOR", assetName: "Sortation Belt C3", status: "ACTIVE" as const, companyId: "FEDEX" },
      { assetId: "SORTATION-UNIT-4", layoutKey: "SORTATION-UNIT", assetName: "Auto Sort Unit 4", status: "ACTIVE" as const, companyId: "FEDEX" },
      { assetId: "VAN-8803", layoutKey: "VAN", assetName: "Delivery Van 8803", status: "ACTIVE" as const, companyId: "FEDEX" },
      { assetId: "TRUCK-5503", layoutKey: "TRUCK", assetName: "Box Truck 5503", status: "ACTIVE" as const, companyId: "FEDEX" },
      { assetId: "FORKLIFT-F10", layoutKey: "FORKLIFT", assetName: "Hyster F10", status: "ACTIVE" as const, companyId: "FEDEX" },
      { assetId: "LOADER-F22", layoutKey: "LOADER", assetName: "Front Loader F22", status: "ACTIVE" as const, companyId: "FEDEX" },
      { assetId: "PALLET-JACK-F05", layoutKey: "PALLET-JACK", assetName: "Electric Jack F05", status: "ACTIVE" as const, companyId: "FEDEX" },
      { assetId: "TRUCK-5504", layoutKey: "TRUCK", assetName: "Box Truck 5504", status: "INACTIVE" as const, companyId: "FEDEX" },
      { assetId: "VAN-8804", layoutKey: "VAN", assetName: "Delivery Van 8804", status: "ACTIVE" as const, companyId: "FEDEX" },
      { assetId: "CRANE-F1", layoutKey: "CRANE", assetName: "Gantry Crane F1", status: "ACTIVE" as const, companyId: "FEDEX" },
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
    
    // Generate 45 NEC inspections across October 2025
    const necInspectionData = [];
    for (let i = 0; i < 45; i++) {
      const day = (i % 22) + 1; // Days 1-22
      const hour = 7 + (i % 10); // Hours 7-16
      const minute = (i * 15) % 60;
      
      necInspectionData.push({
        companyId: "NEC",
        datetime: new Date(`2025-10-${day.toString().padStart(2, '0')}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`),
        inspectionType: inspectionTypeNames[i % inspectionTypeNames.length],
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
        inspectionType: inspectionTypeNames[i % inspectionTypeNames.length],
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
        inspectionType: inspectionTypeNames[i % inspectionTypeNames.length],
        driverName: fedexDrivers[i % fedexDrivers.length].name,
        driverId: fedexDrivers[i % fedexDrivers.length].id,
        inspectionFormData: `Inspection #${i + 1} - Operations check complete.`,
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
        companyId: "NEC",
        datetime: new Date('2025-11-01T08:00:00'),
        inspectionType: "pre-trip",
        driverName: "John Smith",
        driverId: "DRV-12345",
        inspectionFormData: "Multi-asset inspection: Tractor + Dolly + Trailer",
      },
      {
        companyId: "NEC",
        datetime: new Date('2025-11-05T14:30:00'),
        inspectionType: "post-trip",
        driverName: "Sarah Johnson",
        driverId: "DRV-54321",
        inspectionFormData: "Multi-asset inspection: Tractor + Trailer",
      },
    ]).returning();
    
    // WALMART Multi-Asset Inspections
    const walmartMultiAssetInspections = await db.insert(inspections).values([
      {
        companyId: "WALMART",
        datetime: new Date('2025-11-02T09:15:00'),
        inspectionType: "delivery-pre-trip",
        driverName: "Michael Brown",
        driverId: "DRV-10892",
        inspectionFormData: "Multi-asset inspection: Truck + Trailer combo",
      },
      {
        companyId: "WALMART",
        datetime: new Date('2025-11-06T07:45:00'),
        inspectionType: "delivery-pre-trip",
        driverName: "Emily Davis",
        driverId: "DRV-10123",
        inspectionFormData: "Multi-asset inspection: Van with attached equipment",
      },
    ]).returning();
    
    // FEDEX Multi-Asset Inspections
    const fedexMultiAssetInspections = await db.insert(inspections).values([
      {
        companyId: "FEDEX",
        datetime: new Date('2025-11-03T06:30:00'),
        inspectionType: "van-pre-route",
        driverName: "James Wilson",
        driverId: "DRV-20445",
        inspectionFormData: "Multi-asset inspection: Van + Dolly + Trailer",
      },
      {
        companyId: "FEDEX",
        datetime: new Date('2025-11-07T13:00:00'),
        inspectionType: "van-pre-route",
        driverName: "Maria Garcia",
        driverId: "DRV-20567",
        inspectionFormData: "Multi-asset inspection: Truck + Trailer",
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
    
    // Create defects for multi-asset inspections with specific assetId values
    console.log("🔧 Creating defects for multi-asset inspections...");
    
    const multiAssetDefects = [
      // NEC Inspection 1: Tractor + Dolly + Trailer
      { inspectionId: necMultiAssetInspections[0].id, assetId: "127", zoneName: "Brakes", componentName: "Front Brake Pads", defect: "Worn brake pads", severity: 85, status: "open" as const, driverNotes: "Tractor brakes need attention" },
      { inspectionId: necMultiAssetInspections[0].id, assetId: "DOLLY-5", zoneName: "Tires", componentName: "Left Tire", defect: "Low tire pressure", severity: 45, status: "open" as const, driverNotes: "Dolly tire needs inflation" },
      { inspectionId: necMultiAssetInspections[0].id, assetId: "TRAILER-101", zoneName: "Lights", componentName: "Brake Lights", defect: "Broken brake light", severity: 75, status: "pending" as const, driverNotes: "Trailer light not working" },
      
      // NEC Inspection 2: Tractor + Trailer
      { inspectionId: necMultiAssetInspections[1].id, assetId: "127", zoneName: "Engine", componentName: "Oil Level", defect: "Oil level low", severity: 60, status: "repaired" as const, driverNotes: "Tractor oil topped up", repairNotes: "Added 2 quarts" },
      { inspectionId: necMultiAssetInspections[1].id, assetId: "TRAILER-102", zoneName: "Cargo Area", componentName: "Tie-Down Points", defect: "Rusty tie-down anchor", severity: 50, status: "open" as const, driverNotes: "Trailer cargo anchors need inspection" },
      
      // WALMART Inspection 1: Truck + Trailer
      { inspectionId: walmartMultiAssetInspections[0].id, assetId: "TRUCK-5001", zoneName: "Steering", componentName: "Power Steering", defect: "Steering fluid leak", severity: 80, status: "pending" as const, driverNotes: "Truck steering issue", repairNotes: "Scheduled for repair" },
      { inspectionId: walmartMultiAssetInspections[0].id, assetId: "TRAILER-W50", zoneName: "Suspension", componentName: "Leaf Springs", defect: "Cracked leaf spring", severity: 70, status: "open" as const, driverNotes: "Trailer suspension damaged" },
      
      // WALMART Inspection 2: Van + Equipment
      { inspectionId: walmartMultiAssetInspections[1].id, assetId: "VAN-1145", zoneName: "Electrical", componentName: "Battery", defect: "Weak battery", severity: 55, status: "open" as const, driverNotes: "Van battery needs testing" },
      { inspectionId: walmartMultiAssetInspections[1].id, assetId: "LOADER-22", zoneName: "Hydraulics", componentName: "Lift Cylinder", defect: "Hydraulic leak", severity: 90, status: "open" as const, driverNotes: "Loader hydraulics leaking" },
      
      // FEDEX Inspection 1: Van + Dolly + Trailer
      { inspectionId: fedexMultiAssetInspections[0].id, assetId: "VAN-8803", zoneName: "Cabin", componentName: "Driver Seat", defect: "Torn seat cover", severity: 25, status: "open" as const, driverNotes: "Van seat needs repair" },
      { inspectionId: fedexMultiAssetInspections[0].id, assetId: "DOLLY-F2", zoneName: "Brakes", componentName: "Brake Lines", defect: "Corroded brake line", severity: 95, status: "pending" as const, driverNotes: "Dolly brake line critical", repairNotes: "Emergency repair scheduled" },
      { inspectionId: fedexMultiAssetInspections[0].id, assetId: "TRAILER-F10", zoneName: "Body", componentName: "Door Seals", defect: "Damaged door seal", severity: 40, status: "open" as const, driverNotes: "Trailer door seal worn" },
      
      // FEDEX Inspection 2: Truck + Trailer
      { inspectionId: fedexMultiAssetInspections[1].id, assetId: "TRUCK-5503", zoneName: "Tires", componentName: "Front Tires", defect: "Uneven tire wear", severity: 65, status: "open" as const, driverNotes: "Truck tires need rotation" },
      { inspectionId: fedexMultiAssetInspections[1].id, assetId: "TRAILER-F11", zoneName: "Lights", componentName: "Marker Lights", defect: "Missing marker light cover", severity: 35, status: "repaired" as const, driverNotes: "Trailer light cover replaced", repairNotes: "New cover installed" },
    ];
    
    await db.insert(defects).values(multiAssetDefects);
    
    console.log(`✅ Created ${multiAssetDefects.length} defects for multi-asset inspections`);

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
            assetId: necAssets[i % necAssets.length],
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
            assetId: walmartAssets[i % walmartAssets.length],
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
            assetId: fedexAssets[i % fedexAssets.length],
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
