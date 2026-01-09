import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, unique, check, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Custom bytea type for binary data (JPEG images)
const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType() {
    return "bytea";
  },
  toDriver(value: Buffer): Buffer {
    return value;
  },
  fromDriver(value: unknown): Buffer {
    if (Buffer.isBuffer(value)) {
      return value;
    }
    if (typeof value === 'string') {
      // Handle hex-encoded bytea (e.g., \x89504e47...)
      if (value.startsWith('\\x')) {
        return Buffer.from(value.slice(2), 'hex');
      }
      return Buffer.from(value, 'binary');
    }
    throw new Error('Unexpected bytea value type');
  },
});

// Companies table
export const companies = pgTable("companies", {
  id: text("company_id").primaryKey(),
  name: text("company_name").notNull(),
  address: text("company_address"),
  dotNumber: text("dot_number"),
  settings: text("settings"),
});

// Locations table - divisions/sites within a company
export const locations = pgTable("locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationName: text("location_name").notNull(),
  address: text("address"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  status: text("status").notNull().$type<"ACTIVE" | "INACTIVE">().default("ACTIVE"),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "restrict" }),
}, (table) => ({
  // Unique constraint: same locationName cannot exist within same company
  uniqueLocationPerCompany: unique().on(table.companyId, table.locationName),
  // Check constraint: locationName cannot be empty string
  locationNameNotEmpty: check("location_name_not_empty", sql`LENGTH(TRIM(${table.locationName})) > 0`),
}));

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  password: text("password").notNull(),
  userFullName: text("user_full_name").notNull(),
  userTag: text("user_tag"),
  status: text("status").notNull().$type<"ACTIVE" | "INACTIVE">().default("ACTIVE"),
  webAccess: boolean("web_access").notNull().default(false),
  customerAdminAccess: boolean("customer_admin_access").notNull().default(false),
  companyId: text("company_id").references(() => companies.id, { onDelete: "cascade" }),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
}, (table) => ({
  // Unique constraint: same userId can exist across companies, but not within same company
  uniqueUserPerCompany: unique().on(table.companyId, table.userId),
  // Check constraint: userId cannot be empty string
  userIdNotEmpty: check("user_id_not_empty", sql`LENGTH(TRIM(${table.userId})) > 0`),
}));

// Assets table
export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: text("asset_id").notNull(),
  layout: varchar("layout").notNull().references(() => layouts.id, { onDelete: "restrict" }),
  assetName: text("asset_name").notNull(),
  licensePlate: text("license_plate"),
  status: text("status").notNull().$type<"ACTIVE" | "INACTIVE">().default("ACTIVE"),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  locationId: varchar("location_id").notNull().references(() => locations.id, { onDelete: "restrict" }),
}, (table) => ({
  // Unique constraint: same assetId can exist across companies, but not within same company
  uniqueAssetPerCompany: unique().on(table.companyId, table.assetId),
  // Check constraint: assetId cannot be empty string
  assetIdNotEmpty: check("asset_id_not_empty", sql`LENGTH(TRIM(${table.assetId})) > 0`),
}));

// Inspections table
export const inspections = pgTable("inspections", {
  id: varchar("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "restrict" }),
  datetime: timestamp("datetime").notNull().defaultNow(),
  inspectionType: text("inspection_type").notNull(),
  driverName: text("driver_name").notNull(),
  driverId: text("driver_id").notNull(),
  inspectionFormData: text("inspection_form_data"),
  inspStartTimeUtc: timestamp("insp_start_time_utc"),
  inspSubmitTimeUtc: timestamp("insp_submit_time_utc"),
  inspTimeOffset: integer("insp_time_offset"),
  inspTimeDst: integer("insp_time_dst"),
  rawData: text("raw_data"),
  locationId: varchar("location_id"),
  locationName: text("location_name"),
  // Photo UUIDs from device cameras (optional, up to 4)
  photoIds: text("photo_ids").array(),
});

// Defects table
export const defects = pgTable("defects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inspectionId: varchar("inspection_id").notNull().references(() => inspections.id, { onDelete: "cascade" }),
  assetId: text("asset_id").notNull(),
  zoneId: integer("zone_id"),
  zoneName: text("zone_name").notNull(),
  componentName: text("component_name").notNull(),
  defect: text("defect").notNull(),
  severity: integer("severity").notNull(),
  inspectedAtUtc: timestamp("inspected_at_utc"),
  driverNotes: text("driver_notes"),
  status: text("status").notNull().$type<"open" | "pending" | "repaired" | "not-needed">(),
  repairNotes: text("repair_notes"),
  mechanicName: text("mechanic_name"),
  repairDate: timestamp("repair_date"),
  // Location denormalization - captured from asset at upload time (no FK - preserves historical data)
  locationId: varchar("location_id"),
  locationName: text("location_name"),
});

// Inspection Types table
export const inspectionTypes = pgTable("inspection_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inspectionTypeName: text("inspection_type_name").notNull(),
  status: text("status").notNull().$type<"ACTIVE" | "INACTIVE">().default("ACTIVE"),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
}, (table) => ({
  // Unique constraint: same inspectionTypeName can exist across companies, but not within same company
  uniqueInspectionTypePerCompany: unique().on(table.companyId, table.inspectionTypeName),
  // Check constraint: inspectionTypeName cannot be empty string
  inspectionTypeNameNotEmpty: check("inspection_type_name_not_empty", sql`LENGTH(TRIM(${table.inspectionTypeName})) > 0`),
}));

// Inspection Type Form Fields table
export const inspectionTypeFormFields = pgTable("inspection_type_form_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formFieldName: text("form_field_name").notNull(),
  formFieldType: text("form_field_type").notNull().$type<"TEXT" | "NUM">(),
  formFieldLength: integer("form_field_length").notNull(),
  inspectionTypeId: varchar("inspection_type_id").notNull().references(() => inspectionTypes.id, { onDelete: "cascade" }),
});

// Layouts table - stores layout configuration
export const layouts = pgTable("layouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  layoutName: text("layout_name").notNull(),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").notNull().default(false),
}, (table) => ({
  // Unique constraint: same layoutName can exist across companies, but not within same company
  uniqueLayoutPerCompany: unique().on(table.companyId, table.layoutName),
  // Check constraint: layoutName cannot be empty string
  layoutNameNotEmpty: check("layout_name_not_empty", sql`LENGTH(TRIM(${table.layoutName})) > 0`),
}));

// Layout Zones table
export const layoutZones = pgTable("layout_zones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  zoneName: text("zone_name").notNull(),
  zoneTag: text("zone_tag").notNull(),
  layoutId: varchar("layout_id").notNull().references(() => layouts.id, { onDelete: "cascade" }),
});

// Zone Images table - stores JPEG images for zone documentation
// FK to zone with cascade delete - when zone is deleted, image is automatically deleted
export const zoneImages = pgTable("zone_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  zoneId: varchar("zone_id").notNull().references(() => layoutZones.id, { onDelete: "cascade" }),
  imageData: bytea("image_data").notNull(),
});

// Layout Zone Components table
export const layoutZoneComponents = pgTable("layout_zone_components", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  componentName: text("component_name").notNull(),
  componentInspectionInstructions: text("component_inspection_instructions"),
  zoneId: varchar("zone_id").notNull().references(() => layoutZones.id, { onDelete: "cascade" }),
});

// Component Defects table
export const componentDefects = pgTable("component_defects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  defectName: text("defect_name").notNull(),
  defectMaxSeverity: integer("defect_max_severity").notNull(),
  defectInstructions: text("defect_instructions"),
  componentId: varchar("component_id").notNull().references(() => layoutZoneComponents.id, { onDelete: "cascade" }),
});

// Inspection Type Layouts junction table - many-to-many relationship
// NOTE: If no records exist for an inspection_type, it means "ALL LAYOUTS" apply
export const inspectionTypeLayouts = pgTable("inspection_type_layouts", {
  inspectionTypeId: varchar("inspection_type_id").notNull().references(() => inspectionTypes.id, { onDelete: "cascade" }),
  layoutId: varchar("layout_id").notNull().references(() => layouts.id, { onDelete: "cascade" }),
}, (table) => ({
  // Compound primary key
  pk: {
    columns: [table.inspectionTypeId, table.layoutId],
  },
}));

// Inspection Assets junction table - many-to-many relationship between inspections and assets
export const inspectionAssets = pgTable("inspection_assets", {
  inspectionId: varchar("inspection_id").notNull().references(() => inspections.id, { onDelete: "cascade" }),
  assetId: text("asset_id").notNull(),
}, (table) => ({
  // Compound primary key
  pk: {
    columns: [table.inspectionId, table.assetId],
  },
}));

// NOTE: Inspection photos are now stored in App Storage (object storage), not database
// Photos are saved to {PRIVATE_OBJECT_DIR}/photos/{uuid}.jpg and served via GET /api/photos/:uuid
// The inspections.photoIds array contains UUIDs that reference these stored files

// Upload Errors table - logs failed device upload attempts for debugging
export const uploadErrors = pgTable("upload_errors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  companyId: text("company_id"),
  driverId: text("driver_id"),
  driverName: text("driver_name"),
  assetId: text("asset_id"),
  rawData: text("raw_data").notNull(),
  errorTrace: text("error_trace").notNull(),
});

// Define relations
export const companiesRelations = relations(companies, ({ many }) => ({
  inspections: many(inspections),
  users: many(users),
  assets: many(assets),
  inspectionTypes: many(inspectionTypes),
  layouts: many(layouts),
  locations: many(locations),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  company: one(companies, {
    fields: [locations.companyId],
    references: [companies.id],
  }),
  users: many(users),
  assets: many(assets),
}));

export const usersRelations = relations(users, ({ one }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  location: one(locations, {
    fields: [users.locationId],
    references: [locations.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  company: one(companies, {
    fields: [assets.companyId],
    references: [companies.id],
  }),
  layoutRelation: one(layouts, {
    fields: [assets.layout],
    references: [layouts.id],
  }),
  location: one(locations, {
    fields: [assets.locationId],
    references: [locations.id],
  }),
}));

export const inspectionsRelations = relations(inspections, ({ many, one }) => ({
  defects: many(defects),
  inspectionAssets: many(inspectionAssets),
  company: one(companies, {
    fields: [inspections.companyId],
    references: [companies.id],
  }),
}));

export const inspectionAssetsRelations = relations(inspectionAssets, ({ one }) => ({
  inspection: one(inspections, {
    fields: [inspectionAssets.inspectionId],
    references: [inspections.id],
  }),
}));

export const defectsRelations = relations(defects, ({ one }) => ({
  inspection: one(inspections, {
    fields: [defects.inspectionId],
    references: [inspections.id],
  }),
}));

export const inspectionTypesRelations = relations(inspectionTypes, ({ one, many }) => ({
  company: one(companies, {
    fields: [inspectionTypes.companyId],
    references: [companies.id],
  }),
  formFields: many(inspectionTypeFormFields),
  layouts: many(inspectionTypeLayouts),
}));

export const inspectionTypeFormFieldsRelations = relations(inspectionTypeFormFields, ({ one }) => ({
  inspectionType: one(inspectionTypes, {
    fields: [inspectionTypeFormFields.inspectionTypeId],
    references: [inspectionTypes.id],
  }),
}));

export const layoutsRelations = relations(layouts, ({ one, many }) => ({
  company: one(companies, {
    fields: [layouts.companyId],
    references: [companies.id],
  }),
  inspectionTypes: many(inspectionTypeLayouts),
  assets: many(assets),
  zones: many(layoutZones),
}));

export const layoutZonesRelations = relations(layoutZones, ({ one, many }) => ({
  layout: one(layouts, {
    fields: [layoutZones.layoutId],
    references: [layouts.id],
  }),
  images: many(zoneImages),
  components: many(layoutZoneComponents),
}));

export const zoneImagesRelations = relations(zoneImages, ({ one }) => ({
  zone: one(layoutZones, {
    fields: [zoneImages.zoneId],
    references: [layoutZones.id],
  }),
}));

export const layoutZoneComponentsRelations = relations(layoutZoneComponents, ({ one, many }) => ({
  zone: one(layoutZones, {
    fields: [layoutZoneComponents.zoneId],
    references: [layoutZones.id],
  }),
  defects: many(componentDefects),
}));

export const componentDefectsRelations = relations(componentDefects, ({ one }) => ({
  component: one(layoutZoneComponents, {
    fields: [componentDefects.componentId],
    references: [layoutZoneComponents.id],
  }),
}));

export const inspectionTypeLayoutsRelations = relations(inspectionTypeLayouts, ({ one }) => ({
  inspectionType: one(inspectionTypes, {
    fields: [inspectionTypeLayouts.inspectionTypeId],
    references: [inspectionTypes.id],
  }),
  layout: one(layouts, {
    fields: [inspectionTypeLayouts.layoutId],
    references: [layouts.id],
  }),
}));

// Insert schemas
export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
}).extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const insertCompanySchema = createInsertSchema(companies);

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
}).extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  webAccess: z.boolean().default(false),
  locationId: z.string().min(1, "Location is required"),
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
}).extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  locationId: z.string().min(1, "Location is required"),
});

export const insertInspectionSchema = createInsertSchema(inspections).extend({
  id: z.string().uuid(),
});

export const insertDefectSchema = createInsertSchema(defects).omit({
  id: true,
}).extend({
  status: z.enum(["open", "pending", "repaired", "not-needed"]),
  severity: z.number().min(0).max(10),
});

export const insertInspectionTypeSchema = createInsertSchema(inspectionTypes).omit({
  id: true,
}).extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const insertInspectionTypeFormFieldSchema = createInsertSchema(inspectionTypeFormFields).omit({
  id: true,
}).extend({
  formFieldType: z.enum(["TEXT", "NUM"]),
  formFieldLength: z.number().int().min(0).max(64),
});

export const insertLayoutSchema = createInsertSchema(layouts).omit({
  id: true,
});

export const insertInspectionTypeLayoutSchema = createInsertSchema(inspectionTypeLayouts);

export const insertInspectionAssetSchema = createInsertSchema(inspectionAssets);

export const insertUploadErrorSchema = createInsertSchema(uploadErrors).omit({
  id: true,
  timestamp: true,
});

export const insertLayoutZoneSchema = createInsertSchema(layoutZones).omit({
  id: true,
});

export const insertLayoutZoneComponentSchema = createInsertSchema(layoutZoneComponents).omit({
  id: true,
});

export const insertComponentDefectSchema = createInsertSchema(componentDefects).omit({
  id: true,
}).extend({
  defectMaxSeverity: z.number().int().min(1).max(10),
});

export const insertZoneImageSchema = createInsertSchema(zoneImages).omit({
  id: true,
});

// Types
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserWithoutPassword = Omit<User, 'password'>;
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type AssetWithLocation = Asset & {
  layoutName?: string;
  locationName?: string | null;
};
export type Inspection = typeof inspections.$inferSelect;
export type InsertInspection = z.infer<typeof insertInspectionSchema>;
export type Defect = typeof defects.$inferSelect;
export type InsertDefect = z.infer<typeof insertDefectSchema>;
export type InspectionType = typeof inspectionTypes.$inferSelect;
export type InsertInspectionType = z.infer<typeof insertInspectionTypeSchema>;
export type InspectionTypeFormField = typeof inspectionTypeFormFields.$inferSelect;
export type InsertInspectionTypeFormField = z.infer<typeof insertInspectionTypeFormFieldSchema>;
export type Layout = typeof layouts.$inferSelect;
export type InsertLayout = z.infer<typeof insertLayoutSchema>;
export type InspectionTypeLayout = typeof inspectionTypeLayouts.$inferSelect;
export type InsertInspectionTypeLayout = z.infer<typeof insertInspectionTypeLayoutSchema>;
export type InspectionAsset = typeof inspectionAssets.$inferSelect;
export type InsertInspectionAsset = z.infer<typeof insertInspectionAssetSchema>;
export type UploadError = typeof uploadErrors.$inferSelect;
export type InsertUploadError = z.infer<typeof insertUploadErrorSchema>;
export type LayoutZone = typeof layoutZones.$inferSelect;
export type InsertLayoutZone = z.infer<typeof insertLayoutZoneSchema>;
export type LayoutZoneComponent = typeof layoutZoneComponents.$inferSelect;
export type InsertLayoutZoneComponent = z.infer<typeof insertLayoutZoneComponentSchema>;
export type ComponentDefect = typeof componentDefects.$inferSelect;
export type InsertComponentDefect = z.infer<typeof insertComponentDefectSchema>;
export type ZoneImage = typeof zoneImages.$inferSelect;
export type InsertZoneImage = z.infer<typeof insertZoneImageSchema>;

// Extended type for inspection with defects and assets
export type InspectionWithDefects = Inspection & {
  defects: Defect[];
  assets?: string[]; // Array of asset IDs involved in this inspection
};

// Extended type for inspection type with form fields and layouts
export type InspectionTypeWithFormFields = InspectionType & {
  formFields: InspectionTypeFormField[];
  layoutIds?: string[]; // Array of layout IDs, empty array means "All Layouts"
  allLayouts?: boolean; // Flag indicating if all layouts are selected
  layouts?: Array<{ id: string; layoutName: string }>; // Layout details for display
  layoutNames?: string; // Comma-separated layout names for display in list view
};

// Extended type for defect with inspection details
export type DefectWithInspection = Defect & {
  inspection?: {
    driverName: string;
    datetime: Date;
  };
};

// Extended types for layout hierarchy
export type LayoutZoneWithComponents = LayoutZone & {
  components: LayoutZoneComponent[];
};

export type LayoutZoneComponentWithDefects = LayoutZoneComponent & {
  defects: ComponentDefect[];
};

export type LayoutWithZones = Layout & {
  zones: LayoutZoneWithComponents[];
};
