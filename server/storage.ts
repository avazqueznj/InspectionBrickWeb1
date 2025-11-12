// Referenced from blueprint:javascript_database
import { companies, inspections, defects, users, assets, inspectionTypes, inspectionTypeFormFields, layouts, inspectionTypeLayouts, inspectionAssets, uploadErrors, type Company, type Inspection, type InsertInspection, type Defect, type InsertDefect, type InspectionWithDefects, type User, type InsertUser, type UserWithoutPassword, type Asset, type InsertAsset, type InspectionType, type InsertInspectionType, type InspectionTypeFormField, type InsertInspectionTypeFormField, type InspectionTypeWithFormFields, type Layout, type InsertInspectionAsset } from "@shared/schema";
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

export interface UserQueryParams {
  companyId?: string;
  search?: string;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  page?: number;
  limit?: number;
  // Filter parameters
  status?: "ACTIVE" | "INACTIVE";
}

export interface AssetQueryParams {
  companyId?: string;
  search?: string;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  page?: number;
  limit?: number;
  // Filter parameters
  status?: "ACTIVE" | "INACTIVE";
}

export interface InspectionTypeQueryParams {
  companyId?: string;
  search?: string;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  page?: number;
  limit?: number;
  // Filter parameters
  status?: "ACTIVE" | "INACTIVE";
}

export interface FilterValues {
  inspectionTypes: string[];
  assetIds: string[];
  driverNames: string[];
  driverIds: string[];
}

export interface UserFilterValues {
  statuses: ("ACTIVE" | "INACTIVE")[];
}

export interface AssetFilterValues {
  statuses: ("ACTIVE" | "INACTIVE")[];
}

export interface InspectionTypeFilterValues {
  statuses: ("ACTIVE" | "INACTIVE")[];
}

export interface DefectQueryParams {
  companyId?: string;
  search?: string;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  page?: number;
  limit?: number;
  // Filter parameters
  dateFrom?: string;
  dateTo?: string;
  assetId?: string;
  driverName?: string;
  zoneName?: string;
  componentName?: string;
  severityLevel?: "critical" | "high" | "medium" | "low";
  status?: "open" | "pending" | "repaired";
}

export interface DefectFilterValues {
  assetIds: string[];
  driverNames: string[];
  zoneNames: string[];
  componentNames: string[];
  severityLevels: ("critical" | "high" | "medium" | "low")[];
  statuses: ("open" | "pending" | "repaired")[];
}

export interface DefectWithInspection extends Defect {
  inspection?: {
    driverName: string;
    datetime: Date;
  };
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
  createUser(user: InsertUser): Promise<User>;
  updateUser(userId: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(userId: string): Promise<boolean>;
  authenticateUser(userId: string, password: string): Promise<User | null>;
  getUsers(params?: UserQueryParams): Promise<PaginatedResult<UserWithoutPassword>>;
  getUserFilterValues(companyId?: string): Promise<UserFilterValues>;
  
  // Assets
  getAssets(params?: AssetQueryParams): Promise<PaginatedResult<Asset>>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(assetId: string, asset: Partial<InsertAsset>): Promise<Asset | undefined>;
  getAssetFilterValues(companyId?: string): Promise<AssetFilterValues>;
  
  // Inspection Types
  getInspectionTypes(params?: InspectionTypeQueryParams): Promise<PaginatedResult<InspectionTypeWithFormFields>>;
  getInspectionTypeById(inspectionTypeId: string, companyId?: string): Promise<InspectionTypeWithFormFields | undefined>;
  getInspectionTypeByUUID(id: string): Promise<InspectionTypeWithFormFields | undefined>;
  createInspectionType(inspectionType: InsertInspectionType): Promise<InspectionType>;
  updateInspectionType(inspectionTypeId: string, inspectionType: Partial<InsertInspectionType>): Promise<InspectionType | undefined>;
  getInspectionTypeFilterValues(companyId?: string): Promise<InspectionTypeFilterValues>;
  
  // Inspection Type Form Fields
  getInspectionTypeFormFieldById(id: string): Promise<InspectionTypeFormField | undefined>;
  createInspectionTypeFormField(formField: InsertInspectionTypeFormField): Promise<InspectionTypeFormField>;
  updateInspectionTypeFormField(id: string, formField: Partial<InsertInspectionTypeFormField>): Promise<InspectionTypeFormField | undefined>;
  deleteInspectionTypeFormField(id: string): Promise<boolean>;
  
  // Inspections
  getInspections(params?: QueryParams): Promise<PaginatedResult<InspectionWithDefects>>;
  getInspection(id: string): Promise<InspectionWithDefects | undefined>;
  getFilterValues(companyId?: string): Promise<FilterValues>;
  createInspection(inspection: InsertInspection): Promise<Inspection>;
  updateInspection(id: string, inspection: Partial<InsertInspection>): Promise<Inspection | undefined>;
  deleteInspection(id: string): Promise<boolean>;
  
  // Inspection Assets
  createInspectionAsset(inspectionAsset: InsertInspectionAsset): Promise<void>;
  getInspectionAssets(inspectionId: string): Promise<string[]>;
  
  // Defects
  getDefectById(id: string): Promise<Defect | undefined>;
  getDefectsByInspectionId(inspectionId: string): Promise<Defect[]>;
  getDefects(params?: DefectQueryParams): Promise<PaginatedResult<DefectWithInspection>>;
  getDefectFilterValues(companyId?: string): Promise<DefectFilterValues>;
  createDefect(defect: InsertDefect): Promise<Defect>;
  updateDefect(id: string, defect: Partial<InsertDefect>): Promise<Defect | undefined>;
  deleteDefect(id: string): Promise<boolean>;
  
  // Upload Errors
  createUploadError(error: { companyId: string | null; driverId: string | null; driverName: string | null; assetId: string | null; rawData: string; errorTrace: string }): Promise<void>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    console.log(`➕ [Storage] Creating user: ${insertUser.userId}, companyId: ${insertUser.companyId || 'null (superuser)'}`);
    
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    
    console.log(`✅ [Storage] User created successfully: ${insertUser.userId}`);
    return user;
  }

  async updateUser(userId: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    console.log(`🔄 [Storage] Updating user: ${userId}`);
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.userId, userId))
      .returning();
    console.log(`${user ? '✅' : '❌'} [Storage] User ${user ? 'updated' : 'not found'}`);
    return user;
  }

  async deleteUser(userId: string): Promise<boolean> {
    console.log(`🗑️ [Storage] Deleting user: ${userId}`);
    const result = await db
      .delete(users)
      .where(eq(users.userId, userId))
      .returning();
    console.log(`${result.length > 0 ? '✅' : '❌'} [Storage] User ${result.length > 0 ? 'deleted' : 'not found'}`);
    return result.length > 0;
  }

  async getUsers(params?: UserQueryParams): Promise<PaginatedResult<UserWithoutPassword>> {
    const { 
      companyId, 
      search, 
      sortField = "userId", 
      sortDirection = "asc", 
      page = 1, 
      limit = 10,
      status
    } = params || {};
    
    console.log(`📊 [Storage] getUsers - companyId: ${companyId || 'ALL'}, search: "${search || ''}", sort: ${sortField} ${sortDirection}, page: ${page}, limit: ${limit}, status: ${status || 'ALL'}`);
    
    // Build where conditions array
    const conditions = [];
    
    // Filter by company (if specified)
    if (companyId) {
      conditions.push(eq(users.companyId, companyId));
    }
    
    // Add search conditions
    if (search) {
      conditions.push(
        or(
          ilike(users.userId, `%${search}%`),
          ilike(users.userFullName, `%${search}%`)
        )!
      );
    }
    
    // Add status filter
    if (status) {
      conditions.push(eq(users.status, status));
    }
    
    const whereConditions = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine sort order based on sortField
    const sortColumnMap = {
      userId: users.userId,
      userFullName: users.userFullName,
      status: users.status,
    };
    
    const sortColumn = sortColumnMap[sortField as keyof typeof sortColumnMap] || users.userId;
    const orderBy = sortDirection === "asc" ? asc(sortColumn) : desc(sortColumn);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereConditions);
    const total = countResult[0]?.count || 0;

    // Get paginated data (excluding password field)
    const offset = (page - 1) * limit;
    const data = await db
      .select({
        id: users.id,
        userId: users.userId,
        userFullName: users.userFullName,
        status: users.status,
        companyId: users.companyId,
      })
      .from(users)
      .where(whereConditions)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    console.log(`✅ [Storage] getUsers - Found ${data.length} of ${total} total users`);
    
    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserFilterValues(companyId?: string): Promise<UserFilterValues> {
    console.log(`🔍 [Storage] getUserFilterValues - companyId: ${companyId || 'ALL'}`);
    
    const whereCondition = companyId ? eq(users.companyId, companyId) : undefined;
    
    // Get distinct status values
    const statusesResult = await db.selectDistinct({ value: users.status })
      .from(users)
      .where(whereCondition)
      .orderBy(asc(users.status));
    
    const result = {
      statuses: statusesResult.map(r => r.value).filter((v): v is "ACTIVE" | "INACTIVE" => v === "ACTIVE" || v === "INACTIVE"),
    };
    
    console.log(`✅ [Storage] getUserFilterValues - Found ${result.statuses.length} statuses`);
    return result;
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

  async getAssets(params?: AssetQueryParams): Promise<PaginatedResult<Asset>> {
    const { 
      companyId, 
      search, 
      sortField = "assetId", 
      sortDirection = "asc", 
      page = 1, 
      limit = 10,
      status
    } = params || {};
    
    console.log(`📊 [Storage] getAssets - companyId: ${companyId || 'ALL'}, search: "${search || ''}", sort: ${sortField} ${sortDirection}, page: ${page}, limit: ${limit}, status: ${status || 'ALL'}`);
    
    // Build where conditions array
    const conditions = [];
    
    // Filter by company (if specified)
    if (companyId) {
      conditions.push(eq(assets.companyId, companyId));
    }
    
    // Add search conditions - search in assetId, assetName, and layout.layoutId
    if (search) {
      conditions.push(
        or(
          ilike(assets.assetId, `%${search}%`),
          ilike(layouts.layoutId, `%${search}%`),
          ilike(assets.assetName, `%${search}%`)
        )!
      );
    }
    
    // Add status filter
    if (status) {
      conditions.push(eq(assets.status, status));
    }
    
    const whereConditions = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine sort order based on sortField
    const sortColumnMap = {
      assetId: assets.assetId,
      assetConfig: layouts.layoutId,
      assetName: assets.assetName,
      status: assets.status,
    };
    
    const sortColumn = sortColumnMap[sortField as keyof typeof sortColumnMap] || assets.assetId;
    const orderBy = sortDirection === "asc" ? asc(sortColumn) : desc(sortColumn);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assets)
      .innerJoin(layouts, eq(assets.layout, layouts.id))
      .where(whereConditions);
    const total = countResult[0]?.count || 0;

    // Get paginated data with layout information
    const offset = (page - 1) * limit;
    const results = await db
      .select({
        id: assets.id,
        assetId: assets.assetId,
        layout: assets.layout,
        layoutId: layouts.layoutId,
        assetName: assets.assetName,
        status: assets.status,
        companyId: assets.companyId,
      })
      .from(assets)
      .innerJoin(layouts, eq(assets.layout, layouts.id))
      .where(whereConditions)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Map results to Asset type with layoutId added
    const data = results.map(r => ({
      id: r.id,
      assetId: r.assetId,
      layout: r.layout,
      assetName: r.assetName,
      status: r.status,
      companyId: r.companyId,
      layoutId: r.layoutId,
    })) as any;

    console.log(`✅ [Storage] getAssets - Found ${results.length} of ${total} total assets`);
    
    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    console.log(`➕ [Storage] Creating asset: ${insertAsset.assetId}, companyId: ${insertAsset.companyId}`);
    
    const [asset] = await db
      .insert(assets)
      .values(insertAsset)
      .returning();
    
    console.log(`✅ [Storage] Asset created successfully: ${insertAsset.assetId}`);
    return asset;
  }

  async updateAsset(assetId: string, updateData: Partial<InsertAsset>): Promise<Asset | undefined> {
    console.log(`🔄 [Storage] Updating asset: ${assetId}`);
    const [asset] = await db
      .update(assets)
      .set(updateData)
      .where(eq(assets.assetId, assetId))
      .returning();
    console.log(`${asset ? '✅' : '❌'} [Storage] Asset ${asset ? 'updated' : 'not found'}`);
    return asset;
  }

  async getAssetFilterValues(companyId?: string): Promise<AssetFilterValues> {
    console.log(`🔍 [Storage] getAssetFilterValues - companyId: ${companyId || 'ALL'}`);
    
    const whereCondition = companyId ? eq(assets.companyId, companyId) : undefined;
    
    // Get distinct status values
    const statusesResult = await db.selectDistinct({ value: assets.status })
      .from(assets)
      .where(whereCondition)
      .orderBy(asc(assets.status));
    
    const result = {
      statuses: statusesResult.map(r => r.value).filter((v): v is "ACTIVE" | "INACTIVE" => v === "ACTIVE" || v === "INACTIVE"),
    };
    
    console.log(`✅ [Storage] getAssetFilterValues - Found ${result.statuses.length} statuses`);
    return result;
  }

  async getInspectionTypes(params?: InspectionTypeQueryParams): Promise<PaginatedResult<InspectionTypeWithFormFields>> {
    const { 
      companyId, 
      search, 
      sortField = "inspectionTypeId", 
      sortDirection = "asc", 
      page = 1, 
      limit = 10,
      status
    } = params || {};
    
    console.log(`📊 [Storage] getInspectionTypes - companyId: ${companyId || 'ALL'}, search: "${search || ''}", sort: ${sortField} ${sortDirection}, page: ${page}, limit: ${limit}, status: ${status || 'ALL'}`);
    
    // Build where conditions array
    const conditions = [];
    
    // Filter by company (if specified)
    if (companyId) {
      conditions.push(eq(inspectionTypes.companyId, companyId));
    }
    
    // Add search conditions
    if (search) {
      conditions.push(
        ilike(inspectionTypes.inspectionTypeId, `%${search}%`)
      );
    }
    
    // Add status filter
    if (status) {
      conditions.push(eq(inspectionTypes.status, status));
    }
    
    const whereConditions = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine sort order based on sortField
    const sortColumnMap = {
      inspectionTypeId: inspectionTypes.inspectionTypeId,
      status: inspectionTypes.status,
    };
    
    const sortColumn = sortColumnMap[sortField as keyof typeof sortColumnMap] || inspectionTypes.inspectionTypeId;
    const orderBy = sortDirection === "asc" ? asc(sortColumn) : desc(sortColumn);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inspectionTypes)
      .where(whereConditions);
    const total = countResult[0]?.count || 0;

    // Get paginated data with form fields
    const offset = (page - 1) * limit;
    const data = await db.query.inspectionTypes.findMany({
      where: whereConditions,
      with: {
        formFields: true,
      },
      orderBy: [orderBy],
      limit,
      offset,
    });

    console.log(`✅ [Storage] getInspectionTypes - Found ${data.length} of ${total} total inspection types`);
    
    return {
      data: data as InspectionTypeWithFormFields[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getInspectionTypeById(inspectionTypeId: string, companyId?: string): Promise<InspectionTypeWithFormFields | undefined> {
    console.log(`🔍 [Storage] getInspectionTypeById - id: ${inspectionTypeId}, companyId: ${companyId || 'ANY'}`);
    
    // Build where condition: match business ID and optionally company ID
    const conditions = [eq(inspectionTypes.inspectionTypeId, inspectionTypeId)];
    if (companyId) {
      conditions.push(eq(inspectionTypes.companyId, companyId));
    }
    
    const result = await db.query.inspectionTypes.findFirst({
      where: and(...conditions),
      with: {
        formFields: true,
      },
    });
    
    if (!result) {
      console.log(`❌ [Storage] Inspection type not found`);
      return undefined;
    }
    
    // Get associated layout IDs (empty array means "all layouts")
    const layoutIds = await this.getInspectionTypeLayouts(result.id);
    
    console.log(`✅ [Storage] Inspection type found with ${result.formFields.length} form fields and ${layoutIds.length === 0 ? 'ALL' : layoutIds.length} layout(s)`);
    
    return {
      ...result,
      layoutIds,
      allLayouts: layoutIds.length === 0,
    } as InspectionTypeWithFormFields;
  }

  async getInspectionTypeByUUID(id: string): Promise<InspectionTypeWithFormFields | undefined> {
    console.log(`🔍 [Storage] getInspectionTypeByUUID - UUID: ${id}`);
    const result = await db.query.inspectionTypes.findFirst({
      where: eq(inspectionTypes.id, id),
      with: {
        formFields: true,
      },
    });
    console.log(`${result ? '✅' : '❌'} [Storage] Inspection type ${result ? 'found' : 'not found'}`);
    return result as InspectionTypeWithFormFields | undefined;
  }

  async createInspectionType(insertInspectionType: InsertInspectionType): Promise<InspectionType> {
    console.log(`➕ [Storage] Creating inspection type: ${insertInspectionType.inspectionTypeId}, companyId: ${insertInspectionType.companyId}`);
    
    const [inspectionType] = await db
      .insert(inspectionTypes)
      .values(insertInspectionType)
      .returning();
    
    console.log(`✅ [Storage] Inspection type created successfully: ${insertInspectionType.inspectionTypeId}`);
    return inspectionType;
  }

  async updateInspectionType(inspectionTypeId: string, updateData: Partial<InsertInspectionType>): Promise<InspectionType | undefined> {
    console.log(`🔄 [Storage] Updating inspection type: ${inspectionTypeId}`);
    const [inspectionType] = await db
      .update(inspectionTypes)
      .set(updateData)
      .where(eq(inspectionTypes.inspectionTypeId, inspectionTypeId))
      .returning();
    console.log(`${inspectionType ? '✅' : '❌'} [Storage] Inspection type ${inspectionType ? 'updated' : 'not found'}`);
    return inspectionType;
  }

  async getInspectionTypeFilterValues(companyId?: string): Promise<InspectionTypeFilterValues> {
    console.log(`🔍 [Storage] getInspectionTypeFilterValues - companyId: ${companyId || 'ALL'}`);
    
    const whereCondition = companyId ? eq(inspectionTypes.companyId, companyId) : undefined;
    
    // Get distinct status values
    const statusesResult = await db.selectDistinct({ value: inspectionTypes.status })
      .from(inspectionTypes)
      .where(whereCondition)
      .orderBy(asc(inspectionTypes.status));
    
    const result = {
      statuses: statusesResult.map(r => r.value).filter((v): v is "ACTIVE" | "INACTIVE" => v === "ACTIVE" || v === "INACTIVE"),
    };
    
    console.log(`✅ [Storage] getInspectionTypeFilterValues - Found ${result.statuses.length} statuses`);
    return result;
  }

  async getInspectionTypeFormFieldById(id: string): Promise<InspectionTypeFormField | undefined> {
    console.log(`🔍 [Storage] Fetching form field by ID: ${id}`);
    const [formField] = await db
      .select()
      .from(inspectionTypeFormFields)
      .where(eq(inspectionTypeFormFields.id, id));
    console.log(`${formField ? '✅' : '❌'} [Storage] Form field ${formField ? 'found' : 'not found'}`);
    return formField;
  }

  async createInspectionTypeFormField(insertFormField: InsertInspectionTypeFormField): Promise<InspectionTypeFormField> {
    console.log(`➕ [Storage] Creating form field: ${insertFormField.formFieldName} for inspection type: ${insertFormField.inspectionTypeId}`);
    
    const [formField] = await db
      .insert(inspectionTypeFormFields)
      .values(insertFormField)
      .returning();
    
    console.log(`✅ [Storage] Form field created successfully`);
    return formField;
  }

  async updateInspectionTypeFormField(id: string, updateData: Partial<InsertInspectionTypeFormField>): Promise<InspectionTypeFormField | undefined> {
    console.log(`🔄 [Storage] Updating form field: ${id}`);
    const [formField] = await db
      .update(inspectionTypeFormFields)
      .set(updateData)
      .where(eq(inspectionTypeFormFields.id, id))
      .returning();
    console.log(`${formField ? '✅' : '❌'} [Storage] Form field ${formField ? 'updated' : 'not found'}`);
    return formField;
  }

  async deleteInspectionTypeFormField(id: string): Promise<boolean> {
    console.log(`🗑️ [Storage] Deleting form field: ${id}`);
    const result = await db
      .delete(inspectionTypeFormFields)
      .where(eq(inspectionTypeFormFields.id, id))
      .returning();
    console.log(`${result.length > 0 ? '✅' : '❌'} [Storage] Form field ${result.length > 0 ? 'deleted' : 'not found'}`);
    return result.length > 0;
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
      // Filter using inspection_assets junction table to support multi-asset inspections
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${inspectionAssets}
          WHERE ${inspectionAssets.inspectionId} = ${inspections.id}
          AND ${inspectionAssets.assetId} = ${assetId}
        )`
      );
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
    const data = await db
      .select()
      .from(inspections)
      .where(whereConditions)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    console.log(`✅ [Storage] getInspections - Found ${data.length} of ${total} total inspections`);
    
    // Fetch defects and associated assets for each inspection
    const dataWithDefectsAndAssets = await Promise.all(
      data.map(async (inspection) => {
        const [inspectionDefects, assets] = await Promise.all([
          db.select().from(defects).where(eq(defects.inspectionId, inspection.id)),
          this.getInspectionAssets(inspection.id)
        ]);
        return {
          ...inspection,
          defects: inspectionDefects,
          assets,
        };
      })
    );
    
    return {
      data: dataWithDefectsAndAssets as InspectionWithDefects[],
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
    
    if (!result) {
      console.log(`❌ [Storage] Inspection not found`);
      return undefined;
    }
    
    // Fetch associated assets
    const assets = await this.getInspectionAssets(id);
    console.log(`✅ [Storage] Inspection found with ${assets.length} associated assets`);
    
    return {
      ...result,
      assets,
    } as InspectionWithDefects;
  }

  async getFilterValues(companyId?: string): Promise<FilterValues> {
    console.log(`🔍 [Storage] getFilterValues - companyId: ${companyId || 'ALL'}`);
    
    const whereCondition = companyId ? eq(inspections.companyId, companyId) : undefined;
    
    // Get distinct values for each filterable column
    // For assetIds, query from inspection_assets junction table to include all assets in multi-asset inspections
    const [inspectionTypesResult, assetIdsResult, driverNamesResult, driverIdsResult] = await Promise.all([
      db.selectDistinct({ value: inspections.inspectionType })
        .from(inspections)
        .where(whereCondition)
        .orderBy(asc(inspections.inspectionType)),
      db.selectDistinct({ value: inspectionAssets.assetId })
        .from(inspectionAssets)
        .innerJoin(inspections, eq(inspectionAssets.inspectionId, inspections.id))
        .where(whereCondition)
        .orderBy(asc(inspectionAssets.assetId)),
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
    console.log(`➕ [Storage] createInspection - companyId: ${insertInspection.companyId}, inspectionType: ${insertInspection.inspectionType}`);
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

  async createInspectionAsset(insertInspectionAsset: InsertInspectionAsset): Promise<void> {
    await db
      .insert(inspectionAssets)
      .values(insertInspectionAsset)
      .onConflictDoNothing();
  }

  async getInspectionAssets(inspectionId: string): Promise<string[]> {
    const result = await db
      .select({ assetId: inspectionAssets.assetId })
      .from(inspectionAssets)
      .where(eq(inspectionAssets.inspectionId, inspectionId))
      .orderBy(asc(inspectionAssets.assetId));
    return result.map(r => r.assetId);
  }

  async getDefectById(id: string): Promise<Defect | undefined> {
    const [defect] = await db.select().from(defects).where(eq(defects.id, id));
    return defect;
  }

  async getDefectsByInspectionId(inspectionId: string): Promise<Defect[]> {
    return await db.select().from(defects).where(
      and(
        eq(defects.inspectionId, inspectionId),
        sql`${defects.severity} > 0`
      )
    );
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

  async getDefects(params?: DefectQueryParams): Promise<PaginatedResult<DefectWithInspection>> {
    const { 
      companyId, 
      search, 
      sortField = "datetime", 
      sortDirection = "desc", 
      page = 1, 
      limit = 20,
      dateFrom,
      dateTo,
      assetId,
      driverName,
      zoneName,
      componentName,
      severityLevel,
      status
    } = params || {};
    
    console.log(`📊 [Storage] getDefects - companyId: ${companyId || 'ALL'}, search: "${search || ''}", sort: ${sortField} ${sortDirection}, page: ${page}, limit: ${limit}`);
    
    // Build where conditions array
    const conditions = [];
    
    // Filter by company (required) - join with inspections to get companyId
    if (companyId) {
      conditions.push(eq(inspections.companyId, companyId));
    }
    
    // Add search conditions (search across defect and inspection fields)
    if (search) {
      conditions.push(
        or(
          ilike(defects.zoneName, `%${search}%`),
          ilike(defects.componentName, `%${search}%`),
          ilike(defects.defect, `%${search}%`),
          ilike(defects.assetId, `%${search}%`),
          ilike(inspections.driverName, `%${search}%`)
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
    if (assetId) {
      conditions.push(eq(defects.assetId, assetId));
    }
    if (driverName) {
      conditions.push(eq(inspections.driverName, driverName));
    }
    if (zoneName) {
      conditions.push(eq(defects.zoneName, zoneName));
    }
    if (componentName) {
      conditions.push(eq(defects.componentName, componentName));
    }
    if (severityLevel) {
      // Map severity levels to numeric ranges (aligned with UI badge thresholds)
      const severityRanges = {
        critical: { min: 75, max: 100 },
        high: { min: 50, max: 74 },
        medium: { min: 25, max: 49 },
        low: { min: 0, max: 24 },
      };
      const range = severityRanges[severityLevel];
      conditions.push(
        and(
          sql`${defects.severity} >= ${range.min}`,
          sql`${defects.severity} <= ${range.max}`
        )!
      );
    }
    if (status) {
      conditions.push(eq(defects.status, status));
    }
    
    // Always filter out severity = 0 defects (no-issue entries)
    conditions.push(sql`${defects.severity} > 0`);
    
    const whereConditions = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine sort order based on sortField
    const sortColumnMap = {
      datetime: inspections.datetime,
      assetId: defects.assetId,
      driverName: inspections.driverName,
      zoneName: defects.zoneName,
      componentName: defects.componentName,
      defect: defects.defect,
      severity: defects.severity,
      status: defects.status,
      inspectedAtUtc: defects.inspectedAtUtc,
    };
    
    const sortColumn = sortColumnMap[sortField as keyof typeof sortColumnMap] || inspections.datetime;
    
    // Multi-column sorting for better UX:
    // - severity: DESC → inspectedAtUtc ASC (mechanics prioritize severe defects, then chronologically)
    // - assetId: ASC/DESC → zoneName ASC (group by asset, then by zone alphabetically)
    // - other fields: single column sort
    let orderByArray;
    if (sortField === "severity") {
      orderByArray = [
        sortDirection === "asc" ? asc(sortColumn) : desc(sortColumn),
        asc(defects.inspectedAtUtc)
      ];
    } else if (sortField === "assetId") {
      orderByArray = [
        sortDirection === "asc" ? asc(sortColumn) : desc(sortColumn),
        asc(defects.zoneName)
      ];
    } else {
      orderByArray = [sortDirection === "asc" ? asc(sortColumn) : desc(sortColumn)];
    }

    // Get total count using join
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(defects)
      .innerJoin(inspections, eq(defects.inspectionId, inspections.id))
      .where(whereConditions);
    const total = countResult[0]?.count || 0;

    // Get paginated data with inspection details
    const offset = (page - 1) * limit;
    const data = await db
      .select({
        id: defects.id,
        inspectionId: defects.inspectionId,
        assetId: defects.assetId,
        zoneId: defects.zoneId,
        zoneName: defects.zoneName,
        componentName: defects.componentName,
        defect: defects.defect,
        severity: defects.severity,
        inspectedAtUtc: defects.inspectedAtUtc,
        driverNotes: defects.driverNotes,
        status: defects.status,
        repairNotes: defects.repairNotes,
        // Inspection details
        driverName: inspections.driverName,
        datetime: inspections.datetime,
      })
      .from(defects)
      .innerJoin(inspections, eq(defects.inspectionId, inspections.id))
      .where(whereConditions)
      .orderBy(...orderByArray)
      .limit(limit)
      .offset(offset);

    console.log(`✅ [Storage] getDefects - Found ${data.length} of ${total} total defects`);
    
    // Map to DefectWithInspection format
    const defectsWithInspection: DefectWithInspection[] = data.map(row => ({
      id: row.id,
      inspectionId: row.inspectionId,
      assetId: row.assetId,
      zoneId: row.zoneId,
      zoneName: row.zoneName,
      componentName: row.componentName,
      defect: row.defect,
      severity: row.severity,
      inspectedAtUtc: row.inspectedAtUtc,
      driverNotes: row.driverNotes,
      status: row.status,
      repairNotes: row.repairNotes,
      inspection: {
        driverName: row.driverName,
        datetime: row.datetime,
      }
    }));
    
    return {
      data: defectsWithInspection,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDefectFilterValues(companyId?: string): Promise<DefectFilterValues> {
    console.log(`🔍 [Storage] getDefectFilterValues - companyId: ${companyId || 'ALL'}`);
    
    // Build where conditions: company filter + exclude severity 0
    const conditions = [];
    if (companyId) {
      conditions.push(eq(inspections.companyId, companyId));
    }
    conditions.push(sql`${defects.severity} > 0`);
    const whereCondition = and(...conditions);
    
    // Get distinct values for each filterable column (join with inspections for company scoping)
    const [assetIdsResult, driverNamesResult, zoneNamesResult, componentNamesResult, statusesResult] = await Promise.all([
      db.selectDistinct({ value: defects.assetId })
        .from(defects)
        .innerJoin(inspections, eq(defects.inspectionId, inspections.id))
        .where(whereCondition)
        .orderBy(asc(defects.assetId)),
      db.selectDistinct({ value: inspections.driverName })
        .from(defects)
        .innerJoin(inspections, eq(defects.inspectionId, inspections.id))
        .where(whereCondition)
        .orderBy(asc(inspections.driverName)),
      db.selectDistinct({ value: defects.zoneName })
        .from(defects)
        .innerJoin(inspections, eq(defects.inspectionId, inspections.id))
        .where(whereCondition)
        .orderBy(asc(defects.zoneName)),
      db.selectDistinct({ value: defects.componentName })
        .from(defects)
        .innerJoin(inspections, eq(defects.inspectionId, inspections.id))
        .where(whereCondition)
        .orderBy(asc(defects.componentName)),
      db.selectDistinct({ value: defects.status })
        .from(defects)
        .innerJoin(inspections, eq(defects.inspectionId, inspections.id))
        .where(whereCondition)
        .orderBy(asc(defects.status)),
    ]);
    
    const result = {
      assetIds: assetIdsResult.map(r => r.value),
      driverNames: driverNamesResult.map(r => r.value),
      zoneNames: zoneNamesResult.map(r => r.value),
      componentNames: componentNamesResult.map(r => r.value),
      severityLevels: ["critical", "high", "medium", "low"] as ("critical" | "high" | "medium" | "low")[],
      statuses: statusesResult.map(r => r.value) as ("open" | "pending" | "repaired")[],
    };
    
    console.log(`✅ [Storage] getDefectFilterValues - Found ${result.assetIds.length} assets, ${result.zoneNames.length} zones, ${result.componentNames.length} components`);
    return result;
  }

  // === LAYOUT METHODS ===

  async getLayouts(companyId: string): Promise<Layout[]> {
    console.log(`📊 [Storage] getLayouts - companyId: ${companyId}`);
    
    const result = await db.query.layouts.findMany({
      where: eq(layouts.companyId, companyId),
      orderBy: [asc(layouts.layoutId)],
    });
    
    console.log(`✅ [Storage] Found ${result.length} layouts`);
    return result as Layout[];
  }

  async getInspectionTypeLayouts(inspectionTypeId: string): Promise<string[]> {
    console.log(`🔍 [Storage] getInspectionTypeLayouts - inspectionTypeId: ${inspectionTypeId}`);
    
    const result = await db.query.inspectionTypeLayouts.findMany({
      where: eq(inspectionTypeLayouts.inspectionTypeId, inspectionTypeId),
    });
    
    const layoutIds = result.map(r => r.layoutId);
    console.log(`✅ [Storage] Found ${layoutIds.length} layout associations (empty = all layouts)`);
    return layoutIds;
  }

  async setInspectionTypeLayouts(inspectionTypeId: string, layoutIds: string[]): Promise<void> {
    console.log(`🔄 [Storage] setInspectionTypeLayouts - inspectionTypeId: ${inspectionTypeId}, layoutIds: ${layoutIds.length > 0 ? layoutIds.join(', ') : 'ALL (empty)'}`);
    
    // Delete existing associations
    await db
      .delete(inspectionTypeLayouts)
      .where(eq(inspectionTypeLayouts.inspectionTypeId, inspectionTypeId));
    
    // If layoutIds is empty, we're done (empty = all layouts apply)
    if (layoutIds.length === 0) {
      console.log(`✅ [Storage] Set to ALL layouts (no junction records)`);
      return;
    }
    
    // Insert new associations
    const values = layoutIds.map(layoutId => ({
      inspectionTypeId,
      layoutId,
    }));
    
    await db.insert(inspectionTypeLayouts).values(values);
    console.log(`✅ [Storage] Created ${values.length} layout associations`);
  }

  async createUploadError(error: { companyId: string | null; driverId: string | null; driverName: string | null; assetId: string | null; rawData: string; errorTrace: string }): Promise<void> {
    console.log(`📝 [Storage] Creating upload error log - company: ${error.companyId}, driver: ${error.driverId}`);
    
    await db.insert(uploadErrors).values({
      companyId: error.companyId,
      driverId: error.driverId,
      driverName: error.driverName,
      assetId: error.assetId,
      rawData: error.rawData,
      errorTrace: error.errorTrace,
    });
    
    console.log(`✅ [Storage] Upload error logged to database`);
  }
}

export const storage = new DatabaseStorage();
