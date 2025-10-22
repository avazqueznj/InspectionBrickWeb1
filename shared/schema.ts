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

// Define relations
export const companiesRelations = relations(companies, ({ many }) => ({
  inspections: many(inspections),
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

// Insert schemas
export const insertCompanySchema = createInsertSchema(companies);

export const insertInspectionSchema = createInsertSchema(inspections).omit({
  id: true,
});

export const insertDefectSchema = createInsertSchema(defects).omit({
  id: true,
}).extend({
  status: z.enum(["open", "pending", "repaired"]),
  severity: z.number().min(0).max(100),
});

// Types
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Inspection = typeof inspections.$inferSelect;
export type InsertInspection = z.infer<typeof insertInspectionSchema>;
export type Defect = typeof defects.$inferSelect;
export type InsertDefect = z.infer<typeof insertDefectSchema>;

// Extended type for inspection with defects
export type InspectionWithDefects = Inspection & {
  defects: Defect[];
};
