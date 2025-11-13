import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, unique, check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Companies table
export const companies = pgTable("companies", {
  id: text("company_id").primaryKey(),
  name: text("company_name").notNull(),
  address: text("company_address"),
  dotNumber: text("dot_number"),
  settings: text("settings"),
});

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  password: text("password").notNull(),
  userFullName: text("user_full_name").notNull(),
  status: text("status").notNull().$type<"ACTIVE" | "INACTIVE">().default("ACTIVE"),
  companyId: text("company_id").references(() => companies.id, { onDelete: "cascade" }),
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
}, (table) => ({
  // Unique constraint: same assetId can exist across companies, but not within same company
  uniqueAssetPerCompany: unique().on(table.companyId, table.assetId),
  // Check constraint: assetId cannot be empty string
  assetIdNotEmpty: check("asset_id_not_empty", sql`LENGTH(TRIM(${table.assetId})) > 0`),
}));

// Inspections table
export const inspections = pgTable("inspections", {
  id: varchar("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
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
  status: text("status").notNull().$type<"open" | "pending" | "repaired">(),
  repairNotes: text("repair_notes"),
});

// Inspection Types table
export const inspectionTypes = pgTable("inspection_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inspectionTypeId: text("inspection_type_id").notNull(),
  status: text("status").notNull().$type<"ACTIVE" | "INACTIVE">().default("ACTIVE"),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
}, (table) => ({
  // Unique constraint: same inspectionTypeId can exist across companies, but not within same company
  uniqueInspectionTypePerCompany: unique().on(table.companyId, table.inspectionTypeId),
  // Check constraint: inspectionTypeId cannot be empty string
  inspectionTypeIdNotEmpty: check("inspection_type_id_not_empty", sql`LENGTH(TRIM(${table.inspectionTypeId})) > 0`),
}));

// Inspection Type Form Fields table
export const inspectionTypeFormFields = pgTable("inspection_type_form_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formFieldName: text("form_field_name").notNull(),
  formFieldType: text("form_field_type").notNull().$type<"TEXT" | "NUM">(),
  formFieldLength: integer("form_field_length").notNull(),
  inspectionTypeId: varchar("inspection_type_id").notNull().references(() => inspectionTypes.id, { onDelete: "cascade" }),
});

// Layouts table - stores EDI format layout data
export const layouts = pgTable("layouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  layoutId: text("layout_id").notNull(),
  layoutData: text("layout_data").notNull(),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
}, (table) => ({
  // Unique constraint: same layoutId can exist across companies, but not within same company
  uniqueLayoutPerCompany: unique().on(table.companyId, table.layoutId),
  // Check constraint: layoutId cannot be empty string
  layoutIdNotEmpty: check("layout_id_not_empty", sql`LENGTH(TRIM(${table.layoutId})) > 0`),
}));

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
}));

export const usersRelations = relations(users, ({ one }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
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
export const insertCompanySchema = createInsertSchema(companies);

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
}).extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
}).extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const insertInspectionSchema = createInsertSchema(inspections).extend({
  id: z.string().uuid(),
});

export const insertDefectSchema = createInsertSchema(defects).omit({
  id: true,
}).extend({
  status: z.enum(["open", "pending", "repaired"]),
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

// Types
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserWithoutPassword = Omit<User, 'password'>;
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
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
};

// Extended type for defect with inspection details
export type DefectWithInspection = Defect & {
  inspection?: {
    driverName: string;
    datetime: Date;
  };
};
