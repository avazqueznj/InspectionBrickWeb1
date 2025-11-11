import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertInspectionSchema, insertDefectSchema, insertUserSchema, insertAssetSchema, insertInspectionTypeSchema, insertInspectionTypeFormFieldSchema } from "@shared/schema";
import { z } from "zod";
import { parseBrickInspection } from "./brickParser";

// Authentication middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Query params validation schema
  const queryParamsSchema = z.object({
    companyId: z.string().optional(),
    search: z.string().optional(),
    sortField: z.enum(["datetime", "inspectionType", "assetId", "driverName"]).optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    // Filter parameters
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    inspectionType: z.string().optional(),
    assetId: z.string().optional(),
    driverName: z.string().optional(),
    driverId: z.string().optional(),
  });

  // User query params validation schema
  const userQueryParamsSchema = z.object({
    companyId: z.string().optional(),
    search: z.string().optional(),
    sortField: z.enum(["userId", "userFullName", "status"]).optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  });

  // Asset query params validation schema
  const assetQueryParamsSchema = z.object({
    companyId: z.string().optional(),
    search: z.string().optional(),
    sortField: z.enum(["assetId", "assetConfig", "assetName", "status"]).optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  });

  // Inspection Type query params validation schema
  const inspectionTypeQueryParamsSchema = z.object({
    companyId: z.string().optional(),
    search: z.string().optional(),
    sortField: z.enum(["inspectionTypeId", "inspectionLayout", "status"]).optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  });

  // Defect query params validation schema
  const defectQueryParamsSchema = z.object({
    companyId: z.string().optional(),
    search: z.string().optional(),
    sortField: z.enum(["datetime", "assetId", "driverName", "zoneName", "componentName", "defect", "severity", "status"]).optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    // Filter parameters
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    assetId: z.string().optional(),
    driverName: z.string().optional(),
    zoneName: z.string().optional(),
    componentName: z.string().optional(),
    severityLevel: z.enum(["critical", "high", "medium", "low"]).optional(),
    status: z.enum(["open", "pending", "repaired"]).optional(),
  });

  // Login schema
  const loginSchema = z.object({
    userId: z.string().min(1),
    password: z.string().min(1),
  });

  // Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    console.log(`🔐 [Routes] POST /api/auth/login - Attempting login for user: ${req.body?.userId || 'UNKNOWN'}`);
    
    try {
      const { userId, password } = loginSchema.parse(req.body);
      console.log(`✅ [Routes] Login request validated - userId: ${userId}`);
      
      const user = await storage.authenticateUser(userId, password);
      
      if (!user) {
        console.log(`❌ [Routes] Login failed - Invalid credentials for user: ${userId}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Set session
      req.session.userId = user.userId;
      req.session.companyId = user.companyId;
      console.log(`✅ [Routes] Session created - userId: ${user.userId}, companyId: ${user.companyId || 'null (superuser)'}`);
      
      // Return user info (without password)
      res.json({
        userId: user.userId,
        companyId: user.companyId,
      });
      console.log(`✅ [Routes] Login successful for user: ${userId}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log(`❌ [Routes] Login validation error:`, error.errors);
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("❌ [Routes] Error during login:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Device: Upload inspection (no authentication required for device)
  app.post("/api/device/inspections", async (req, res) => {
    console.log(`📱 [Routes] POST /api/device/inspections - Receiving inspection data from device`);
    
    let rawData: string = '';
    let parsed: any = null;
    
    try {
      if (typeof req.body === 'string') {
        rawData = req.body;
      } else if (Buffer.isBuffer(req.body)) {
        rawData = req.body.toString('utf-8');
      } else {
        console.error("❌ [Routes] Invalid request body type:", typeof req.body);
        return res.status(400).json({ error: "Request body must be plain text" });
      }

      console.log(`📋 [Routes] Parsing BRICKINSPECTION data (${rawData.length} bytes)`);
      parsed = parseBrickInspection(rawData);
      console.log(`✅ [Routes] Parsed inspection: ${parsed.inspectionId} for company ${parsed.companyId}`);

      const formFieldsJson = JSON.stringify(parsed.formFields);
      const primaryAssetId = parsed.assets.length > 0 ? parsed.assets[0].assetId : "UNKNOWN";

      const inspectionData = {
        id: parsed.inspectionId,
        companyId: parsed.companyId,
        datetime: parsed.inspSubmitTimeUtc,
        inspectionType: parsed.inspectionType,
        assetId: primaryAssetId,
        driverName: parsed.driverName,
        driverId: parsed.driverId,
        inspectionFormData: formFieldsJson,
        inspStartTimeUtc: parsed.inspStartTimeUtc,
        inspSubmitTimeUtc: parsed.inspSubmitTimeUtc,
        inspTimeOffset: parsed.inspTimeOffset,
        inspTimeDst: parsed.inspTimeDst,
      };

      const existingInspection = await storage.getInspection(parsed.inspectionId);
      if (existingInspection) {
        console.log(`⚠️  [Routes] Inspection ${parsed.inspectionId} already exists, rejecting duplicate`);
        return res.status(409).json({ 
          error: "Duplicate inspection ID",
          message: `Inspection with ID ${parsed.inspectionId} already exists` 
        });
      }

      console.log(`💾 [Routes] Creating inspection record`);
      const inspection = await storage.createInspection(inspectionData);
      console.log(`✅ [Routes] Inspection created: ${inspection.id}`);

      const allDefectsToCreate = [
        ...parsed.checks.map(check => ({
          inspectionId: inspection.id,
          zoneId: check.zoneId,
          zoneName: `Zone ${check.zoneId}`,
          componentName: check.componentName,
          defect: check.defectType,
          severity: check.severity,
          inspectedAtUtc: check.inspectedAtUtc,
          driverNotes: check.notes,
          status: "open" as const,
          repairNotes: null,
        })),
        ...parsed.defects.map(defect => ({
          inspectionId: inspection.id,
          zoneId: defect.zoneId,
          zoneName: `Zone ${defect.zoneId}`,
          componentName: defect.componentName,
          defect: defect.defectType,
          severity: defect.severity,
          inspectedAtUtc: defect.inspectedAtUtc,
          driverNotes: defect.notes,
          status: "open" as const,
          repairNotes: null,
        })),
      ];

      console.log(`💾 [Routes] Creating ${allDefectsToCreate.length} defect/check records`);
      for (const defectData of allDefectsToCreate) {
        await storage.createDefect(defectData);
      }
      console.log(`✅ [Routes] All defects/checks created`);

      res.status(201).json({
        success: true,
        inspectionId: inspection.id,
        defectsCreated: allDefectsToCreate.length,
      });
      console.log(`✅ [Routes] Device inspection upload complete: ${inspection.id}`);
    } catch (error) {
      console.error("❌ [Routes] Error uploading device inspection:", error);
      
      const errorStack = error instanceof Error ? error.stack || error.message : String(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      try {
        await storage.createUploadError({
          companyId: parsed?.companyId || null,
          driverId: parsed?.driverId || null,
          driverName: parsed?.driverName || null,
          assetId: parsed?.assets?.[0]?.assetId || null,
          rawData: rawData.substring(0, 10000),
          errorTrace: errorStack,
        });
        console.log(`📝 [Routes] Error logged to upload_errors table`);
      } catch (logError) {
        console.error("❌ [Routes] Failed to log upload error to database:", logError);
      }
      
      return res.status(400).json({ 
        error: "Failed to parse or store inspection data",
        message: errorMessage,
        stack: errorStack
      });
    }
  });

  // Auth: Logout
  app.post("/api/auth/logout", (req, res) => {
    const userId = req.session.userId;
    console.log(`🚪 [Routes] POST /api/auth/logout - User: ${userId || 'UNKNOWN'}`);
    
    req.session.destroy((err) => {
      if (err) {
        console.error("❌ [Routes] Error during logout:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      console.log(`✅ [Routes] Logout successful for user: ${userId}`);
      res.json({ success: true });
    });
  });

  // Auth: Get current user
  app.get("/api/auth/me", async (req, res) => {
    console.log(`👤 [Routes] GET /api/auth/me - Session userId: ${req.session.userId || 'NONE'}`);
    
    if (!req.session.userId) {
      console.log(`❌ [Routes] Not authenticated - No session`);
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        console.log(`❌ [Routes] User not found in database - destroying session`);
        req.session.destroy(() => {});
        return res.status(401).json({ error: "User not found" });
      }
      
      console.log(`✅ [Routes] Current user retrieved: ${user.userId}`);
      res.json({
        userId: user.userId,
        companyId: user.companyId,
      });
    } catch (error) {
      console.error("❌ [Routes] Error fetching current user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Get all companies (protected)
  app.get("/api/companies", requireAuth, async (req, res) => {
    console.log(`🏢 [Routes] GET /api/companies - User: ${req.session.userId}, CompanyId: ${req.session.companyId || 'null (superuser)'}`);
    
    try {
      const companies = await storage.getCompanies();
      
      // If user has a specific company, only return that company
      if (req.session.companyId) {
        console.log(`🔒 [Routes] Filtering to single company: ${req.session.companyId}`);
        const filteredCompanies = companies.filter(c => c.id === req.session.companyId);
        res.json(filteredCompanies);
      } else {
        // Superuser (avazquez) sees all companies
        console.log(`👑 [Routes] Superuser - returning all ${companies.length} companies`);
        res.json(companies);
      }
    } catch (error) {
      console.error("❌ [Routes] Error fetching companies:", error);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  // === USER ROUTES ===

  // Get available filter values for users (protected)
  app.get("/api/users/filter-values", requireAuth, async (req, res) => {
    console.log(`🔍 [Routes] GET /api/users/filter-values - User: ${req.session.userId}`);
    
    try {
      // Enforce company scoping: use session's companyId unless user is superuser
      const companyId = req.session.companyId || (req.query.companyId as string | undefined);
      
      if (req.session.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping for user filter values - Company: ${req.session.companyId}`);
      } else {
        console.log(`👑 [Routes] Superuser access - getting user filter values for company: ${companyId || 'ALL'}`);
      }
      
      const filterValues = await storage.getUserFilterValues(companyId);
      res.json(filterValues);
    } catch (error) {
      console.error("❌ [Routes] Error fetching user filter values:", error);
      res.status(500).json({ error: "Failed to fetch user filter values" });
    }
  });

  // Get all users (protected)
  app.get("/api/users", requireAuth, async (req, res) => {
    console.log(`👥 [Routes] GET /api/users - User: ${req.session.userId}, Requested companyId: ${req.query.companyId || 'NONE'}`);
    
    try {
      const params = userQueryParamsSchema.parse(req.query);
      
      // Enforce company scoping
      if (req.session.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping - User restricted to: ${req.session.companyId}`);
        params.companyId = req.session.companyId;
      } else {
        console.log(`👑 [Routes] Superuser access - allowing companyId: ${params.companyId || 'ALL'}`);
      }
      
      const result = await storage.getUsers(params);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("❌ [Routes] Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Create a new user (protected)
  app.post("/api/users", requireAuth, async (req, res) => {
    console.log(`➕ [Routes] POST /api/users - Creating user: ${req.body?.userId || 'UNKNOWN'}`);
    
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Enforce company scoping: non-superusers can only create users in their own company
      if (req.session.companyId && userData.companyId !== req.session.companyId) {
        console.log(`❌ [Routes] Authorization failed - User can only create users in their own company`);
        return res.status(403).json({ error: "Cannot create users in other companies" });
      }
      
      const user = await storage.createUser(userData);
      console.log(`✅ [Routes] User created successfully: ${user.userId}`);
      
      // Return user without password
      res.json({
        userId: user.userId,
        userFullName: user.userFullName,
        status: user.status,
        companyId: user.companyId,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log(`❌ [Routes] User validation error:`, error.errors);
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("❌ [Routes] Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Update a user (protected)
  app.patch("/api/users/:userId", requireAuth, async (req, res) => {
    const { userId } = req.params;
    console.log(`🔄 [Routes] PATCH /api/users/${userId} - Updating user`);
    
    try {
      const updateData = insertUserSchema.partial().parse(req.body);
      
      // Get the existing user to check authorization
      const existingUser = await storage.getUserById(userId);
      if (!existingUser) {
        console.log(`❌ [Routes] User not found: ${userId}`);
        return res.status(404).json({ error: "User not found" });
      }
      
      // Enforce company scoping
      if (req.session.companyId && existingUser.companyId !== req.session.companyId) {
        console.log(`❌ [Routes] Authorization failed - Cannot update user from another company`);
        return res.status(403).json({ error: "Cannot update users from other companies" });
      }
      
      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      console.log(`✅ [Routes] User updated successfully: ${userId}`);
      
      // Return user without password
      res.json({
        userId: updatedUser.userId,
        userFullName: updatedUser.userFullName,
        status: updatedUser.status,
        companyId: updatedUser.companyId,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("❌ [Routes] Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Delete a user (protected)
  app.delete("/api/users/:userId", requireAuth, async (req, res) => {
    const { userId } = req.params;
    console.log(`🗑️ [Routes] DELETE /api/users/${userId}`);
    
    try {
      // Get the existing user to check authorization
      const existingUser = await storage.getUserById(userId);
      if (!existingUser) {
        console.log(`❌ [Routes] User not found: ${userId}`);
        return res.status(404).json({ error: "User not found" });
      }
      
      // Enforce company scoping
      if (req.session.companyId && existingUser.companyId !== req.session.companyId) {
        console.log(`❌ [Routes] Authorization failed - Cannot delete user from another company`);
        return res.status(403).json({ error: "Cannot delete users from other companies" });
      }
      
      // Prevent self-deletion
      if (userId === req.session.userId) {
        console.log(`❌ [Routes] Cannot delete own user account`);
        return res.status(400).json({ error: "Cannot delete your own user account" });
      }
      
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }
      
      console.log(`✅ [Routes] User deleted successfully: ${userId}`);
      res.json({ success: true });
    } catch (error) {
      console.error("❌ [Routes] Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // === ASSET ROUTES ===

  // Get available filter values for assets (protected)
  app.get("/api/assets/filter-values", requireAuth, async (req, res) => {
    console.log(`🔍 [Routes] GET /api/assets/filter-values - User: ${req.session.userId}`);
    
    try {
      // Enforce company scoping: use session's companyId unless user is superuser
      const companyId = req.session.companyId || (req.query.companyId as string | undefined);
      
      if (req.session.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping for asset filter values - Company: ${req.session.companyId}`);
      } else {
        console.log(`👑 [Routes] Superuser access - getting asset filter values for company: ${companyId || 'ALL'}`);
      }
      
      const filterValues = await storage.getAssetFilterValues(companyId);
      res.json(filterValues);
    } catch (error) {
      console.error("❌ [Routes] Error fetching asset filter values:", error);
      res.status(500).json({ error: "Failed to fetch asset filter values" });
    }
  });

  // Get all assets (protected)
  app.get("/api/assets", requireAuth, async (req, res) => {
    console.log(`📦 [Routes] GET /api/assets - User: ${req.session.userId}, Requested companyId: ${req.query.companyId || 'NONE'}`);
    
    try {
      const params = assetQueryParamsSchema.parse(req.query);
      
      // Enforce company scoping
      if (req.session.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping - User restricted to: ${req.session.companyId}`);
        params.companyId = req.session.companyId;
      } else {
        console.log(`👑 [Routes] Superuser access - allowing companyId: ${params.companyId || 'ALL'}`);
      }
      
      const result = await storage.getAssets(params);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("❌ [Routes] Error fetching assets:", error);
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  // Create a new asset (protected)
  app.post("/api/assets", requireAuth, async (req, res) => {
    console.log(`➕ [Routes] POST /api/assets - Creating asset: ${req.body?.assetId || 'UNKNOWN'}`);
    
    try {
      const assetData = insertAssetSchema.parse(req.body);
      
      // Enforce company scoping: non-superusers must create assets in their own company
      if (req.session.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping - Asset will be created in: ${req.session.companyId}`);
        assetData.companyId = req.session.companyId;
      }
      
      // Additional check: if no session company and submitted company is different, reject
      if (!req.session.companyId && !assetData.companyId) {
        console.log(`❌ [Routes] Cannot create asset without company ID`);
        return res.status(400).json({ error: "Company ID is required" });
      }
      
      const asset = await storage.createAsset(assetData);
      console.log(`✅ [Routes] Asset created successfully: ${asset.assetId}`);
      
      res.json(asset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log(`❌ [Routes] Asset validation error:`, error.errors);
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("❌ [Routes] Error creating asset:", error);
      res.status(500).json({ error: "Failed to create asset" });
    }
  });

  // Update an asset (protected)
  app.patch("/api/assets/:assetId", requireAuth, async (req, res) => {
    const { assetId } = req.params;
    console.log(`🔄 [Routes] PATCH /api/assets/${assetId} - Updating asset`);
    
    try {
      const updateData = insertAssetSchema.partial().parse(req.body);
      
      // Get the existing asset to check authorization (fetch all assets to avoid pagination issues)
      const existingAssets = await storage.getAssets({ 
        companyId: req.session.companyId || undefined,
        limit: 10000 // Large limit to get all assets for authorization check
      });
      const existingAsset = existingAssets.data.find(a => a.assetId === assetId);
      
      if (!existingAsset) {
        console.log(`❌ [Routes] Asset not found: ${assetId}`);
        return res.status(404).json({ error: "Asset not found" });
      }
      
      // Enforce company scoping
      if (req.session.companyId && existingAsset.companyId !== req.session.companyId) {
        console.log(`❌ [Routes] Authorization failed - Cannot update asset from another company`);
        return res.status(403).json({ error: "Cannot update assets from other companies" });
      }
      
      const updatedAsset = await storage.updateAsset(assetId, updateData);
      if (!updatedAsset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      
      console.log(`✅ [Routes] Asset updated successfully: ${assetId}`);
      res.json(updatedAsset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("❌ [Routes] Error updating asset:", error);
      res.status(500).json({ error: "Failed to update asset" });
    }
  });

  // === LAYOUT ROUTES ===

  // Get all layouts for a company (protected)
  app.get("/api/layouts", requireAuth, async (req, res) => {
    console.log(`📋 [Routes] GET /api/layouts - User: ${req.session.userId}`);
    
    try {
      const companyId = req.session.companyId || (req.query.companyId as string);
      
      if (!companyId) {
        console.log(`❌ [Routes] Company ID is required`);
        return res.status(400).json({ error: "Company ID is required" });
      }
      
      // Enforce company scoping for non-superusers
      if (req.session.companyId && req.session.companyId !== companyId) {
        console.log(`❌ [Routes] Authorization failed - Cannot access layouts from another company`);
        return res.status(403).json({ error: "Cannot access layouts from other companies" });
      }
      
      const layouts = await storage.getLayouts(companyId);
      console.log(`✅ [Routes] Returning ${layouts.length} layouts`);
      res.json(layouts);
    } catch (error) {
      console.error("❌ [Routes] Error fetching layouts:", error);
      res.status(500).json({ error: "Failed to fetch layouts" });
    }
  });

  // === INSPECTION TYPE ROUTES ===

  // Get available filter values for inspection types (protected)
  app.get("/api/inspection-types/filter-values", requireAuth, async (req, res) => {
    console.log(`🔍 [Routes] GET /api/inspection-types/filter-values - User: ${req.session.userId}`);
    
    try {
      const companyId = req.session.companyId || (req.query.companyId as string | undefined);
      
      if (req.session.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping for inspection type filter values - Company: ${req.session.companyId}`);
      } else {
        console.log(`👑 [Routes] Superuser access - getting inspection type filter values for company: ${companyId || 'ALL'}`);
      }
      
      const filterValues = await storage.getInspectionTypeFilterValues(companyId);
      res.json(filterValues);
    } catch (error) {
      console.error("❌ [Routes] Error fetching inspection type filter values:", error);
      res.status(500).json({ error: "Failed to fetch inspection type filter values" });
    }
  });

  // Get all inspection types (protected)
  app.get("/api/inspection-types", requireAuth, async (req, res) => {
    console.log(`📋 [Routes] GET /api/inspection-types - User: ${req.session.userId}, Requested companyId: ${req.query.companyId || 'NONE'}`);
    
    try {
      const params = inspectionTypeQueryParamsSchema.parse(req.query);
      
      // Enforce company scoping
      if (req.session.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping - User restricted to: ${req.session.companyId}`);
        params.companyId = req.session.companyId;
      } else {
        console.log(`👑 [Routes] Superuser access - allowing companyId: ${params.companyId || 'ALL'}`);
      }
      
      const result = await storage.getInspectionTypes(params);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("❌ [Routes] Error fetching inspection types:", error);
      res.status(500).json({ error: "Failed to fetch inspection types" });
    }
  });

  // Get a single inspection type with form fields (protected)
  app.get("/api/inspection-types/:inspectionTypeId", requireAuth, async (req, res) => {
    const { inspectionTypeId } = req.params;
    console.log(`🔍 [Routes] GET /api/inspection-types/${inspectionTypeId} - User: ${req.session.userId}`);
    
    try {
      // Pass companyId to ensure we get the right inspection type when business IDs are shared across companies
      const companyId = req.session.companyId || undefined;
      const inspectionType = await storage.getInspectionTypeById(inspectionTypeId, companyId);
      
      if (!inspectionType) {
        console.log(`❌ [Routes] Inspection type not found: ${inspectionTypeId}`);
        return res.status(404).json({ error: "Inspection type not found" });
      }
      
      // Enforce company scoping (already filtered by getInspectionTypeById, but double-check for superusers)
      if (req.session.companyId && inspectionType.companyId !== req.session.companyId) {
        console.log(`❌ [Routes] Authorization failed - Cannot access inspection type from another company`);
        return res.status(403).json({ error: "Cannot access inspection types from other companies" });
      }
      
      console.log(`✅ [Routes] Inspection type found: ${inspectionTypeId}`);
      res.json(inspectionType);
    } catch (error) {
      console.error("❌ [Routes] Error fetching inspection type:", error);
      res.status(500).json({ error: "Failed to fetch inspection type" });
    }
  });

  // Create a new inspection type (protected)
  app.post("/api/inspection-types", requireAuth, async (req, res) => {
    console.log(`➕ [Routes] POST /api/inspection-types - Creating inspection type: ${req.body?.inspectionTypeId || 'UNKNOWN'}`);
    
    try {
      const { layoutIds, ...inspectionTypeBody } = req.body;
      const inspectionTypeData = insertInspectionTypeSchema.parse(inspectionTypeBody);
      
      // Enforce company scoping: non-superusers must create inspection types in their own company
      if (req.session.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping - Inspection type will be created in: ${req.session.companyId}`);
        inspectionTypeData.companyId = req.session.companyId;
      }
      
      if (!inspectionTypeData.companyId) {
        console.log(`❌ [Routes] Cannot create inspection type without company ID`);
        return res.status(400).json({ error: "Company ID is required" });
      }
      
      const inspectionType = await storage.createInspectionType(inspectionTypeData);
      console.log(`✅ [Routes] Inspection type created successfully: ${inspectionType.inspectionTypeId}`);
      
      // Handle layout associations (empty array = all layouts)
      if (layoutIds !== undefined) {
        const layoutIdsArray = Array.isArray(layoutIds) ? layoutIds : [];
        await storage.setInspectionTypeLayouts(inspectionType.id, layoutIdsArray);
        console.log(`✅ [Routes] Layout associations set: ${layoutIdsArray.length === 0 ? 'ALL' : layoutIdsArray.length} layout(s)`);
      }
      
      res.json(inspectionType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log(`❌ [Routes] Inspection type validation error:`, error.errors);
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("❌ [Routes] Error creating inspection type:", error);
      res.status(500).json({ error: "Failed to create inspection type" });
    }
  });

  // Update an inspection type (protected)
  app.patch("/api/inspection-types/:inspectionTypeId", requireAuth, async (req, res) => {
    const { inspectionTypeId } = req.params;
    console.log(`🔄 [Routes] PATCH /api/inspection-types/${inspectionTypeId} - Updating inspection type`);
    
    try {
      const { layoutIds, ...inspectionTypeBody } = req.body;
      const updateData = insertInspectionTypeSchema.partial().parse(inspectionTypeBody);
      
      // Get the existing inspection type to check authorization (use companyId for proper scoping)
      const companyId = req.session.companyId || undefined;
      const existingInspectionType = await storage.getInspectionTypeById(inspectionTypeId, companyId);
      
      if (!existingInspectionType) {
        console.log(`❌ [Routes] Inspection type not found: ${inspectionTypeId}`);
        return res.status(404).json({ error: "Inspection type not found" });
      }
      
      // Enforce company scoping (already filtered by getInspectionTypeById, but double-check for superusers)
      if (req.session.companyId && existingInspectionType.companyId !== req.session.companyId) {
        console.log(`❌ [Routes] Authorization failed - Cannot update inspection type from another company`);
        return res.status(403).json({ error: "Cannot update inspection types from other companies" });
      }
      
      const updatedInspectionType = await storage.updateInspectionType(inspectionTypeId, updateData);
      if (!updatedInspectionType) {
        return res.status(404).json({ error: "Inspection type not found" });
      }
      
      // Handle layout associations (empty array = all layouts)
      if (layoutIds !== undefined) {
        const layoutIdsArray = Array.isArray(layoutIds) ? layoutIds : [];
        await storage.setInspectionTypeLayouts(existingInspectionType.id, layoutIdsArray);
        console.log(`✅ [Routes] Layout associations updated: ${layoutIdsArray.length === 0 ? 'ALL' : layoutIdsArray.length} layout(s)`);
      }
      
      console.log(`✅ [Routes] Inspection type updated successfully: ${inspectionTypeId}`);
      res.json(updatedInspectionType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("❌ [Routes] Error updating inspection type:", error);
      res.status(500).json({ error: "Failed to update inspection type" });
    }
  });

  // Get form fields for an inspection type (protected)
  app.get("/api/inspection-types/:inspectionTypeId/form-fields", requireAuth, async (req, res) => {
    const { inspectionTypeId } = req.params;
    console.log(`🔍 [Routes] GET /api/inspection-types/${inspectionTypeId}/form-fields - Fetching form fields`);
    
    try {
      // Verify the inspection type exists and user has access (use companyId for proper scoping)
      const companyId = req.session.companyId || undefined;
      const inspectionType = await storage.getInspectionTypeById(inspectionTypeId, companyId);
      if (!inspectionType) {
        console.log(`❌ [Routes] Inspection type not found: ${inspectionTypeId}`);
        return res.status(404).json({ error: "Inspection type not found" });
      }
      
      // Enforce company scoping (already filtered by getInspectionTypeById, but double-check for superusers)
      if (req.session.companyId && inspectionType.companyId !== req.session.companyId) {
        console.log(`❌ [Routes] Authorization failed - Cannot access form fields from another company`);
        return res.status(403).json({ error: "Cannot access inspection types from other companies" });
      }
      
      // Return the form fields from the inspection type
      console.log(`✅ [Routes] Returning ${inspectionType.formFields?.length || 0} form fields`);
      res.json(inspectionType.formFields || []);
    } catch (error) {
      console.error("❌ [Routes] Error fetching form fields:", error);
      res.status(500).json({ error: "Failed to fetch form fields" });
    }
  });

  // Create a new form field for an inspection type (protected)
  app.post("/api/inspection-types/:inspectionTypeId/form-fields", requireAuth, async (req, res) => {
    const { inspectionTypeId } = req.params;
    console.log(`➕ [Routes] POST /api/inspection-types/${inspectionTypeId}/form-fields - Creating form field`);
    
    try {
      // Verify the inspection type exists and user has access (use companyId for proper scoping)
      const companyId = req.session.companyId || undefined;
      const inspectionType = await storage.getInspectionTypeById(inspectionTypeId, companyId);
      if (!inspectionType) {
        console.log(`❌ [Routes] Inspection type not found: ${inspectionTypeId}`);
        return res.status(404).json({ error: "Inspection type not found" });
      }
      
      // Enforce company scoping
      if (req.session.companyId && inspectionType.companyId !== req.session.companyId) {
        console.log(`❌ [Routes] Authorization failed - Cannot add form fields to inspection type from another company`);
        return res.status(403).json({ error: "Cannot modify inspection types from other companies" });
      }
      
      const formFieldData = insertInspectionTypeFormFieldSchema.parse({
        ...req.body,
        inspectionTypeId: inspectionType.id, // Use UUID id, not business inspectionTypeId
      });
      
      const formField = await storage.createInspectionTypeFormField(formFieldData);
      console.log(`✅ [Routes] Form field created successfully`);
      
      res.json(formField);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log(`❌ [Routes] Form field validation error:`, error.errors);
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("❌ [Routes] Error creating form field:", error);
      res.status(500).json({ error: "Failed to create form field" });
    }
  });

  // Update a form field (protected)
  app.patch("/api/inspection-type-form-fields/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    console.log(`🔄 [Routes] PATCH /api/inspection-type-form-fields/${id} - Updating form field`);
    
    try {
      const updateData = insertInspectionTypeFormFieldSchema.partial().parse(req.body);
      
      // Get the existing form field to check authorization
      const existingFormField = await storage.getInspectionTypeFormFieldById(id);
      if (!existingFormField) {
        console.log(`❌ [Routes] Form field not found: ${id}`);
        return res.status(404).json({ error: "Form field not found" });
      }
      
      // Get the inspection type to enforce company scoping (use UUID method since form field stores UUID FK)
      const inspectionType = await storage.getInspectionTypeByUUID(existingFormField.inspectionTypeId);
      if (!inspectionType) {
        console.log(`❌ [Routes] Inspection type not found for form field`);
        return res.status(404).json({ error: "Inspection type not found" });
      }
      
      // Enforce company scoping
      if (req.session.companyId && inspectionType.companyId !== req.session.companyId) {
        console.log(`❌ [Routes] Authorization failed - Cannot update form field from another company`);
        return res.status(403).json({ error: "Cannot modify form fields from other companies" });
      }
      
      const updatedFormField = await storage.updateInspectionTypeFormField(id, updateData);
      if (!updatedFormField) {
        return res.status(404).json({ error: "Form field not found" });
      }
      
      console.log(`✅ [Routes] Form field updated successfully: ${id}`);
      res.json(updatedFormField);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("❌ [Routes] Error updating form field:", error);
      res.status(500).json({ error: "Failed to update form field" });
    }
  });

  // Delete a form field (protected)
  app.delete("/api/inspection-type-form-fields/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    console.log(`🗑️ [Routes] DELETE /api/inspection-type-form-fields/${id}`);
    
    try {
      // Get the existing form field to check authorization
      const existingFormField = await storage.getInspectionTypeFormFieldById(id);
      if (!existingFormField) {
        console.log(`❌ [Routes] Form field not found: ${id}`);
        return res.status(404).json({ error: "Form field not found" });
      }
      
      // Get the inspection type to enforce company scoping (use UUID method since form field stores UUID FK)
      const inspectionType = await storage.getInspectionTypeByUUID(existingFormField.inspectionTypeId);
      if (!inspectionType) {
        console.log(`❌ [Routes] Inspection type not found for form field`);
        return res.status(404).json({ error: "Inspection type not found" });
      }
      
      // Enforce company scoping
      if (req.session.companyId && inspectionType.companyId !== req.session.companyId) {
        console.log(`❌ [Routes] Authorization failed - Cannot delete form field from another company`);
        return res.status(403).json({ error: "Cannot delete form fields from other companies" });
      }
      
      const success = await storage.deleteInspectionTypeFormField(id);
      if (!success) {
        return res.status(404).json({ error: "Form field not found" });
      }
      
      console.log(`✅ [Routes] Form field deleted successfully: ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("❌ [Routes] Error deleting form field:", error);
      res.status(500).json({ error: "Failed to delete form field" });
    }
  });

  // === INSPECTION ROUTES ===

  // Get available filter values for inspections (protected)
  app.get("/api/inspections/filter-values", requireAuth, async (req, res) => {
    console.log(`🔍 [Routes] GET /api/inspections/filter-values - User: ${req.session.userId}, CompanyId: ${req.session.companyId || 'null (superuser)'}`);
    
    try {
      // Enforce company scoping: use session's companyId unless user is superuser
      const companyId = req.session.companyId || (req.query.companyId as string | undefined);
      
      if (req.session.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping for filter values - Company: ${req.session.companyId}`);
      } else {
        console.log(`👑 [Routes] Superuser access - getting filter values for company: ${companyId || 'ALL'}`);
      }
      
      const filterValues = await storage.getFilterValues(companyId);
      res.json(filterValues);
    } catch (error) {
      console.error("❌ [Routes] Error fetching filter values:", error);
      res.status(500).json({ error: "Failed to fetch filter values" });
    }
  });

  // Get all inspections with their defects (with query params for search, sort, pagination) (protected)
  app.get("/api/inspections", requireAuth, async (req, res) => {
    console.log(`📋 [Routes] GET /api/inspections - User: ${req.session.userId}, Requested companyId: ${req.query.companyId || 'NONE'}`);
    
    try {
      const params = queryParamsSchema.parse(req.query);
      
      // Enforce company scoping: override companyId with session's companyId
      // unless user is superuser (companyId is null, like avazquez)
      if (req.session.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping - User restricted to: ${req.session.companyId}`);
        params.companyId = req.session.companyId;
      } else {
        console.log(`👑 [Routes] Superuser access - allowing companyId: ${params.companyId || 'ALL'}`);
      }
      
      const result = await storage.getInspections(params);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Error fetching inspections:", error);
      res.status(500).json({ error: "Failed to fetch inspections" });
    }
  });

  // Print inspection list - serves simple HTML in new tab (protected)
  // NOTE: This MUST be before the /:id route to avoid Express matching "print-list" as an ID
  app.get("/api/inspections/print-list", requireAuth, async (req, res) => {
    try {
      const params = queryParamsSchema.parse(req.query);
      
      // Enforce company scoping
      if (req.session.companyId) {
        params.companyId = req.session.companyId;
      }
      
      // Override limit to max 100 for printing
      params.limit = 100;
      params.page = 1;
      
      const result = await storage.getInspections(params);
      const companies = await storage.getCompanies();
      const company = companies.find(c => c.id === params.companyId);
      
      // Generate simple HTML
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Inspection List</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 1000px; margin: 20px auto; padding: 20px; }
    h1 { font-size: 24px; margin-bottom: 10px; }
    .summary { margin-bottom: 30px; color: #666; }
    .inspection { border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; page-break-inside: avoid; }
    .inspection h2 { font-size: 16px; margin: 0 0 10px 0; }
    .info-row { margin-bottom: 5px; font-size: 14px; }
    .label { font-weight: bold; display: inline-block; width: 120px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    th, td { text-align: left; padding: 6px; border: 1px solid #ddd; }
    th { background-color: #f5f5f5; font-weight: bold; }
  </style>
</head>
<body>
  <h1>EQUIPMENT INSPECTION LIST</h1>
  <div class="summary">
    ${company ? `Company: ${company.name}<br>` : ''}
    Total Inspections: ${result.total}
  </div>
  
  ${result.data.map(inspection => {
    const date = new Date(inspection.datetime);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString();
    
    return `
  <div class="inspection">
    <h2>Inspection: ${inspection.assetId} - ${formattedDate}</h2>
    <div class="info-row"><span class="label">Date/Time:</span> ${formattedDate} ${formattedTime}</div>
    <div class="info-row"><span class="label">Type:</span> ${inspection.inspectionType}</div>
    <div class="info-row"><span class="label">Asset ID:</span> ${inspection.assetId}</div>
    <div class="info-row"><span class="label">Driver:</span> ${inspection.driverName} (${inspection.driverId})</div>
    
    ${inspection.defects && inspection.defects.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Zone</th>
          <th>Component</th>
          <th>Defect</th>
          <th>Severity</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${inspection.defects.map(d => `
        <tr>
          <td>${d.zoneName}</td>
          <td>${d.componentName}</td>
          <td>${d.defect}</td>
          <td>${d.severity}</td>
          <td>${d.status}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ` : '<div style="margin-top: 10px; color: #666;">No defects found.</div>'}
  </div>
    `;
  }).join('')}
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error("Error generating print list:", error);
      res.status(500).send("<html><body><h1>Error generating list</h1></body></html>");
    }
  });

  // Print single inspection - serves simple HTML in new tab (protected)
  app.get("/api/inspections/:id/print", requireAuth, async (req, res) => {
    try {
      const inspection = await storage.getInspection(req.params.id);
      if (!inspection) {
        return res.status(404).send("<html><body><h1>Inspection not found</h1></body></html>");
      }
      
      // Verify user has access to this inspection's company
      if (req.session.companyId && inspection.companyId !== req.session.companyId) {
        return res.status(403).send("<html><body><h1>Access denied</h1></body></html>");
      }
      
      // Get company name
      const companies = await storage.getCompanies();
      const company = companies.find(c => c.id === inspection.companyId);
      
      // Format date
      const date = new Date(inspection.datetime);
      const formattedDate = date.toLocaleDateString();
      const formattedTime = date.toLocaleTimeString();
      
      // Generate simple HTML
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Inspection Report - ${inspection.assetId}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 20px auto; padding: 20px; }
    h1 { font-size: 24px; margin-bottom: 20px; }
    h2 { font-size: 18px; margin-top: 30px; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { text-align: left; padding: 8px; border: 1px solid #ddd; }
    th { background-color: #f5f5f5; font-weight: bold; }
    .info-row { margin-bottom: 8px; }
    .label { font-weight: bold; display: inline-block; width: 150px; }
  </style>
</head>
<body>
  <h1>EQUIPMENT INSPECTION REPORT</h1>
  
  <div class="info-row"><span class="label">Company:</span> ${company?.name || inspection.companyId}</div>
  <div class="info-row"><span class="label">Inspection ID:</span> ${inspection.id}</div>
  <div class="info-row"><span class="label">Date:</span> ${formattedDate}</div>
  <div class="info-row"><span class="label">Time:</span> ${formattedTime}</div>
  <div class="info-row"><span class="label">Type:</span> ${inspection.inspectionType}</div>
  <div class="info-row"><span class="label">Asset ID:</span> ${inspection.assetId}</div>
  <div class="info-row"><span class="label">Driver:</span> ${inspection.driverName}</div>
  <div class="info-row"><span class="label">Driver ID:</span> ${inspection.driverId}</div>
  
  <h2>Defects</h2>
  ${inspection.defects && inspection.defects.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>Zone</th>
        <th>Component</th>
        <th>Defect</th>
        <th>Severity</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${inspection.defects.map(d => `
      <tr>
        <td>${d.zoneName}</td>
        <td>${d.componentName}</td>
        <td>${d.defect}</td>
        <td>${d.severity}</td>
        <td>${d.status}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  ` : '<p>No defects found.</p>'}
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error("Error generating print view:", error);
      res.status(500).send("<html><body><h1>Error generating report</h1></body></html>");
    }
  });

  // Get a single inspection by ID (protected)
  app.get("/api/inspections/:id", requireAuth, async (req, res) => {
    try {
      const inspection = await storage.getInspection(req.params.id);
      if (!inspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      
      // Verify user has access to this inspection's company
      if (req.session.companyId && inspection.companyId !== req.session.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(inspection);
    } catch (error) {
      console.error("Error fetching inspection:", error);
      res.status(500).json({ error: "Failed to fetch inspection" });
    }
  });

  // Create a new inspection (protected)
  app.post("/api/inspections", requireAuth, async (req, res) => {
    try {
      const validatedData = insertInspectionSchema.parse(req.body);
      
      // Enforce company scoping: user can only create inspections for their company
      if (req.session.companyId && validatedData.companyId !== req.session.companyId) {
        return res.status(403).json({ error: "Access denied: cannot create inspection for other company" });
      }
      
      const inspection = await storage.createInspection(validatedData);
      res.status(201).json(inspection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Error creating inspection:", error);
      res.status(500).json({ error: "Failed to create inspection" });
    }
  });

  // Update an inspection (protected)
  app.patch("/api/inspections/:id", requireAuth, async (req, res) => {
    try {
      // First, verify user has access to this inspection
      const existingInspection = await storage.getInspection(req.params.id);
      if (!existingInspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      
      if (req.session.companyId && existingInspection.companyId !== req.session.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const validatedData = insertInspectionSchema.partial().parse(req.body);
      
      // Prevent changing companyId to a different company
      if (validatedData.companyId && validatedData.companyId !== existingInspection.companyId) {
        return res.status(403).json({ error: "Access denied: cannot change inspection company" });
      }
      
      const inspection = await storage.updateInspection(req.params.id, validatedData);
      res.json(inspection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Error updating inspection:", error);
      res.status(500).json({ error: "Failed to update inspection" });
    }
  });

  // Delete an inspection (protected)
  app.delete("/api/inspections/:id", requireAuth, async (req, res) => {
    try {
      // First, verify user has access to this inspection
      const existingInspection = await storage.getInspection(req.params.id);
      if (!existingInspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      
      if (req.session.companyId && existingInspection.companyId !== req.session.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const success = await storage.deleteInspection(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting inspection:", error);
      res.status(500).json({ error: "Failed to delete inspection" });
    }
  });

  // === DEFECT ROUTES ===

  // Get available filter values for defects (protected)
  app.get("/api/defects/filter-values", requireAuth, async (req, res) => {
    console.log(`🔍 [Routes] GET /api/defects/filter-values - User: ${req.session.userId}, CompanyId: ${req.session.companyId || 'null (superuser)'}`);
    
    try {
      // Enforce company scoping: use session's companyId unless user is superuser
      const companyId = req.session.companyId || (req.query.companyId as string | undefined);
      
      if (req.session.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping for filter values - Company: ${req.session.companyId}`);
      } else {
        console.log(`👑 [Routes] Superuser access - getting filter values for company: ${companyId || 'ALL'}`);
      }
      
      const filterValues = await storage.getDefectFilterValues(companyId);
      res.json(filterValues);
    } catch (error) {
      console.error("❌ [Routes] Error fetching defect filter values:", error);
      res.status(500).json({ error: "Failed to fetch filter values" });
    }
  });

  // Get all defects with pagination, search, and filters (protected)
  app.get("/api/defects", requireAuth, async (req, res) => {
    console.log(`📋 [Routes] GET /api/defects - User: ${req.session.userId}, Requested companyId: ${req.query.companyId || 'NONE'}`);
    
    try {
      const params = defectQueryParamsSchema.parse(req.query);
      
      // Enforce company scoping: override companyId with session's companyId
      // unless user is superuser (companyId is null, like avazquez)
      if (req.session.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping - User restricted to: ${req.session.companyId}`);
        params.companyId = req.session.companyId;
      } else {
        console.log(`👑 [Routes] Superuser access - allowing companyId: ${params.companyId || 'ALL'}`);
      }
      
      const result = await storage.getDefects(params);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Error fetching defects:", error);
      res.status(500).json({ error: "Failed to fetch defects" });
    }
  });

  // Create a new defect (protected)
  app.post("/api/defects", requireAuth, async (req, res) => {
    try {
      const validatedData = insertDefectSchema.parse(req.body);
      
      // Verify user has access to the parent inspection
      const inspection = await storage.getInspection(validatedData.inspectionId);
      if (!inspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      
      if (req.session.companyId && inspection.companyId !== req.session.companyId) {
        return res.status(403).json({ error: "Access denied: cannot create defect for other company's inspection" });
      }
      
      const defect = await storage.createDefect(validatedData);
      res.status(201).json(defect);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Error creating defect:", error);
      res.status(500).json({ error: "Failed to create defect" });
    }
  });

  // Update a defect (protected)
  app.patch("/api/defects/:id", requireAuth, async (req, res) => {
    try {
      // Get the existing defect
      const existingDefect = await storage.getDefectById(req.params.id);
      
      if (!existingDefect) {
        return res.status(404).json({ error: "Defect not found" });
      }
      
      // Verify user has access to the parent inspection
      const inspection = await storage.getInspection(existingDefect.inspectionId);
      if (!inspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      
      if (req.session.companyId && inspection.companyId !== req.session.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const validatedData = insertDefectSchema.partial().parse(req.body);
      
      // Prevent changing inspectionId to move defect to another inspection/company
      if (validatedData.inspectionId && validatedData.inspectionId !== existingDefect.inspectionId) {
        return res.status(403).json({ error: "Access denied: cannot change defect's inspection" });
      }
      
      const defect = await storage.updateDefect(req.params.id, validatedData);
      res.json(defect);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Error updating defect:", error);
      res.status(500).json({ error: "Failed to update defect" });
    }
  });

  // Delete a defect (protected)
  app.delete("/api/defects/:id", requireAuth, async (req, res) => {
    try {
      // Get the existing defect
      const existingDefect = await storage.getDefectById(req.params.id);
      
      if (!existingDefect) {
        return res.status(404).json({ error: "Defect not found" });
      }
      
      // Verify user has access to the parent inspection
      const inspection = await storage.getInspection(existingDefect.inspectionId);
      if (!inspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      
      if (req.session.companyId && inspection.companyId !== req.session.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const success = await storage.deleteDefect(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting defect:", error);
      res.status(500).json({ error: "Failed to delete defect" });
    }
  });

  // Get defects by inspection ID (protected)
  app.get("/api/inspections/:id/defects", requireAuth, async (req, res) => {
    try {
      // Verify user has access to the parent inspection
      const inspection = await storage.getInspection(req.params.id);
      if (!inspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      
      if (req.session.companyId && inspection.companyId !== req.session.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const defects = await storage.getDefectsByInspectionId(req.params.id);
      res.json(defects);
    } catch (error) {
      console.error("Error fetching defects:", error);
      res.status(500).json({ error: "Failed to fetch defects" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
