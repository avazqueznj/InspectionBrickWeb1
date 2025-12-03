// Referenced from blueprint:javascript_database
import { companies, inspections, defects, users, assets, inspectionTypes, inspectionTypeFormFields, layouts, layoutZones, layoutZoneComponents, componentDefects, inspectionTypeLayouts, inspectionAssets, uploadErrors, zoneImages, type Company, type Inspection, type InsertInspection, type Defect, type InsertDefect, type InspectionWithDefects, type User, type InsertUser, type UserWithoutPassword, type Asset, type InsertAsset, type InspectionType, type InsertInspectionType, type InspectionTypeFormField, type InsertInspectionTypeFormField, type InspectionTypeWithFormFields, type Layout, type InsertLayout, type LayoutZone, type InsertLayoutZone, type LayoutZoneComponent, type InsertLayoutZoneComponent, type ComponentDefect, type InsertComponentDefect, type InsertInspectionAsset, type ZoneImage } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, ilike, or, sql, and, inArray } from "drizzle-orm";

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
  status?: "open" | "pending" | "repaired" | "not-needed";
}

export interface DefectFilterValues {
  assetIds: string[];
  driverNames: string[];
  zoneNames: string[];
  componentNames: string[];
  severityLevels: ("critical" | "high" | "medium" | "low")[];
  statuses: ("open" | "pending" | "repaired" | "not-needed")[];
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
  authenticateUser(userId: string, companyId: string, password: string): Promise<User | null>;
  getUsers(params?: UserQueryParams): Promise<PaginatedResult<UserWithoutPassword>>;
  getUserFilterValues(companyId?: string): Promise<UserFilterValues>;
  
  // Assets
  getAssets(params?: AssetQueryParams): Promise<PaginatedResult<Asset>>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(assetId: string, asset: Partial<InsertAsset>): Promise<Asset | undefined>;
  getAssetFilterValues(companyId?: string): Promise<AssetFilterValues>;
  
  // Inspection Types
  getInspectionTypes(params?: InspectionTypeQueryParams): Promise<PaginatedResult<InspectionTypeWithFormFields>>;
  getInspectionTypeById(inspectionTypeName: string, companyId?: string): Promise<InspectionTypeWithFormFields | undefined>;
  getInspectionTypeByUUID(id: string): Promise<InspectionTypeWithFormFields | undefined>;
  createInspectionType(inspectionType: InsertInspectionType): Promise<InspectionType>;
  updateInspectionType(inspectionTypeName: string, inspectionType: Partial<InsertInspectionType>): Promise<InspectionType | undefined>;
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
  batchUpdateDefects(ids: string[], updateData: Partial<InsertDefect>, companyId?: string): Promise<Defect[]>;
  deleteDefect(id: string): Promise<boolean>;
  
  // Upload Errors
  createUploadError(error: { companyId: string | null; driverId: string | null; driverName: string | null; assetId: string | null; rawData: string; errorTrace: string }): Promise<void>;
  
  // Layouts
  getLayouts(companyId: string): Promise<Layout[]>;
  getLayoutById(layoutName: string, companyId?: string): Promise<Layout | undefined>;
  getLayoutByUUID(id: string): Promise<Layout | undefined>;
  createLayout(layout: InsertLayout): Promise<Layout>;
  updateLayout(layoutName: string, layout: Partial<InsertLayout>): Promise<Layout | undefined>;
  deleteLayout(id: string): Promise<boolean>;
  
  // Layout Zones  
  getLayoutZones(layoutId: string, companyId?: string): Promise<LayoutZone[]>;
  getLayoutZoneById(id: string, companyId?: string): Promise<LayoutZone | undefined>;
  createLayoutZone(zone: InsertLayoutZone, companyId?: string): Promise<LayoutZone>;
  updateLayoutZone(id: string, zone: Partial<InsertLayoutZone>, companyId?: string): Promise<LayoutZone | undefined>;
  deleteLayoutZone(id: string, companyId?: string): Promise<boolean>;
  
  // Layout Zone Components
  getZoneComponents(zoneId: string, companyId?: string): Promise<LayoutZoneComponent[]>;
  getComponentById(id: string, companyId?: string): Promise<LayoutZoneComponent | undefined>;
  createComponent(component: InsertLayoutZoneComponent, companyId?: string): Promise<LayoutZoneComponent>;
  updateComponent(id: string, component: Partial<InsertLayoutZoneComponent>, companyId?: string): Promise<LayoutZoneComponent | undefined>;
  deleteComponent(id: string, companyId?: string): Promise<boolean>;
  
  // Component Defects
  getComponentDefects(componentId: string, companyId?: string): Promise<ComponentDefect[]>;
  getComponentDefectById(id: string, companyId?: string): Promise<ComponentDefect | undefined>;
  createComponentDefect(defect: InsertComponentDefect, companyId?: string): Promise<ComponentDefect>;
  updateComponentDefect(id: string, defect: Partial<InsertComponentDefect>, companyId?: string): Promise<ComponentDefect | undefined>;
  deleteComponentDefect(id: string, companyId?: string): Promise<boolean>;
  
  // Check if layout has dependent assets
  layoutHasAssets(layoutId: string): Promise<boolean>;
  
  // Inspection Type Layouts (existing methods)
  getInspectionTypeLayouts(inspectionTypeId: string): Promise<string[]>;
  setInspectionTypeLayouts(inspectionTypeId: string, layoutIds: string[]): Promise<void>;
  
  // Zone Images
  getZoneImage(id: string): Promise<ZoneImage | undefined>;
  createZoneImage(imageData: Buffer): Promise<string>;
  deleteZoneImage(id: string): Promise<boolean>;
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
        userTag: users.userTag,
        status: users.status,
        webAccess: users.webAccess,
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

  async authenticateUser(userId: string, companyId: string, password: string): Promise<User | null> {
    console.log(`🔐 [Storage] Authenticating user: ${userId} for company: ${companyId || 'SUPERUSER'}`);
    
    // Look up user by userId and companyId
    // Handle empty string as null for superuser login
    const targetCompanyId = companyId === '' ? null : companyId;
    
    const [user] = await db.select().from(users).where(
      and(
        eq(users.userId, userId),
        targetCompanyId === null ? sql`${users.companyId} IS NULL` : eq(users.companyId, targetCompanyId)
      )
    );
    
    if (!user) {
      console.log(`❌ [Storage] Authentication failed - user not found: ${userId} in company: ${targetCompanyId || 'null (superuser)'}`);
      return null;
    }
    
    // Plain text password comparison for pilot
    const isValid = password === user.password;
    if (!isValid) {
      console.log(`❌ [Storage] Authentication failed - invalid password for user: ${userId}`);
      console.log(`   Expected: ${user.password}, Got: ${password}`);
      return null;
    }
    
    console.log(`✅ [Storage] Authentication successful for user: ${userId} in company: ${targetCompanyId || 'null (superuser)'}`);
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
    
    // Add search conditions - search in assetId, assetName, and layout.layoutName
    if (search) {
      conditions.push(
        or(
          ilike(assets.assetId, `%${search}%`),
          ilike(layouts.layoutName, `%${search}%`),
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
      assetConfig: layouts.layoutName,
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
        layoutName: layouts.layoutName,
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

    // Map results to Asset type with layoutName added
    const data = results.map(r => ({
      id: r.id,
      assetId: r.assetId,
      layout: r.layout,
      assetName: r.assetName,
      status: r.status,
      companyId: r.companyId,
      layoutName: r.layoutName,
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
      sortField = "inspectionTypeName", 
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
        ilike(inspectionTypes.inspectionTypeName, `%${search}%`)
      );
    }
    
    // Add status filter
    if (status) {
      conditions.push(eq(inspectionTypes.status, status));
    }
    
    const whereConditions = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine sort order based on sortField
    const sortColumnMap = {
      inspectionTypeName: inspectionTypes.inspectionTypeName,
      status: inspectionTypes.status,
    };
    
    const sortColumn = sortColumnMap[sortField as keyof typeof sortColumnMap] || inspectionTypes.inspectionTypeName;
    const orderBy = sortDirection === "asc" ? asc(sortColumn) : desc(sortColumn);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inspectionTypes)
      .where(whereConditions);
    const total = countResult[0]?.count || 0;

    // Get paginated data with form fields and layouts
    const offset = (page - 1) * limit;
    const data = await db.query.inspectionTypes.findMany({
      where: whereConditions,
      with: {
        formFields: true,
        layouts: {
          with: {
            layout: true,
          },
        },
      },
      orderBy: [orderBy],
      limit,
      offset,
    });

    // Transform data to include layout details
    const transformedData = data.map(it => {
      const layoutDetails = it.layouts?.map(l => ({
        id: l.layout.id,
        layoutName: l.layout.layoutName,
      })) || [];
      
      const layoutNames = layoutDetails.map(l => l.layoutName).join(", ") || "N/A";
      
      return {
        ...it,
        layouts: layoutDetails,
        layoutNames,
        layoutIds: layoutDetails.map(l => l.id),
        allLayouts: layoutDetails.length === 0,
      };
    });

    console.log(`✅ [Storage] getInspectionTypes - Found ${data.length} of ${total} total inspection types`);
    
    return {
      data: transformedData as InspectionTypeWithFormFields[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getInspectionTypeById(inspectionTypeName: string, companyId?: string): Promise<InspectionTypeWithFormFields | undefined> {
    console.log(`🔍 [Storage] getInspectionTypeById - name: ${inspectionTypeName}, companyId: ${companyId || 'ANY'}`);
    
    // Build where condition: match business name and optionally company ID
    const conditions = [eq(inspectionTypes.inspectionTypeName, inspectionTypeName)];
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
    console.log(`➕ [Storage] Creating inspection type: ${insertInspectionType.inspectionTypeName}, companyId: ${insertInspectionType.companyId}`);
    
    const [inspectionType] = await db
      .insert(inspectionTypes)
      .values(insertInspectionType)
      .returning();
    
    console.log(`✅ [Storage] Inspection type created successfully: ${insertInspectionType.inspectionTypeName}`);
    return inspectionType;
  }

  async updateInspectionType(inspectionTypeName: string, updateData: Partial<InsertInspectionType>): Promise<InspectionType | undefined> {
    console.log(`🔄 [Storage] Updating inspection type: ${inspectionTypeName}`);
    const [inspectionType] = await db
      .update(inspectionTypes)
      .set(updateData)
      .where(eq(inspectionTypes.inspectionTypeName, inspectionTypeName))
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
    
    // Add search conditions (including asset IDs from inspection_assets table)
    if (search) {
      conditions.push(
        or(
          ilike(inspections.inspectionType, `%${search}%`),
          ilike(inspections.driverName, `%${search}%`),
          ilike(inspections.driverId, `%${search}%`),
          sql`EXISTS (
            SELECT 1 FROM ${inspectionAssets}
            WHERE ${inspectionAssets.inspectionId} = ${inspections.id}
            AND ${inspectionAssets.assetId} ILIKE ${'%' + search + '%'}
          )`
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

  async batchUpdateDefects(ids: string[], updateData: Partial<InsertDefect>, companyId?: string): Promise<Defect[]> {
    console.log(`🔄 [Storage] Batch updating ${ids.length} defects${companyId ? ` for company ${companyId}` : ''}`);
    
    // Note: Company scoping validation is done at the route handler level
    // We trust that the route has already verified access to all defects
    const result = await db
      .update(defects)
      .set(updateData)
      .where(inArray(defects.id, ids))
      .returning();
    
    console.log(`✅ [Storage] Updated ${result.length} of ${ids.length} defects`);
    return result;
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
      // Scale: 0-10 where 0 = no defect (audit only), 1-10 = actual defects
      const severityRanges = {
        critical: { min: 8, max: 10 },
        high: { min: 6, max: 7 },
        medium: { min: 4, max: 5 },
        low: { min: 1, max: 3 },
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
    // - severity: DESC → datetime DESC (mechanics prioritize severe defects, then newest inspections first)
    // - assetId: ASC/DESC → zoneName ASC (group by asset, then by zone alphabetically)
    // - other fields: single column sort
    let orderByArray;
    if (sortField === "severity") {
      orderByArray = [
        sortDirection === "asc" ? asc(sortColumn) : desc(sortColumn),
        desc(inspections.datetime)
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
        mechanicName: defects.mechanicName,
        repairDate: defects.repairDate,
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
      mechanicName: row.mechanicName,
      repairDate: row.repairDate,
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
      orderBy: [asc(layouts.layoutName)],
    });
    
    console.log(`✅ [Storage] Found ${result.length} layouts`);
    return result as Layout[];
  }

  async getLayoutById(layoutName: string, companyId?: string): Promise<Layout | undefined> {
    console.log(`🔍 [Storage] getLayoutById - layoutName: ${layoutName}, companyId: ${companyId || 'ANY'}`);
    
    const conditions = [eq(layouts.layoutName, layoutName)];
    if (companyId) {
      conditions.push(eq(layouts.companyId, companyId));
    }
    
    const [result] = await db.select().from(layouts).where(and(...conditions));
    console.log(`${result ? '✅' : '❌'} [Storage] Layout ${result ? 'found' : 'not found'}`);
    return result;
  }

  async getLayoutByUUID(id: string): Promise<Layout | undefined> {
    console.log(`🔍 [Storage] getLayoutByUUID - UUID: ${id}`);
    const [result] = await db.select().from(layouts).where(eq(layouts.id, id));
    console.log(`${result ? '✅' : '❌'} [Storage] Layout ${result ? 'found' : 'not found'}`);
    return result;
  }

  async createLayout(insertLayout: InsertLayout): Promise<Layout> {
    console.log(`➕ [Storage] Creating layout: ${insertLayout.layoutName}, companyId: ${insertLayout.companyId}`);
    
    const [layout] = await db
      .insert(layouts)
      .values(insertLayout)
      .returning();
    
    console.log(`✅ [Storage] Layout created successfully: ${insertLayout.layoutName}`);
    return layout;
  }

  async updateLayout(layoutName: string, updateData: Partial<InsertLayout>): Promise<Layout | undefined> {
    console.log(`🔄 [Storage] Updating layout: ${layoutName}`);
    const [layout] = await db
      .update(layouts)
      .set(updateData)
      .where(eq(layouts.layoutName, layoutName))
      .returning();
    console.log(`${layout ? '✅' : '❌'} [Storage] Layout ${layout ? 'updated' : 'not found'}`);
    return layout;
  }

  async deleteLayout(id: string): Promise<boolean> {
    console.log(`🗑️ [Storage] Deleting layout: ${id}`);
    const result = await db
      .delete(layouts)
      .where(eq(layouts.id, id))
      .returning();
    console.log(`${result.length > 0 ? '✅' : '❌'} [Storage] Layout ${result.length > 0 ? 'deleted' : 'not found'}`);
    return result.length > 0;
  }

  // === LAYOUT ZONES ===

  async getLayoutZones(layoutId: string, companyId?: string): Promise<LayoutZone[]> {
    console.log(`📊 [Storage] getLayoutZones - layoutId: ${layoutId}, companyId: ${companyId || 'ANY'}`);
    
    // Verify layout ownership if companyId provided
    if (companyId) {
      const layout = await this.getLayoutByUUID(layoutId);
      if (!layout || layout.companyId !== companyId) {
        console.log(`❌ [Storage] Layout not found or unauthorized`);
        throw new Error("Layout not found or unauthorized");
      }
    }
    
    const result = await db.select()
      .from(layoutZones)
      .where(eq(layoutZones.layoutId, layoutId))
      .orderBy(asc(layoutZones.zoneName));
    
    console.log(`✅ [Storage] Found ${result.length} zones`);
    return result;
  }

  async getLayoutZoneById(id: string, companyId?: string): Promise<LayoutZone | undefined> {
    console.log(`🔍 [Storage] getLayoutZoneById - id: ${id}, companyId: ${companyId || 'ANY'}`);
    
    const [zone] = await db.select().from(layoutZones).where(eq(layoutZones.id, id));
    
    if (!zone) {
      console.log(`❌ [Storage] Zone not found`);
      return undefined;
    }
    
    // Verify layout ownership if companyId provided
    if (companyId) {
      const layout = await this.getLayoutByUUID(zone.layoutId);
      if (!layout || layout.companyId !== companyId) {
        console.log(`❌ [Storage] Zone found but unauthorized (wrong company)`);
        return undefined;
      }
    }
    
    console.log(`✅ [Storage] Zone found`);
    return zone;
  }

  async createLayoutZone(insertZone: InsertLayoutZone, companyId?: string): Promise<LayoutZone> {
    console.log(`➕ [Storage] Creating zone: ${insertZone.zoneName}, layoutId: ${insertZone.layoutId}, companyId: ${companyId || 'ANY'}`);
    
    // Verify layout ownership if companyId provided
    if (companyId) {
      const layout = await this.getLayoutByUUID(insertZone.layoutId);
      if (!layout || layout.companyId !== companyId) {
        console.log(`❌ [Storage] Layout not found or unauthorized`);
        throw new Error("Layout not found or unauthorized");
      }
    }
    
    const [zone] = await db
      .insert(layoutZones)
      .values(insertZone)
      .returning();
    
    console.log(`✅ [Storage] Zone created successfully: ${insertZone.zoneName}`);
    return zone;
  }

  async updateLayoutZone(id: string, updateData: Partial<InsertLayoutZone>, companyId?: string): Promise<LayoutZone | undefined> {
    console.log(`🔄 [Storage] Updating zone: ${id}, companyId: ${companyId || 'ANY'}`);
    
    // Verify zone ownership if companyId provided
    const existingZone = await this.getLayoutZoneById(id, companyId);
    if (!existingZone) {
      console.log(`❌ [Storage] Zone not found or unauthorized`);
      return undefined;
    }
    
    const [zone] = await db
      .update(layoutZones)
      .set(updateData)
      .where(eq(layoutZones.id, id))
      .returning();
    
    console.log(`${zone ? '✅' : '❌'} [Storage] Zone ${zone ? 'updated' : 'not found'}`);
    return zone;
  }

  async deleteLayoutZone(id: string, companyId?: string): Promise<boolean> {
    console.log(`🗑️ [Storage] Deleting zone: ${id}, companyId: ${companyId || 'ANY'}`);
    
    // Verify zone ownership if companyId provided
    const zone = await this.getLayoutZoneById(id, companyId);
    if (!zone) {
      console.log(`❌ [Storage] Zone not found or unauthorized`);
      return false;
    }
    
    // Store imageId before deletion for cleanup
    const imageIdToDelete = zone.imageId;
    
    const result = await db
      .delete(layoutZones)
      .where(eq(layoutZones.id, id))
      .returning();
    
    // Cascade delete the associated image if it exists
    if (result.length > 0 && imageIdToDelete) {
      console.log(`🗑️ [Storage] Cascade deleting zone image: ${imageIdToDelete}`);
      await this.deleteZoneImage(imageIdToDelete);
    }
    
    console.log(`${result.length > 0 ? '✅' : '❌'} [Storage] Zone ${result.length > 0 ? 'deleted' : 'not found'}`);
    return result.length > 0;
  }

  // === LAYOUT ZONE COMPONENTS ===

  async getZoneComponents(zoneId: string, companyId?: string): Promise<LayoutZoneComponent[]> {
    console.log(`📊 [Storage] getZoneComponents - zoneId: ${zoneId}, companyId: ${companyId || 'ANY'}`);
    
    // Verify zone ownership if companyId provided
    if (companyId) {
      const zone = await this.getLayoutZoneById(zoneId, companyId);
      if (!zone) {
        console.log(`❌ [Storage] Zone not found or unauthorized`);
        throw new Error("Zone not found or unauthorized");
      }
    }
    
    const result = await db.select()
      .from(layoutZoneComponents)
      .where(eq(layoutZoneComponents.zoneId, zoneId))
      .orderBy(asc(layoutZoneComponents.componentName));
    
    console.log(`✅ [Storage] Found ${result.length} components`);
    return result;
  }

  async getComponentById(id: string, companyId?: string): Promise<LayoutZoneComponent | undefined> {
    console.log(`🔍 [Storage] getComponentById - id: ${id}, companyId: ${companyId || 'ANY'}`);
    
    const [component] = await db.select().from(layoutZoneComponents).where(eq(layoutZoneComponents.id, id));
    
    if (!component) {
      console.log(`❌ [Storage] Component not found`);
      return undefined;
    }
    
    // Verify zone ownership if companyId provided
    if (companyId) {
      const zone = await this.getLayoutZoneById(component.zoneId, companyId);
      if (!zone) {
        console.log(`❌ [Storage] Component found but unauthorized (wrong company)`);
        return undefined;
      }
    }
    
    console.log(`✅ [Storage] Component found`);
    return component;
  }

  async createComponent(insertComponent: InsertLayoutZoneComponent, companyId?: string): Promise<LayoutZoneComponent> {
    console.log(`➕ [Storage] Creating component: ${insertComponent.componentName}, zoneId: ${insertComponent.zoneId}, companyId: ${companyId || 'ANY'}`);
    
    // Verify zone ownership if companyId provided
    if (companyId) {
      const zone = await this.getLayoutZoneById(insertComponent.zoneId, companyId);
      if (!zone) {
        console.log(`❌ [Storage] Zone not found or unauthorized`);
        throw new Error("Zone not found or unauthorized");
      }
    }
    
    const [component] = await db
      .insert(layoutZoneComponents)
      .values(insertComponent)
      .returning();
    
    console.log(`✅ [Storage] Component created successfully: ${insertComponent.componentName}`);
    return component;
  }

  async updateComponent(id: string, updateData: Partial<InsertLayoutZoneComponent>, companyId?: string): Promise<LayoutZoneComponent | undefined> {
    console.log(`🔄 [Storage] Updating component: ${id}, companyId: ${companyId || 'ANY'}`);
    
    // Verify component ownership if companyId provided
    const existingComponent = await this.getComponentById(id, companyId);
    if (!existingComponent) {
      console.log(`❌ [Storage] Component not found or unauthorized`);
      return undefined;
    }
    
    const [component] = await db
      .update(layoutZoneComponents)
      .set(updateData)
      .where(eq(layoutZoneComponents.id, id))
      .returning();
    
    console.log(`${component ? '✅' : '❌'} [Storage] Component ${component ? 'updated' : 'not found'}`);
    return component;
  }

  async deleteComponent(id: string, companyId?: string): Promise<boolean> {
    console.log(`🗑️ [Storage] Deleting component: ${id}, companyId: ${companyId || 'ANY'}`);
    
    // Verify component ownership if companyId provided
    const component = await this.getComponentById(id, companyId);
    if (!component) {
      console.log(`❌ [Storage] Component not found or unauthorized`);
      return false;
    }
    
    const result = await db
      .delete(layoutZoneComponents)
      .where(eq(layoutZoneComponents.id, id))
      .returning();
    
    console.log(`${result.length > 0 ? '✅' : '❌'} [Storage] Component ${result.length > 0 ? 'deleted' : 'not found'}`);
    return result.length > 0;
  }

  // === COMPONENT DEFECTS ===

  async getComponentDefects(componentId: string, companyId?: string): Promise<ComponentDefect[]> {
    console.log(`📊 [Storage] getComponentDefects - componentId: ${componentId}, companyId: ${companyId || 'ANY'}`);
    
    // Verify component ownership if companyId provided
    if (companyId) {
      const component = await this.getComponentById(componentId, companyId);
      if (!component) {
        console.log(`❌ [Storage] Component not found or unauthorized`);
        throw new Error("Component not found or unauthorized");
      }
    }
    
    const result = await db.select()
      .from(componentDefects)
      .where(eq(componentDefects.componentId, componentId))
      .orderBy(asc(componentDefects.defectName));
    
    console.log(`✅ [Storage] Found ${result.length} defects`);
    return result;
  }

  async getComponentDefectById(id: string, companyId?: string): Promise<ComponentDefect | undefined> {
    console.log(`🔍 [Storage] getComponentDefectById - id: ${id}, companyId: ${companyId || 'ANY'}`);
    
    const [defect] = await db.select().from(componentDefects).where(eq(componentDefects.id, id));
    
    if (!defect) {
      console.log(`❌ [Storage] Component defect not found`);
      return undefined;
    }
    
    // Verify component ownership if companyId provided
    if (companyId) {
      const component = await this.getComponentById(defect.componentId, companyId);
      if (!component) {
        console.log(`❌ [Storage] Defect found but unauthorized (wrong company)`);
        return undefined;
      }
    }
    
    console.log(`✅ [Storage] Component defect found`);
    return defect;
  }

  async createComponentDefect(insertDefect: InsertComponentDefect, companyId?: string): Promise<ComponentDefect> {
    console.log(`➕ [Storage] Creating component defect: ${insertDefect.defectName}, componentId: ${insertDefect.componentId}, companyId: ${companyId || 'ANY'}`);
    
    // Verify component ownership if companyId provided
    if (companyId) {
      const component = await this.getComponentById(insertDefect.componentId, companyId);
      if (!component) {
        console.log(`❌ [Storage] Component not found or unauthorized`);
        throw new Error("Component not found or unauthorized");
      }
    }
    
    const [defect] = await db
      .insert(componentDefects)
      .values(insertDefect)
      .returning();
    
    console.log(`✅ [Storage] Component defect created successfully: ${insertDefect.defectName}`);
    return defect;
  }

  async updateComponentDefect(id: string, updateData: Partial<InsertComponentDefect>, companyId?: string): Promise<ComponentDefect | undefined> {
    console.log(`🔄 [Storage] Updating component defect: ${id}, companyId: ${companyId || 'ANY'}`);
    
    // Verify defect ownership if companyId provided
    const existingDefect = await this.getComponentDefectById(id, companyId);
    if (!existingDefect) {
      console.log(`❌ [Storage] Component defect not found or unauthorized`);
      return undefined;
    }
    
    const [defect] = await db
      .update(componentDefects)
      .set(updateData)
      .where(eq(componentDefects.id, id))
      .returning();
    
    console.log(`${defect ? '✅' : '❌'} [Storage] Component defect ${defect ? 'updated' : 'not found'}`);
    return defect;
  }

  async deleteComponentDefect(id: string, companyId?: string): Promise<boolean> {
    console.log(`🗑️ [Storage] Deleting component defect: ${id}, companyId: ${companyId || 'ANY'}`);
    
    // Verify defect ownership if companyId provided
    const defect = await this.getComponentDefectById(id, companyId);
    if (!defect) {
      console.log(`❌ [Storage] Component defect not found or unauthorized`);
      return false;
    }
    
    const result = await db
      .delete(componentDefects)
      .where(eq(componentDefects.id, id))
      .returning();
    
    console.log(`${result.length > 0 ? '✅' : '❌'} [Storage] Component defect ${result.length > 0 ? 'deleted' : 'not found'}`);
    return result.length > 0;
  }

  async layoutHasAssets(layoutId: string): Promise<boolean> {
    console.log(`🔍 [Storage] layoutHasAssets - layoutId: ${layoutId}`);
    
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(assets)
      .where(eq(assets.layout, layoutId));
    
    const count = result[0]?.count || 0;
    console.log(`${count > 0 ? '⚠️' : '✅'} [Storage] Layout has ${count} dependent assets`);
    return count > 0;
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

  async getZoneImage(id: string): Promise<ZoneImage | undefined> {
    console.log(`🖼️ [Storage] Fetching zone image: ${id}`);
    
    const results = await db
      .select()
      .from(zoneImages)
      .where(eq(zoneImages.id, id))
      .limit(1);
    
    if (results.length === 0) {
      console.log(`❌ [Storage] Zone image not found: ${id}`);
      return undefined;
    }
    
    console.log(`✅ [Storage] Zone image found: ${id} (${results[0].imageData.length} bytes)`);
    return results[0];
  }

  async createZoneImage(imageData: Buffer): Promise<string> {
    const id = crypto.randomUUID();
    console.log(`🖼️ [Storage] Creating zone image with UUID: ${id} (${imageData.length} bytes)`);
    
    await db.insert(zoneImages).values({
      id,
      imageData,
    });
    
    console.log(`✅ [Storage] Zone image created: ${id}`);
    return id;
  }

  async deleteZoneImage(id: string): Promise<boolean> {
    console.log(`🗑️ [Storage] Deleting zone image: ${id}`);
    
    const result = await db
      .delete(zoneImages)
      .where(eq(zoneImages.id, id))
      .returning({ id: zoneImages.id });
    
    if (result.length === 0) {
      console.log(`❌ [Storage] Zone image not found for deletion: ${id}`);
      return false;
    }
    
    console.log(`✅ [Storage] Zone image deleted: ${id}`);
    return true;
  }
}

export const storage = new DatabaseStorage();
