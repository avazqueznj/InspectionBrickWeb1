import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Companies table
export const companies = pgTable("companies", {
  id: text("company_id").primaryKey(),
  name: text("company_name").notNull(),
  address: text("company_address"),
  settings: text("settings"),
});

// Users table
export const users = pgTable("users", {
  userId: text("user_id").primaryKey(),
  password: text("password").notNull(),
  userFullName: text("user_full_name").notNull(),
  status: text("status").notNull().$type<"ACTIVE" | "INACTIVE">().default("ACTIVE"),
  companyId: text("company_id").references(() => companies.id, { onDelete: "cascade" }),
});

// Assets table
export const assets = pgTable("assets", {
  assetId: text("asset_id").primaryKey(),
  assetConfig: text("asset_config").notNull(),
  assetName: text("asset_name").notNull(),
  status: text("status").notNull().$type<"ACTIVE" | "INACTIVE">().default("ACTIVE"),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
});

// Inspections table
export const inspections = pgTable("inspections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  datetime: timestamp("datetime").notNull().defaultNow(),
  inspectionType: text("inspection_type").notNull(),
  assetId: text("asset_id").notNull(),
  driverName: text("driver_name").notNull(),
  driverId: text("driver_id").notNull(),
  inspectionFormData: text("inspection_form_data"),
});

// Defects table
export const defects = pgTable("defects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inspectionId: varchar("inspection_id").notNull().references(() => inspections.id, { onDelete: "cascade" }),
  zoneName: text("zone_name").notNull(),
  componentName: text("component_name").notNull(),
  defect: text("defect").notNull(),
  severity: integer("severity").notNull(),
  driverNotes: text("driver_notes"),
  status: text("status").notNull().$type<"open" | "pending" | "repaired">(),
  repairNotes: text("repair_notes"),
});

// Inspection Types table
export const inspectionTypes = pgTable("inspection_types", {
  inspectionTypeId: text("inspection_type_id").primaryKey(),
  inspectionLayout: text("inspection_layout").notNull(),
  status: text("status").notNull().$type<"ACTIVE" | "INACTIVE">().default("ACTIVE"),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
});

// Inspection Type Form Fields table
export const inspectionTypeFormFields = pgTable("inspection_type_form_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formFieldName: text("form_field_name").notNull(),
  formFieldType: text("form_field_type").notNull().$type<"TEXT" | "NUM">(),
  formFieldLength: integer("form_field_length").notNull(),
  inspectionTypeId: text("inspection_type_id").notNull().references(() => inspectionTypes.inspectionTypeId, { onDelete: "cascade" }),
});

// Define relations
export const companiesRelations = relations(companies, ({ many }) => ({
  inspections: many(inspections),
  users: many(users),
  assets: many(assets),
  inspectionTypes: many(inspectionTypes),
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
}));

export const inspectionsRelations = relations(inspections, ({ many, one }) => ({
  defects: many(defects),
  company: one(companies, {
    fields: [inspections.companyId],
    references: [companies.id],
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
}));

export const inspectionTypeFormFieldsRelations = relations(inspectionTypeFormFields, ({ one }) => ({
  inspectionType: one(inspectionTypes, {
    fields: [inspectionTypeFormFields.inspectionTypeId],
    references: [inspectionTypes.inspectionTypeId],
  }),
}));

// Insert schemas
export const insertCompanySchema = createInsertSchema(companies);

export const insertUserSchema = createInsertSchema(users).extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const insertAssetSchema = createInsertSchema(assets).extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const insertInspectionSchema = createInsertSchema(inspections).omit({
  id: true,
});

export const insertDefectSchema = createInsertSchema(defects).omit({
  id: true,
}).extend({
  status: z.enum(["open", "pending", "repaired"]),
  severity: z.number().min(0).max(100),
});

export const insertInspectionTypeSchema = createInsertSchema(inspectionTypes).extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const insertInspectionTypeFormFieldSchema = createInsertSchema(inspectionTypeFormFields).omit({
  id: true,
}).extend({
  formFieldType: z.enum(["TEXT", "NUM"]),
  formFieldLength: z.number().int().min(0).max(64),
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

// Extended type for inspection with defects
export type InspectionWithDefects = Inspection & {
  defects: Defect[];
};

// Extended type for inspection type with form fields
export type InspectionTypeWithFormFields = InspectionType & {
  formFields: InspectionTypeFormField[];
};
