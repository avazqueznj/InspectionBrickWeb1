// Referenced from blueprint:javascript_database
import { companies, inspections, defects, users, type Company, type Inspection, type InsertInspection, type Defect, type InsertDefect, type InspectionWithDefects, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, ilike, or, sql, and } from "drizzle-orm";

export interface QueryParams {
  companyId?: string;
  search?: string;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  page?: number;
  limit?: number;
  // Filter parameters
  dateFrom?: string;
  dateTo?: string;
  inspectionType?: string;
  assetId?: string;
  driverName?: string;
  driverId?: string;
}

export interface FilterValues {
  inspectionTypes: string[];
  assetIds: string[];
  driverNames: string[];
  driverIds: string[];
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
  
  // Users & Auth
  getUserById(userId: string): Promise<User | undefined>;
  createUser(userId: string, password: string, companyId: string | null): Promise<User>;
  authenticateUser(userId: string, password: string): Promise<User | null>;
  
  // Inspections
  getInspections(params?: QueryParams): Promise<PaginatedResult<InspectionWithDefects>>;
  getInspection(id: string): Promise<InspectionWithDefects | undefined>;
  getFilterValues(companyId?: string): Promise<FilterValues>;
  createInspection(inspection: InsertInspection): Promise<Inspection>;
  updateInspection(id: string, inspection: Partial<InsertInspection>): Promise<Inspection | undefined>;
  deleteInspection(id: string): Promise<boolean>;
  
  // Defects
  getDefectById(id: string): Promise<Defect | undefined>;
  getDefectsByInspectionId(inspectionId: string): Promise<Defect[]>;
  createDefect(defect: InsertDefect): Promise<Defect>;
  updateDefect(id: string, defect: Partial<InsertDefect>): Promise<Defect | undefined>;
  deleteDefect(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getCompanies(): Promise<Company[]> {
    console.log("📋 [Storage] Fetching all companies from database");
    const result = await db.select().from(companies).orderBy(asc(companies.name));
    console.log(`✅ [Storage] Retrieved ${result.length} companies`);
    return result;
  }

  async getUserById(userId: string): Promise<User | undefined> {
    console.log(`🔍 [Storage] Fetching user by ID: ${userId}`);
    const [user] = await db.select().from(users).where(eq(users.userId, userId));
    if (user) {
      console.log(`✅ [Storage] User found: ${userId}, companyId: ${user.companyId || 'null (superuser)'}`);
    } else {
      console.log(`❌ [Storage] User not found: ${userId}`);
    }
    return user;
  }

  async createUser(userId: string, password: string, companyId: string | null): Promise<User> {
    console.log(`➕ [Storage] Creating user: ${userId}, companyId: ${companyId || 'null (superuser)'}`);
    
    const [user] = await db
      .insert(users)
      .values({
        userId,
        password, // Plain text password for pilot flexibility
        companyId,
      })
      .returning();
    
    console.log(`✅ [Storage] User created successfully: ${userId}`);
    return user;
  }

  async authenticateUser(userId: string, password: string): Promise<User | null> {
    console.log(`🔐 [Storage] Authenticating user: ${userId}`);
    
    const user = await this.getUserById(userId);
    if (!user) {
      console.log(`❌ [Storage] Authentication failed - user not found: ${userId}`);
      return null;
    }
    
    // Plain text password comparison for pilot
    const isValid = password === user.password;
    if (!isValid) {
      console.log(`❌ [Storage] Authentication failed - invalid password for user: ${userId}`);
      console.log(`   Expected: ${user.password}, Got: ${password}`);
      return null;
    }
    
    console.log(`✅ [Storage] Authentication successful for user: ${userId}`);
    return user;
  }

  async getInspections(params?: QueryParams): Promise<PaginatedResult<InspectionWithDefects>> {
    const { 
      companyId, 
      search, 
      sortField = "datetime", 
      sortDirection = "desc", 
      page = 1, 
      limit = 20,
      dateFrom,
      dateTo,
      inspectionType,
      assetId,
      driverName,
      driverId
    } = params || {};
    
    console.log(`📊 [Storage] getInspections - companyId: ${companyId || 'ALL'}, search: "${search || ''}", sort: ${sortField} ${sortDirection}, page: ${page}, limit: ${limit}`);
    if (dateFrom || dateTo || inspectionType || assetId || driverName || driverId) {
      console.log(`🔍 [Storage] Filters - dateFrom: ${dateFrom || 'none'}, dateTo: ${dateTo || 'none'}, type: ${inspectionType || 'none'}, asset: ${assetId || 'none'}, driver: ${driverName || 'none'}, driverId: ${driverId || 'none'}`);
    }
    
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
    
    // Add filter conditions
    if (dateFrom) {
      conditions.push(sql`${inspections.datetime}::date >= ${dateFrom}::date`);
    }
    if (dateTo) {
      conditions.push(sql`${inspections.datetime}::date <= ${dateTo}::date`);
    }
    if (inspectionType) {
      conditions.push(eq(inspections.inspectionType, inspectionType));
    }
    if (assetId) {
      conditions.push(eq(inspections.assetId, assetId));
    }
    if (driverName) {
      conditions.push(eq(inspections.driverName, driverName));
    }
    if (driverId) {
      conditions.push(eq(inspections.driverId, driverId));
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

    console.log(`✅ [Storage] getInspections - Found ${data.length} of ${total} total inspections`);
    
    return {
      data: data as InspectionWithDefects[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getInspection(id: string): Promise<InspectionWithDefects | undefined> {
    console.log(`🔍 [Storage] getInspection - id: ${id}`);
    const result = await db.query.inspections.findFirst({
      where: eq(inspections.id, id),
      with: {
        defects: true,
      },
    });
    console.log(`${result ? '✅' : '❌'} [Storage] Inspection ${result ? 'found' : 'not found'}`);
    return result as InspectionWithDefects | undefined;
  }

  async getFilterValues(companyId?: string): Promise<FilterValues> {
    console.log(`🔍 [Storage] getFilterValues - companyId: ${companyId || 'ALL'}`);
    
    const whereCondition = companyId ? eq(inspections.companyId, companyId) : undefined;
    
    // Get distinct values for each filterable column
    const [inspectionTypesResult, assetIdsResult, driverNamesResult, driverIdsResult] = await Promise.all([
      db.selectDistinct({ value: inspections.inspectionType })
        .from(inspections)
        .where(whereCondition)
        .orderBy(asc(inspections.inspectionType)),
      db.selectDistinct({ value: inspections.assetId })
        .from(inspections)
        .where(whereCondition)
        .orderBy(asc(inspections.assetId)),
      db.selectDistinct({ value: inspections.driverName })
        .from(inspections)
        .where(whereCondition)
        .orderBy(asc(inspections.driverName)),
      db.selectDistinct({ value: inspections.driverId })
        .from(inspections)
        .where(whereCondition)
        .orderBy(asc(inspections.driverId)),
    ]);
    
    const result = {
      inspectionTypes: inspectionTypesResult.map(r => r.value),
      assetIds: assetIdsResult.map(r => r.value),
      driverNames: driverNamesResult.map(r => r.value),
      driverIds: driverIdsResult.map(r => r.value),
    };
    
    console.log(`✅ [Storage] getFilterValues - Found ${result.inspectionTypes.length} types, ${result.assetIds.length} assets, ${result.driverNames.length} drivers`);
    return result;
  }

  async createInspection(insertInspection: InsertInspection): Promise<Inspection> {
    console.log(`➕ [Storage] createInspection - companyId: ${insertInspection.companyId}, assetId: ${insertInspection.assetId}`);
    const [inspection] = await db
      .insert(inspections)
      .values(insertInspection)
      .returning();
    console.log(`✅ [Storage] Inspection created with id: ${inspection.id}`);
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

  async getDefectById(id: string): Promise<Defect | undefined> {
    const [defect] = await db.select().from(defects).where(eq(defects.id, id));
    return defect;
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
