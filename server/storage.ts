// Referenced from blueprint:javascript_database
import { companies, inspections, defects, type Company, type Inspection, type InsertInspection, type Defect, type InsertDefect, type InspectionWithDefects } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, ilike, or, sql, and } from "drizzle-orm";

export interface QueryParams {
  companyId?: string;
  search?: string;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IStorage {
  // Companies
  getCompanies(): Promise<Company[]>;
  
  // Inspections
  getInspections(params?: QueryParams): Promise<PaginatedResult<InspectionWithDefects>>;
  getInspection(id: string): Promise<InspectionWithDefects | undefined>;
  createInspection(inspection: InsertInspection): Promise<Inspection>;
  updateInspection(id: string, inspection: Partial<InsertInspection>): Promise<Inspection | undefined>;
  deleteInspection(id: string): Promise<boolean>;
  
  // Defects
  getDefectsByInspectionId(inspectionId: string): Promise<Defect[]>;
  createDefect(defect: InsertDefect): Promise<Defect>;
  updateDefect(id: string, defect: Partial<InsertDefect>): Promise<Defect | undefined>;
  deleteDefect(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(asc(companies.name));
  }

  async getInspections(params?: QueryParams): Promise<PaginatedResult<InspectionWithDefects>> {
    const { companyId, search, sortField = "datetime", sortDirection = "desc", page = 1, limit = 20 } = params || {};
    
    // Build where conditions array
    const conditions = [];
    
    // Filter by company (required)
    if (companyId) {
      conditions.push(eq(inspections.companyId, companyId));
    }
    
    // Add search conditions
    if (search) {
      conditions.push(
        or(
          ilike(inspections.inspectionType, `%${search}%`),
          ilike(inspections.assetId, `%${search}%`),
          ilike(inspections.driverName, `%${search}%`),
          ilike(inspections.driverId, `%${search}%`)
        )!
      );
    }
    
    const whereConditions = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine sort order based on sortField
    const sortColumnMap = {
      datetime: inspections.datetime,
      inspectionType: inspections.inspectionType,
      assetId: inspections.assetId,
      driverName: inspections.driverName,
    };
    
    const sortColumn = sortColumnMap[sortField as keyof typeof sortColumnMap] || inspections.datetime;
    const orderBy = sortDirection === "asc" ? asc(sortColumn) : desc(sortColumn);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inspections)
      .where(whereConditions);
    const total = countResult[0]?.count || 0;

    // Get paginated data
    const offset = (page - 1) * limit;
    const data = await db.query.inspections.findMany({
      where: whereConditions,
      with: {
        defects: true,
      },
      orderBy: [orderBy],
      limit,
      offset,
    });

    return {
      data: data as InspectionWithDefects[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getInspection(id: string): Promise<InspectionWithDefects | undefined> {
    const result = await db.query.inspections.findFirst({
      where: eq(inspections.id, id),
      with: {
        defects: true,
      },
    });
    return result as InspectionWithDefects | undefined;
  }

  async createInspection(insertInspection: InsertInspection): Promise<Inspection> {
    const [inspection] = await db
      .insert(inspections)
      .values(insertInspection)
      .returning();
    return inspection;
  }

  async updateInspection(id: string, updateData: Partial<InsertInspection>): Promise<Inspection | undefined> {
    const [inspection] = await db
      .update(inspections)
      .set(updateData)
      .where(eq(inspections.id, id))
      .returning();
    return inspection;
  }

  async deleteInspection(id: string): Promise<boolean> {
    const result = await db
      .delete(inspections)
      .where(eq(inspections.id, id))
      .returning();
    return result.length > 0;
  }

  async getDefectsByInspectionId(inspectionId: string): Promise<Defect[]> {
    return await db.select().from(defects).where(eq(defects.inspectionId, inspectionId));
  }

  async createDefect(insertDefect: InsertDefect): Promise<Defect> {
    const [defect] = await db
      .insert(defects)
      .values(insertDefect)
      .returning();
    return defect;
  }

  async updateDefect(id: string, updateData: Partial<InsertDefect>): Promise<Defect | undefined> {
    const [defect] = await db
      .update(defects)
      .set(updateData)
      .where(eq(defects.id, id))
      .returning();
    return defect;
  }

  async deleteDefect(id: string): Promise<boolean> {
    const result = await db
      .delete(defects)
      .where(eq(defects.id, id))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
