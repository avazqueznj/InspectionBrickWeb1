import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertInspectionSchema, insertDefectSchema, insertUserSchema, insertAssetSchema, insertInspectionTypeSchema, insertInspectionTypeFormFieldSchema, insertLayoutSchema, insertLayoutZoneSchema, insertLayoutZoneComponentSchema, insertComponentDefectSchema, type Defect, type InspectionWithDefects } from "@shared/schema";
import { z } from "zod";
import { parseBrickInspection } from "./brickParser";
import { generateAccessToken, generateDeviceToken } from "./auth/jwt";
import { requireAuth as requireJWTAuth, requireSuperuser, requireCustomerAdmin, rateLimitLogin, resetLoginRateLimit, logLoginFailure, type AuthRequest } from "./auth/middleware";
import { runSeed } from "./services/seedService";
import { generateBrickConfig } from "./services/brickConfigService";
import sharp from "sharp";

// Pure JWT authentication middleware
const requireAuth = requireJWTAuth;

export async function registerRoutes(app: Express): Promise<Server> {
  // Query params validation schema
  const queryParamsSchema = z.object({
    companyId: z.string().optional(),
    search: z.string().optional(),
    sortField: z.enum(["datetime", "inspectionType", "assetId", "driverName"]).optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(1000).optional(),
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
    limit: z.coerce.number().int().positive().max(1000).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  });

  // Asset query params validation schema
  const assetQueryParamsSchema = z.object({
    companyId: z.string().optional(),
    search: z.string().optional(),
    sortField: z.enum(["assetId", "assetConfig", "assetName", "status"]).optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(1000).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  });

  // Inspection Type query params validation schema
  const inspectionTypeQueryParamsSchema = z.object({
    companyId: z.string().optional(),
    search: z.string().optional(),
    sortField: z.enum(["inspectionTypeName", "inspectionLayout", "status"]).optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(1000).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  });

  // Defect query params validation schema
  const defectQueryParamsSchema = z.object({
    companyId: z.string().optional(),
    search: z.string().optional(),
    sortField: z.enum(["datetime", "assetId", "driverName", "zoneName", "componentName", "defect", "severity", "status"]).optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(1000).optional(),
    // Filter parameters
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    assetId: z.string().optional(),
    driverName: z.string().optional(),
    zoneName: z.string().optional(),
    componentName: z.string().optional(),
    severityLevel: z.enum(["critical", "high", "medium", "low"]).optional(),
    status: z.enum(["open", "pending", "repaired", "not-needed"]).optional(),
  });

  // Login schema - companyId can be empty string for superuser login
  const loginSchema = z.object({
    userId: z.string().min(1),
    password: z.string().min(1),
    companyId: z.string(), // Allow empty string for superuser
  });

  // Auth: Login (with rate limiting)
  app.post("/api/auth/login", rateLimitLogin, async (req, res) => {
    console.log(`🔐 [Routes] POST /api/auth/login - Attempting login for user: ${req.body?.userId || 'UNKNOWN'}`);
    
    try {
      const { userId, password, companyId: rawCompanyId } = loginSchema.parse(req.body);
      // Normalize companyId: treat undefined, null, empty string, or whitespace-only as empty string
      const companyId = (rawCompanyId || '').trim();
      console.log(`✅ [Routes] Login request validated - userId: ${userId}, companyId: ${companyId || 'SUPERUSER'}`);
      
      const user = await storage.authenticateUser(userId, companyId, password);
      
      if (!user) {
        console.log(`❌ [Routes] Login failed - Invalid credentials for user: ${userId}`);
        logLoginFailure(req, userId);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Check web access flag
      if (!user.webAccess) {
        console.log(`❌ [Routes] Login failed - Web access denied for user: ${userId}`);
        logLoginFailure(req, userId);
        return res.status(403).json({ error: "Web access denied" });
      }
      
      // Generate JWT token
      const token = await generateAccessToken({
        userId: user.userId,
        companyId: user.companyId,
        isSuperuser: user.companyId === null,
        customerAdminAccess: user.customerAdminAccess || false,
      });
      
      // Reset rate limit on successful login
      resetLoginRateLimit(req);
      console.log(`✅ [Routes] JWT token generated - userId: ${user.userId}, companyId: ${user.companyId || 'null (superuser)'}, customerAdmin: ${user.customerAdminAccess}`);
      
      // Return token and user info
      res.json({
        token,
        user: {
          userId: user.userId,
          companyId: user.companyId,
          isSuperuser: user.companyId === null,
          customerAdminAccess: user.customerAdminAccess || false,
        },
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

  // Auth: Generate device token (for mobile devices)
  app.post("/api/auth/device-token", requireAuth, async (req: AuthRequest, res) => {
    console.log(`📱 [Routes] POST /api/auth/device-token - Generating device token`);
    
    try {
      if (!req.auth) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { userId, companyId: authCompanyId, isSuperuser } = req.auth;
      
      // Allow admins to specify companyId, otherwise use their own company
      const targetCompanyId = req.body.companyId || authCompanyId;
      
      // If user is not a superuser, they can only generate tokens for their own company
      if (!isSuperuser && targetCompanyId !== authCompanyId) {
        console.log(`❌ [Routes] Non-admin cannot generate tokens for other companies`);
        return res.status(403).json({ error: "Cannot generate device tokens for other companies" });
      }
      
      if (!targetCompanyId) {
        console.log(`❌ [Routes] No company ID available`);
        return res.status(400).json({ error: "Company ID required" });
      }
      
      // Generate perpetual device token (not for superuser, but for device)
      const token = await generateDeviceToken({
        userId,
        companyId: targetCompanyId,
        isSuperuser: false,
      });
      
      console.log(`✅ [Routes] Device token generated for company: ${targetCompanyId} by ${isSuperuser ? 'admin' : 'user'} ${userId}`);
      
      res.json({
        token,
        companyId: targetCompanyId,
        expiresIn: "10 years",
      });
    } catch (error) {
      console.error("❌ [Routes] Error generating device token:", error);
      res.status(500).json({ error: "Failed to generate device token" });
    }
  });

  // Device: Upload inspection (requires device token)
  app.post("/api/device/inspections", requireAuth, async (req: AuthRequest, res) => {
    console.log(`📱 [Routes] POST /api/device/inspections - Receiving inspection data from device`);
    
    // Verify this is a device token
    if (!req.auth || !req.auth.isDeviceToken) {
      console.log(`❌ [Routes] Device upload rejected - not a device token`);
      return res.status(403).json({ error: "Device token required for this endpoint" });
    }
    
    console.log(`✅ [Routes] Device token verified for company: ${req.auth.companyId}`);
    
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

      // CRITICAL SECURITY: Verify company ID from token matches parsed data
      if (parsed.companyId !== req.auth.companyId) {
        console.log(`❌ [Routes] SECURITY VIOLATION - Device token company (${req.auth.companyId}) does not match inspection company (${parsed.companyId})`);
        return res.status(403).json({ 
          error: "Company ID mismatch",
          message: "Device token does not authorize uploads for this company" 
        });
      }
      console.log(`✅ [Routes] Company ID verified - matches device token`);

      const formFieldsJson = JSON.stringify(parsed.formFields);
      const primaryAssetId = parsed.assets.length > 0 ? parsed.assets[0].assetId : "UNKNOWN";

      const inspectionData = {
        id: parsed.inspectionId,
        companyId: parsed.companyId,
        inspectionType: parsed.inspectionType,
        assetId: primaryAssetId,
        driverName: parsed.driverName,
        driverId: parsed.driverId,
        inspectionFormData: formFieldsJson,
        inspStartTimeUtc: parsed.inspStartTimeUtc,
        inspSubmitTimeUtc: parsed.inspSubmitTimeUtc,
        inspTimeOffset: parsed.inspTimeOffset,
        inspTimeDst: parsed.inspTimeDst,
        rawData: rawData,
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

      // Store all inspection assets in the junction table
      console.log(`💾 [Routes] Creating ${parsed.assets.length} inspection-asset associations`);
      for (const asset of parsed.assets) {
        await storage.createInspectionAsset({
          inspectionId: inspection.id,
          assetId: asset.assetId,
        });
      }
      console.log(`✅ [Routes] All inspection-asset associations created`);

      const allDefectsToCreate = [
        ...parsed.checks.map((check: any) => ({
          inspectionId: inspection.id,
          assetId: check.assetId,
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
        ...parsed.defects.map((defect: any) => ({
          inspectionId: inspection.id,
          assetId: defect.assetId,
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

  // Device: Download configuration (requires device token)
  app.get("/api/device/config", requireAuth, async (req: AuthRequest, res) => {
    console.log(`📱 [Routes] GET /api/device/config - Downloading config for device`);
    
    // Verify this is a device token (auth already verified by middleware)
    if (!req.auth || !req.auth.isDeviceToken) {
      console.log(`❌ [Routes] Config download rejected - not a device token (regular user/access token)`);
      return res.status(403).json({ error: "Device token required for this endpoint" });
    }
    
    const tokenCompanyId = req.auth.companyId;
    const requestedCompanyId = req.query.company as string | undefined;
    
    console.log(`🔍 [Routes] Device token company: ${tokenCompanyId}, Requested company: ${requestedCompanyId || 'NONE'}`);
    
    // Validate company ID matches token
    if (requestedCompanyId && requestedCompanyId !== tokenCompanyId) {
      console.log(`❌ [Routes] SECURITY VIOLATION - Device token company (${tokenCompanyId}) does not match requested company (${requestedCompanyId})`);
      return res.status(403).json({ 
        error: "Company ID mismatch",
        message: "Device token does not authorize config download for this company" 
      });
    }
    
    // Use token's company ID (ignore query param if it matches, or use token if not provided)
    const companyId = tokenCompanyId;
    
    if (!companyId) {
      console.log(`❌ [Routes] No company ID in device token`);
      return res.status(400).json({ error: "Device token must be associated with a company" });
    }
    
    console.log(`✅ [Routes] Company ID verified - generating config for: ${companyId}`);
    
    try {
      const configData = await generateBrickConfig(storage, companyId);
      
      console.log(`✅ [Routes] Config generated successfully - ${configData.length} bytes`);
      
      // Return as plain text
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(configData);
    } catch (error) {
      console.error("❌ [Routes] Error generating device config:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return res.status(500).json({ 
        error: "Failed to generate configuration",
        message: errorMessage
      });
    }
  });

  // Device: Download zone image (requires device token)
  app.get("/api/device/images/:uuid", requireAuth, async (req: AuthRequest, res) => {
    const { uuid } = req.params;
    console.log(`📱 [Routes] GET /api/device/images/${uuid} - Downloading zone image`);
    
    // Verify this is a device token
    if (!req.auth || !req.auth.isDeviceToken) {
      console.log(`❌ [Routes] Image download rejected - not a device token`);
      return res.status(403).json({ error: "Device token required for this endpoint" });
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      console.log(`❌ [Routes] Invalid UUID format: ${uuid}`);
      return res.status(400).json({ error: "Invalid UUID format" });
    }
    
    try {
      const image = await storage.getZoneImage(uuid);
      
      if (!image) {
        console.log(`❌ [Routes] Image not found: ${uuid}`);
        return res.status(404).json({ error: "Image not found" });
      }
      
      console.log(`✅ [Routes] Image found - ${image.imageData.length} bytes`);
      
      // Return raw JPEG binary
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Length', image.imageData.length.toString());
      res.send(image.imageData);
    } catch (error) {
      console.error("❌ [Routes] Error fetching zone image:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return res.status(500).json({ 
        error: "Failed to fetch image",
        message: errorMessage
      });
    }
  });

  // Auth: Logout (JWT-based - client clears token, server just acknowledges)
  app.post("/api/auth/logout", (_req, res) => {
    console.log(`🚪 [Routes] POST /api/auth/logout - JWT logout (client-side token clear)`);
    // With JWT, logout is client-side - just acknowledge the request
    // The client clears the token from localStorage
    console.log(`✅ [Routes] Logout acknowledged`);
    res.json({ success: true });
  });

  // Admin: Reseed database (superuser only)
  app.post("/api/admin/reseed", requireSuperuser, async (req: AuthRequest, res) => {
    console.log(`🌱 [Routes] POST /api/admin/reseed - Superuser: ${req.auth?.userId}`);
    
    try {
      await runSeed();
      console.log(`✅ [Routes] Database reseed completed successfully by ${req.auth?.userId}`);
      res.status(202).json({ 
        success: true,
        message: "Database reseeded successfully",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("❌ [Routes] Error during database reseed:", error);
      res.status(500).json({ 
        error: "Failed to reseed database",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Admin: Upload zone image (superuser only)
  app.post("/api/admin/zone-images", requireSuperuser, async (req: AuthRequest, res) => {
    console.log(`🖼️ [Routes] POST /api/admin/zone-images - Superuser: ${req.auth?.userId}`);
    
    try {
      const { imageData } = req.body;
      
      if (!imageData || typeof imageData !== 'string') {
        return res.status(400).json({ error: "Missing imageData (base64 encoded JPEG)" });
      }
      
      // Validate base64 and decode
      const base64Pattern = /^data:image\/jpeg;base64,(.+)$/;
      const match = imageData.match(base64Pattern);
      
      let base64Data: string;
      if (match) {
        // Has data URL prefix
        base64Data = match[1];
      } else {
        // Assume raw base64
        base64Data = imageData;
      }
      
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Basic JPEG validation (check magic bytes)
      if (buffer.length < 2 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
        return res.status(400).json({ error: "Invalid JPEG image data" });
      }
      
      console.log(`📦 [Routes] Decoded image: ${buffer.length} bytes`);
      
      const uuid = await storage.createZoneImage(buffer);
      
      console.log(`✅ [Routes] Zone image uploaded: ${uuid}`);
      res.status(201).json({ 
        success: true,
        uuid,
        size: buffer.length
      });
    } catch (error) {
      console.error("❌ [Routes] Error uploading zone image:", error);
      res.status(500).json({ 
        error: "Failed to upload image",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Auth: Get current user (JWT-based)
  app.get("/api/auth/me", requireAuth, async (req: AuthRequest, res) => {
    console.log(`👤 [Routes] GET /api/auth/me - JWT userId: ${req.auth?.userId || 'NONE'}`);
    
    if (!req.auth?.userId) {
      console.log(`❌ [Routes] Not authenticated - No JWT token`);
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUserById(req.auth.userId);
      if (!user) {
        console.log(`❌ [Routes] User not found in database`);
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
  app.get("/api/companies", requireAuth, async (req: AuthRequest, res) => {
    console.log(`🏢 [Routes] GET /api/companies - User: ${req.auth?.userId}, CompanyId: ${req.auth?.companyId || 'null (superuser)'}`);
    
    try {
      const companies = await storage.getCompanies();
      
      // If user has a specific company, only return that company
      if (req.auth?.companyId) {
        console.log(`🔒 [Routes] Filtering to single company: ${req.auth?.companyId}`);
        const filteredCompanies = companies.filter(c => c.id === req.auth?.companyId);
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
  app.get("/api/users/filter-values", requireAuth, async (req: AuthRequest, res) => {
    console.log(`🔍 [Routes] GET /api/users/filter-values - User: ${req.auth?.userId}`);
    
    try {
      // Enforce company scoping: use session's companyId unless user is superuser
      const companyId = req.auth?.companyId || (req.query.companyId as string | undefined);
      
      if (req.auth?.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping for user filter values - Company: ${req.auth?.companyId}`);
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
  app.get("/api/users", requireAuth, async (req: AuthRequest, res) => {
    console.log(`👥 [Routes] GET /api/users - User: ${req.auth?.userId}, Requested companyId: ${req.query.companyId || 'NONE'}`);
    console.log(`🔍 [Routes] Query params received:`, req.query);
    
    try {
      const params = userQueryParamsSchema.parse(req.query);
      
      // Enforce company scoping
      if (req.auth?.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping - User restricted to: ${req.auth?.companyId}`);
        params.companyId = req.auth?.companyId;
      } else {
        console.log(`👑 [Routes] Superuser access - allowing companyId: ${params.companyId || 'ALL'}`);
      }
      
      const result = await storage.getUsers(params);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log(`❌ [Routes] Validation failed for /api/users:`, JSON.stringify(error.errors));
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("❌ [Routes] Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Create a new user (protected)
  app.post("/api/users", requireAuth, async (req: AuthRequest, res) => {
    console.log(`➕ [Routes] POST /api/users - Creating user: ${req.body?.userId || 'UNKNOWN'}`);
    
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Enforce company scoping: non-superusers can only create users in their own company
      if (req.auth?.companyId && userData.companyId !== req.auth?.companyId) {
        console.log(`❌ [Routes] Authorization failed - User can only create users in their own company`);
        return res.status(403).json({ error: "Cannot create users in other companies" });
      }
      
      const user = await storage.createUser(userData);
      console.log(`✅ [Routes] User created successfully: ${user.userId}`);
      
      // Return user without password
      res.json({
        userId: user.userId,
        userFullName: user.userFullName,
        userTag: user.userTag,
        status: user.status,
        webAccess: user.webAccess,
        customerAdminAccess: user.customerAdminAccess,
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
  app.patch("/api/users/:userId", requireAuth, async (req: AuthRequest, res) => {
    const { userId } = req.params;
    console.log(`🔄 [Routes] PATCH /api/users/${userId} - Updating user`);
    
    try {
      const updateData = insertUserSchema.partial().parse(req.body);
      
      // Security: Only superusers can modify customerAdminAccess
      if ('customerAdminAccess' in updateData && !req.auth?.isSuperuser) {
        console.log(`❌ [Routes] Authorization failed - Only superusers can modify customerAdminAccess`);
        return res.status(403).json({ error: "Only superusers can modify customer admin access" });
      }
      
      // Get the existing user to check authorization
      const existingUser = await storage.getUserById(userId);
      if (!existingUser) {
        console.log(`❌ [Routes] User not found: ${userId}`);
        return res.status(404).json({ error: "User not found" });
      }
      
      // Enforce company scoping (skip for superusers)
      if (req.auth?.companyId && existingUser.companyId !== req.auth?.companyId) {
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
        userTag: updatedUser.userTag,
        status: updatedUser.status,
        webAccess: updatedUser.webAccess,
        customerAdminAccess: updatedUser.customerAdminAccess,
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
  app.delete("/api/users/:userId", requireAuth, async (req: AuthRequest, res) => {
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
      if (req.auth?.companyId && existingUser.companyId !== req.auth?.companyId) {
        console.log(`❌ [Routes] Authorization failed - Cannot delete user from another company`);
        return res.status(403).json({ error: "Cannot delete users from other companies" });
      }
      
      // Prevent self-deletion
      if (userId === req.auth?.userId) {
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
  app.get("/api/assets/filter-values", requireAuth, async (req: AuthRequest, res) => {
    console.log(`🔍 [Routes] GET /api/assets/filter-values - User: ${req.auth?.userId}`);
    
    try {
      // Enforce company scoping: use session's companyId unless user is superuser
      const companyId = req.auth?.companyId || (req.query.companyId as string | undefined);
      
      if (req.auth?.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping for asset filter values - Company: ${req.auth?.companyId}`);
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
  app.get("/api/assets", requireAuth, async (req: AuthRequest, res) => {
    console.log(`📦 [Routes] GET /api/assets - User: ${req.auth?.userId}, Requested companyId: ${req.query.companyId || 'NONE'}`);
    
    try {
      const params = assetQueryParamsSchema.parse(req.query);
      
      // Enforce company scoping
      if (req.auth?.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping - User restricted to: ${req.auth?.companyId}`);
        params.companyId = req.auth?.companyId;
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
  app.post("/api/assets", requireAuth, async (req: AuthRequest, res) => {
    console.log(`➕ [Routes] POST /api/assets - Creating asset: ${req.body?.assetId || 'UNKNOWN'}`);
    
    try {
      const assetData = insertAssetSchema.parse(req.body);
      
      // Enforce company scoping: non-superusers must create assets in their own company
      if (req.auth?.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping - Asset will be created in: ${req.auth?.companyId}`);
        assetData.companyId = req.auth?.companyId;
      }
      
      // Additional check: if no session company and submitted company is different, reject
      if (!req.auth?.companyId && !assetData.companyId) {
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
  app.patch("/api/assets/:assetId", requireAuth, async (req: AuthRequest, res) => {
    const { assetId } = req.params;
    console.log(`🔄 [Routes] PATCH /api/assets/${assetId} - Updating asset`);
    
    try {
      const updateData = insertAssetSchema.partial().parse(req.body);
      
      // Get the existing asset to check authorization (fetch all assets to avoid pagination issues)
      const existingAssets = await storage.getAssets({ 
        companyId: req.auth?.companyId || undefined,
        limit: 10000 // Large limit to get all assets for authorization check
      });
      const existingAsset = existingAssets.data.find(a => a.assetId === assetId);
      
      if (!existingAsset) {
        console.log(`❌ [Routes] Asset not found: ${assetId}`);
        return res.status(404).json({ error: "Asset not found" });
      }
      
      // Enforce company scoping
      if (req.auth?.companyId && existingAsset.companyId !== req.auth?.companyId) {
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
  // Layout routes require customer admin access (superuser OR customerAdminAccess)

  // Get all layouts for a company (customer admin protected)
  app.get("/api/layouts", requireCustomerAdmin, async (req: AuthRequest, res) => {
    console.log(`📋 [Routes] GET /api/layouts - User: ${req.auth?.userId}, isSuperuser: ${req.auth?.isSuperuser || false}`);
    
    try {
      // For superusers, use query param companyId; for regular users, use their token companyId
      const companyId = req.auth?.isSuperuser 
        ? (req.query.companyId as string)
        : req.auth?.companyId;
      
      if (!companyId) {
        console.log(`❌ [Routes] Company ID is required (provide ?companyId= query param for superusers)`);
        return res.status(400).json({ error: "Company ID is required" });
      }
      
      // Regular users can only access their own company's layouts
      if (!req.auth?.isSuperuser && req.auth?.companyId !== companyId) {
        console.log(`❌ [Routes] Authorization failed - Cannot access layouts from another company`);
        return res.status(403).json({ error: "Cannot access layouts from other companies" });
      }
      
      console.log(`🔍 [Routes] Fetching layouts for company: ${companyId}`);
      const layouts = await storage.getLayouts(companyId);
      console.log(`✅ [Routes] Returning ${layouts.length} layouts for company: ${companyId}`);
      res.json(layouts);
    } catch (error) {
      console.error("❌ [Routes] Error fetching layouts:", error);
      res.status(500).json({ error: "Failed to fetch layouts" });
    }
  });

  // Get layout by layoutName (customer admin protected)
  app.get("/api/layouts/:layoutName", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { layoutName } = req.params;
    console.log(`🔍 [Routes] GET /api/layouts/${layoutName} - User: ${req.auth?.userId}`);
    
    try {
      const layout = await storage.getLayoutById(layoutName, req.auth?.companyId || undefined);
      
      if (!layout) {
        console.log(`❌ [Routes] Layout not found: ${layoutName}`);
        return res.status(404).json({ error: "Layout not found" });
      }
      
      console.log(`✅ [Routes] Returning layout: ${layoutName}`);
      res.json(layout);
    } catch (error) {
      console.error("❌ [Routes] Error fetching layout:", error);
      res.status(500).json({ error: "Failed to fetch layout" });
    }
  });

  // Create layout (customer admin protected)
  app.post("/api/layouts", requireCustomerAdmin, async (req: AuthRequest, res) => {
    console.log(`➕ [Routes] POST /api/layouts - Creating layout: ${req.body?.layoutName || 'UNKNOWN'}, User: ${req.auth?.userId}, isSuperuser: ${req.auth?.isSuperuser || false}`);
    
    try {
      const insertData = insertLayoutSchema.parse(req.body);
      
      // Enforce company scoping
      // For superusers, allow them to specify companyId in the request body
      // For regular users, enforce their token's companyId
      if (req.auth?.isSuperuser) {
        // Superuser can specify companyId in body, but it's still required
        if (!insertData.companyId) {
          console.log(`❌ [Routes] Superuser must specify companyId in request body`);
          return res.status(400).json({ error: "Company ID is required" });
        }
        console.log(`👑 [Routes] Superuser creating layout for company: ${insertData.companyId}`);
      } else if (req.auth?.companyId) {
        // Regular user - enforce their company ID
        insertData.companyId = req.auth.companyId;
        console.log(`🔒 [Routes] Regular user - enforcing companyId: ${insertData.companyId}`);
      } else {
        console.log(`❌ [Routes] Company ID is required for layout creation`);
        return res.status(400).json({ error: "Company ID is required" });
      }
      
      const layout = await storage.createLayout(insertData);
      console.log(`✅ [Routes] Layout created successfully: ${layout.layoutName} for company: ${layout.companyId}`);
      res.json(layout);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      // Enhanced error logging
      console.error("❌ [Routes] Error creating layout:", error);
      if (error && typeof error === 'object' && 'code' in error) {
        const dbError = error as any;
        console.error(`   DB Error Code: ${dbError.code}, Detail: ${dbError.detail || 'N/A'}`);
        
        // Handle common database errors
        if (dbError.code === '23505') { // Unique violation
          return res.status(409).json({ error: "Layout name already exists for this company" });
        } else if (dbError.code === '23502' || dbError.code === '23503') { // NOT NULL or FK violation
          return res.status(400).json({ error: "Invalid company ID or missing required field" });
        }
      }
      res.status(500).json({ error: "Failed to create layout" });
    }
  });

  // Update layout (protected)
  app.patch("/api/layouts/:layoutName", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { layoutName } = req.params;
    console.log(`🔄 [Routes] PATCH /api/layouts/${layoutName} - Updating layout`);
    
    try {
      const updateData = insertLayoutSchema.partial().parse(req.body);
      
      // Verify layout exists and check permissions
      const existingLayout = await storage.getLayoutById(layoutName, req.auth?.companyId || undefined);
      
      if (!existingLayout) {
        console.log(`❌ [Routes] Layout not found: ${layoutName}`);
        return res.status(404).json({ error: "Layout not found" });
      }
      
      const updatedLayout = await storage.updateLayout(layoutName, updateData);
      console.log(`✅ [Routes] Layout updated successfully: ${layoutName}`);
      res.json(updatedLayout);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("❌ [Routes] Error updating layout:", error);
      res.status(500).json({ error: "Failed to update layout" });
    }
  });

  // Delete layout (protected)
  app.delete("/api/layouts/:id", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { id } = req.params;
    console.log(`🗑️ [Routes] DELETE /api/layouts/${id} - Deleting layout`);
    
    try {
      // Verify layout exists and check permissions
      const layout = await storage.getLayoutByUUID(id);
      
      if (!layout) {
        console.log(`❌ [Routes] Layout not found: ${id}`);
        return res.status(404).json({ error: "Layout not found" });
      }
      
      if (req.auth?.companyId && layout.companyId !== req.auth?.companyId) {
        console.log(`❌ [Routes] Authorization failed - Cannot delete layout from another company`);
        return res.status(403).json({ error: "Cannot delete layouts from other companies" });
      }
      
      // Check if layout has dependent assets
      const hasAssets = await storage.layoutHasAssets(id);
      if (hasAssets) {
        console.log(`❌ [Routes] Cannot delete layout - has dependent assets`);
        return res.status(409).json({ 
          error: "Cannot delete layout that is being used by assets. Please reassign or delete the assets first." 
        });
      }
      
      await storage.deleteLayout(id);
      console.log(`✅ [Routes] Layout deleted successfully: ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("❌ [Routes] Error deleting layout:", error);
      res.status(500).json({ error: "Failed to delete layout" });
    }
  });

  // Validate layout completeness (customer admin protected)
  app.get("/api/layouts/:id/validate", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { id } = req.params;
    console.log(`🔍 [Routes] GET /api/layouts/${id}/validate - Validating layout`);
    
    try {
      const layout = await storage.getLayoutByUUID(id);
      
      if (!layout) {
        console.log(`❌ [Routes] Layout not found: ${id}`);
        return res.status(404).json({ error: "Layout not found" });
      }
      
      if (!req.auth?.isSuperuser && req.auth?.companyId !== layout.companyId) {
        console.log(`❌ [Routes] Authorization failed - cannot validate layout from another company`);
        return res.status(403).json({ error: "Cannot validate layouts from other companies" });
      }
      
      const result = await storage.validateLayoutCompleteness(id);
      console.log(`✅ [Routes] Layout validation complete: ${result.isValid ? 'valid' : 'invalid'}`);
      res.json(result);
    } catch (error) {
      console.error("❌ [Routes] Error validating layout:", error);
      res.status(500).json({ error: "Failed to validate layout" });
    }
  });

  // Activate layout (with validation - customer admin protected)
  app.post("/api/layouts/:id/activate", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { id } = req.params;
    console.log(`🔄 [Routes] POST /api/layouts/${id}/activate - Activating layout`);
    
    try {
      const layout = await storage.getLayoutByUUID(id);
      
      if (!layout) {
        console.log(`❌ [Routes] Layout not found: ${id}`);
        return res.status(404).json({ error: "Layout not found" });
      }
      
      if (!req.auth?.isSuperuser && req.auth?.companyId !== layout.companyId) {
        console.log(`❌ [Routes] Authorization failed - cannot activate layout from another company`);
        return res.status(403).json({ error: "Cannot activate layouts from other companies" });
      }
      
      // Validate layout completeness before activation
      const validation = await storage.validateLayoutCompleteness(id);
      if (!validation.isValid) {
        console.log(`❌ [Routes] Layout validation failed: ${validation.errors.join(', ')}`);
        return res.status(400).json({ 
          error: "Layout is incomplete and cannot be activated",
          validationErrors: validation.errors 
        });
      }
      
      const updated = await storage.setLayoutActivation(id, true, req.auth?.companyId || undefined);
      console.log(`✅ [Routes] Layout activated successfully: ${id}`);
      res.json(updated);
    } catch (error) {
      console.error("❌ [Routes] Error activating layout:", error);
      res.status(500).json({ error: "Failed to activate layout" });
    }
  });

  // Deactivate layout (customer admin protected)
  app.post("/api/layouts/:id/deactivate", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { id } = req.params;
    console.log(`🔄 [Routes] POST /api/layouts/${id}/deactivate - Deactivating layout`);
    
    try {
      const layout = await storage.getLayoutByUUID(id);
      
      if (!layout) {
        console.log(`❌ [Routes] Layout not found: ${id}`);
        return res.status(404).json({ error: "Layout not found" });
      }
      
      if (!req.auth?.isSuperuser && req.auth?.companyId !== layout.companyId) {
        console.log(`❌ [Routes] Authorization failed - cannot deactivate layout from another company`);
        return res.status(403).json({ error: "Cannot deactivate layouts from other companies" });
      }
      
      const updated = await storage.setLayoutActivation(id, false, req.auth?.companyId || undefined);
      console.log(`✅ [Routes] Layout deactivated successfully: ${id}`);
      res.json(updated);
    } catch (error) {
      console.error("❌ [Routes] Error deactivating layout:", error);
      res.status(500).json({ error: "Failed to deactivate layout" });
    }
  });

  // Get zones for a layout (protected)
  app.get("/api/layouts/:layoutId/zones", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { layoutId } = req.params; // This is the layout UUID
    console.log(`📋 [Routes] GET /api/layouts/${layoutId}/zones - Fetching zones`);
    
    try {
      // Verify layout exists by UUID
      const layout = await storage.getLayoutByUUID(layoutId);
      
      if (!layout) {
        console.log(`❌ [Routes] Layout not found by UUID: ${layoutId}`);
        return res.status(404).json({ error: "Layout not found" });
      }
      
      // Enforce company scoping
      if (!req.auth?.isSuperuser && req.auth?.companyId !== layout.companyId) {
        console.log(`❌ [Routes] Authorization failed - cannot access layout from company ${layout.companyId}`);
        return res.status(403).json({ error: "Cannot access layouts from other companies" });
      }
      
      const zones = await storage.getLayoutZones(layout.id, layout.companyId);
      console.log(`✅ [Routes] Returning ${zones.length} zones for layout ${layout.layoutName}`);
      res.json(zones);
    } catch (error) {
      console.error("❌ [Routes] Error fetching zones:", error);
      res.status(500).json({ error: "Failed to fetch zones" });
    }
  });

  // Create zone (protected)
  app.post("/api/layouts/:layoutId/zones", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { layoutId } = req.params; // This is the layout UUID
    console.log(`➕ [Routes] POST /api/layouts/${layoutId}/zones - Creating zone, User: ${req.auth?.userId}`);
    
    try {
      // Verify layout exists by UUID and check permissions
      const layout = await storage.getLayoutByUUID(layoutId);
      
      if (!layout) {
        console.log(`❌ [Routes] Layout not found by UUID: ${layoutId}`);
        return res.status(404).json({ error: "Layout not found" });
      }
      
      // Enforce company scoping
      if (!req.auth?.isSuperuser && req.auth?.companyId !== layout.companyId) {
        console.log(`❌ [Routes] Authorization failed - cannot modify layout from company ${layout.companyId}`);
        return res.status(403).json({ error: "Cannot modify layouts from other companies" });
      }
      
      const insertData = insertLayoutZoneSchema.parse({
        ...req.body,
        layoutId: layout.id,
      });
      
      const zone = await storage.createLayoutZone(insertData, layout.companyId);
      console.log(`✅ [Routes] Zone created successfully for layout ${layout.layoutName} (${layout.id})`);
      res.json(zone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("❌ [Routes] Error creating zone:", error);
      res.status(500).json({ error: "Failed to create zone" });
    }
  });

  // Update zone (protected)
  app.patch("/api/zones/:id", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { id } = req.params;
    console.log(`🔄 [Routes] PATCH /api/zones/${id} - Updating zone`);
    
    try {
      const updateData = insertLayoutZoneSchema.partial().parse(req.body);
      
      const zone = await storage.updateLayoutZone(id, updateData, req.auth?.companyId || undefined);
      
      if (!zone) {
        console.log(`❌ [Routes] Zone not found or unauthorized`);
        return res.status(404).json({ error: "Zone not found" });
      }
      
      console.log(`✅ [Routes] Zone updated successfully`);
      res.json(zone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("❌ [Routes] Error updating zone:", error);
      res.status(500).json({ error: "Failed to update zone" });
    }
  });

  // Delete zone (protected)
  app.delete("/api/zones/:id", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { id } = req.params;
    console.log(`🗑️ [Routes] DELETE /api/zones/${id} - Deleting zone`);
    
    try {
      const deleted = await storage.deleteLayoutZone(id, req.auth?.companyId || undefined);
      
      if (!deleted) {
        console.log(`❌ [Routes] Zone not found or unauthorized`);
        return res.status(404).json({ error: "Zone not found" });
      }
      
      console.log(`✅ [Routes] Zone deleted successfully`);
      res.json({ success: true });
    } catch (error) {
      console.error("❌ [Routes] Error deleting zone:", error);
      res.status(500).json({ error: "Failed to delete zone" });
    }
  });

  // Upload zone image (protected) - max 800x400 pixels for TJpg_Decoder compatibility
  app.post("/api/zones/:id/image", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { id } = req.params;
    console.log(`🖼️ [Routes] POST /api/zones/${id}/image - Uploading zone image`);
    
    try {
      const { imageData } = req.body;
      
      if (!imageData || typeof imageData !== 'string') {
        return res.status(400).json({ error: "Missing imageData (base64 encoded JPEG)" });
      }
      
      // Validate base64 and decode
      const base64Pattern = /^data:image\/jpeg;base64,(.+)$/;
      const match = imageData.match(base64Pattern);
      
      let base64Data: string;
      if (match) {
        base64Data = match[1];
      } else {
        base64Data = imageData;
      }
      
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Basic JPEG validation (check magic bytes SOI marker)
      if (buffer.length < 2 || buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
        return res.status(400).json({ error: "Invalid JPEG image data" });
      }
      
      // Use sharp to decode and validate actual image dimensions
      let metadata;
      try {
        metadata = await sharp(buffer).metadata();
      } catch (sharpError) {
        console.log(`❌ [Routes] Failed to decode image: ${sharpError}`);
        return res.status(400).json({ error: "Failed to decode JPEG image" });
      }
      
      const actualWidth = metadata.width || 0;
      const actualHeight = metadata.height || 0;
      
      // Validate dimensions server-side (max 800x400 for TJpg_Decoder on embedded devices)
      if (actualWidth > 800 || actualHeight > 400) {
        console.log(`❌ [Routes] Image too large: ${actualWidth}x${actualHeight}`);
        return res.status(400).json({ 
          error: "Image too large", 
          message: `Maximum dimensions are 800x400 pixels. Your image is ${actualWidth}x${actualHeight}.` 
        });
      }
      
      if (metadata.format !== 'jpeg') {
        return res.status(400).json({ error: "Image must be JPEG format" });
      }
      
      console.log(`📦 [Routes] Decoded image: ${buffer.length} bytes, ${actualWidth}x${actualHeight}`);
      
      // Get the current zone to check for existing image
      const currentZone = await storage.getLayoutZoneById(id, req.auth?.companyId || undefined);
      if (!currentZone) {
        console.log(`❌ [Routes] Zone not found or unauthorized`);
        return res.status(404).json({ error: "Zone not found" });
      }
      
      const oldImageId = currentZone.imageId;
      
      // Create new image
      const imageId = await storage.createZoneImage(buffer);
      
      // Update zone with new image reference
      const updatedZone = await storage.updateLayoutZone(id, { imageId }, req.auth?.companyId || undefined);
      
      if (!updatedZone) {
        return res.status(500).json({ error: "Failed to update zone with image" });
      }
      
      // Delete old image if exists (cleanup)
      if (oldImageId) {
        await storage.deleteZoneImage(oldImageId);
        console.log(`🗑️ [Routes] Deleted old zone image: ${oldImageId}`);
      }
      
      console.log(`✅ [Routes] Zone image uploaded: ${imageId}`);
      res.status(201).json({ 
        success: true,
        imageId,
        width: actualWidth,
        height: actualHeight,
        size: buffer.length
      });
    } catch (error) {
      console.error("❌ [Routes] Error uploading zone image:", error);
      res.status(500).json({ 
        error: "Failed to upload image",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Delete zone image (protected)
  app.delete("/api/zones/:id/image", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { id } = req.params;
    console.log(`🗑️ [Routes] DELETE /api/zones/${id}/image - Deleting zone image`);
    
    try {
      // Get the current zone
      const zone = await storage.getLayoutZoneById(id, req.auth?.companyId || undefined);
      if (!zone) {
        console.log(`❌ [Routes] Zone not found or unauthorized`);
        return res.status(404).json({ error: "Zone not found" });
      }
      
      if (!zone.imageId) {
        return res.status(404).json({ error: "Zone has no image" });
      }
      
      const imageId = zone.imageId;
      
      // Clear the image reference from zone
      await storage.updateLayoutZone(id, { imageId: null }, req.auth?.companyId || undefined);
      
      // Delete the image from zone_images
      await storage.deleteZoneImage(imageId);
      
      console.log(`✅ [Routes] Zone image deleted: ${imageId}`);
      res.json({ success: true });
    } catch (error) {
      console.error("❌ [Routes] Error deleting zone image:", error);
      res.status(500).json({ error: "Failed to delete zone image" });
    }
  });

  // Get zone image as JPEG (protected)
  app.get("/api/zones/:id/image", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { id } = req.params;
    console.log(`🖼️ [Routes] GET /api/zones/${id}/image - Fetching zone image`);
    
    try {
      // Get the zone
      const zone = await storage.getLayoutZoneById(id, req.auth?.companyId || undefined);
      if (!zone) {
        console.log(`❌ [Routes] Zone not found or unauthorized`);
        return res.status(404).json({ error: "Zone not found" });
      }
      
      if (!zone.imageId) {
        return res.status(404).json({ error: "Zone has no image" });
      }
      
      // Get the image
      const image = await storage.getZoneImage(zone.imageId);
      if (!image) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Length', image.imageData.length.toString());
      res.send(image.imageData);
    } catch (error) {
      console.error("❌ [Routes] Error fetching zone image:", error);
      res.status(500).json({ error: "Failed to fetch zone image" });
    }
  });

  // Get components for a zone (protected)
  app.get("/api/zones/:zoneId/components", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { zoneId } = req.params;
    console.log(`📋 [Routes] GET /api/zones/${zoneId}/components - Fetching components`);
    
    try {
      const components = await storage.getZoneComponents(zoneId, req.auth?.companyId || undefined);
      console.log(`✅ [Routes] Returning ${components.length} components`);
      res.json(components);
    } catch (error) {
      if (error instanceof Error && error.message.includes("unauthorized")) {
        console.log(`❌ [Routes] Unauthorized access attempt`);
        return res.status(403).json({ error: "Zone not found or unauthorized" });
      }
      console.error("❌ [Routes] Error fetching components:", error);
      res.status(500).json({ error: "Failed to fetch components" });
    }
  });

  // Create component (protected)
  app.post("/api/zones/:zoneId/components", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { zoneId } = req.params;
    console.log(`➕ [Routes] POST /api/zones/${zoneId}/components - Creating component`);
    
    try {
      const insertData = insertLayoutZoneComponentSchema.parse({
        ...req.body,
        zoneId,
      });
      
      const component = await storage.createComponent(insertData, req.auth?.companyId || undefined);
      console.log(`✅ [Routes] Component created successfully`);
      res.json(component);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      if (error instanceof Error && error.message.includes("unauthorized")) {
        console.log(`❌ [Routes] Unauthorized access attempt`);
        return res.status(403).json({ error: "Zone not found or unauthorized" });
      }
      console.error("❌ [Routes] Error creating component:", error);
      res.status(500).json({ error: "Failed to create component" });
    }
  });

  // Update component (protected)
  app.patch("/api/components/:id", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { id } = req.params;
    console.log(`🔄 [Routes] PATCH /api/components/${id} - Updating component`);
    
    try {
      const updateData = insertLayoutZoneComponentSchema.partial().parse(req.body);
      const component = await storage.updateComponent(id, updateData, req.auth?.companyId || undefined);
      
      if (!component) {
        console.log(`❌ [Routes] Component not found or unauthorized`);
        return res.status(404).json({ error: "Component not found" });
      }
      
      console.log(`✅ [Routes] Component updated successfully`);
      res.json(component);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("❌ [Routes] Error updating component:", error);
      res.status(500).json({ error: "Failed to update component" });
    }
  });

  // Delete component (protected)
  app.delete("/api/components/:id", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { id } = req.params;
    console.log(`🗑️ [Routes] DELETE /api/components/${id} - Deleting component`);
    
    try {
      const deleted = await storage.deleteComponent(id, req.auth?.companyId || undefined);
      
      if (!deleted) {
        console.log(`❌ [Routes] Component not found or unauthorized`);
        return res.status(404).json({ error: "Component not found" });
      }
      
      console.log(`✅ [Routes] Component deleted successfully`);
      res.json({ success: true });
    } catch (error) {
      console.error("❌ [Routes] Error deleting component:", error);
      res.status(500).json({ error: "Failed to delete component" });
    }
  });

  // Get defects for a component (protected)
  app.get("/api/components/:componentId/defects", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { componentId } = req.params;
    console.log(`📋 [Routes] GET /api/components/${componentId}/defects - Fetching defects`);
    
    try {
      const defects = await storage.getComponentDefects(componentId, req.auth?.companyId || undefined);
      console.log(`✅ [Routes] Returning ${defects.length} defects`);
      res.json(defects);
    } catch (error) {
      if (error instanceof Error && error.message.includes("unauthorized")) {
        console.log(`❌ [Routes] Unauthorized access attempt`);
        return res.status(403).json({ error: "Component not found or unauthorized" });
      }
      console.error("❌ [Routes] Error fetching defects:", error);
      res.status(500).json({ error: "Failed to fetch defects" });
    }
  });

  // Create component defect (protected)
  app.post("/api/components/:componentId/defects", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { componentId } = req.params;
    console.log(`➕ [Routes] POST /api/components/${componentId}/defects - Creating defect`);
    
    try {
      const insertData = insertComponentDefectSchema.parse({
        ...req.body,
        componentId,
      });
      
      const defect = await storage.createComponentDefect(insertData, req.auth?.companyId || undefined);
      console.log(`✅ [Routes] Defect created successfully`);
      res.json(defect);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      if (error instanceof Error && error.message.includes("unauthorized")) {
        console.log(`❌ [Routes] Unauthorized access attempt`);
        return res.status(403).json({ error: "Component not found or unauthorized" });
      }
      console.error("❌ [Routes] Error creating defect:", error);
      res.status(500).json({ error: "Failed to create defect" });
    }
  });

  // Update component defect (protected)
  app.patch("/api/component-defects/:id", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { id } = req.params;
    console.log(`🔄 [Routes] PATCH /api/component-defects/${id} - Updating defect`);
    
    try {
      const updateData = insertComponentDefectSchema.partial().parse(req.body);
      const defect = await storage.updateComponentDefect(id, updateData, req.auth?.companyId || undefined);
      
      if (!defect) {
        console.log(`❌ [Routes] Defect not found or unauthorized`);
        return res.status(404).json({ error: "Defect not found" });
      }
      
      console.log(`✅ [Routes] Defect updated successfully`);
      res.json(defect);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("❌ [Routes] Error updating defect:", error);
      res.status(500).json({ error: "Failed to update defect" });
    }
  });

  // Delete component defect (protected)
  app.delete("/api/component-defects/:id", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { id } = req.params;
    console.log(`🗑️ [Routes] DELETE /api/component-defects/${id} - Deleting defect`);
    
    try {
      const deleted = await storage.deleteComponentDefect(id, req.auth?.companyId || undefined);
      
      if (!deleted) {
        console.log(`❌ [Routes] Defect not found or unauthorized`);
        return res.status(404).json({ error: "Defect not found" });
      }
      
      console.log(`✅ [Routes] Defect deleted successfully`);
      res.json({ success: true });
    } catch (error) {
      console.error("❌ [Routes] Error deleting defect:", error);
      res.status(500).json({ error: "Failed to delete defect" });
    }
  });

  // === INSPECTION TYPE ROUTES ===

  // Get available filter values for inspection types (protected)
  app.get("/api/inspection-types/filter-values", requireCustomerAdmin, async (req: AuthRequest, res) => {
    console.log(`🔍 [Routes] GET /api/inspection-types/filter-values - User: ${req.auth?.userId}`);
    
    try {
      const companyId = req.auth?.companyId || (req.query.companyId as string | undefined);
      
      if (req.auth?.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping for inspection type filter values - Company: ${req.auth?.companyId}`);
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
  app.get("/api/inspection-types", requireCustomerAdmin, async (req: AuthRequest, res) => {
    console.log(`📋 [Routes] GET /api/inspection-types - User: ${req.auth?.userId}, Requested companyId: ${req.query.companyId || 'NONE'}`);
    
    try {
      const params = inspectionTypeQueryParamsSchema.parse(req.query);
      
      // Enforce company scoping
      if (req.auth?.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping - User restricted to: ${req.auth?.companyId}`);
        params.companyId = req.auth?.companyId;
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
  app.get("/api/inspection-types/:inspectionTypeName", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { inspectionTypeName } = req.params;
    console.log(`🔍 [Routes] GET /api/inspection-types/${inspectionTypeName} - User: ${req.auth?.userId}`);
    
    try {
      // Pass companyId to ensure we get the right inspection type when business IDs are shared across companies
      const companyId = req.auth?.companyId || undefined;
      const inspectionType = await storage.getInspectionTypeById(inspectionTypeName, companyId);
      
      if (!inspectionType) {
        console.log(`❌ [Routes] Inspection type not found: ${inspectionTypeName}`);
        return res.status(404).json({ error: "Inspection type not found" });
      }
      
      // Enforce company scoping (already filtered by getInspectionTypeById, but double-check for superusers)
      if (req.auth?.companyId && inspectionType.companyId !== req.auth?.companyId) {
        console.log(`❌ [Routes] Authorization failed - Cannot access inspection type from another company`);
        return res.status(403).json({ error: "Cannot access inspection types from other companies" });
      }
      
      console.log(`✅ [Routes] Inspection type found: ${inspectionTypeName}`);
      res.json(inspectionType);
    } catch (error) {
      console.error("❌ [Routes] Error fetching inspection type:", error);
      res.status(500).json({ error: "Failed to fetch inspection type" });
    }
  });

  // Create a new inspection type (protected)
  app.post("/api/inspection-types", requireCustomerAdmin, async (req: AuthRequest, res) => {
    console.log(`➕ [Routes] POST /api/inspection-types - Creating inspection type: ${req.body?.inspectionTypeName || 'UNKNOWN'}`);
    
    try {
      const { layoutIds, ...inspectionTypeBody } = req.body;
      const inspectionTypeData = insertInspectionTypeSchema.parse(inspectionTypeBody);
      
      // Enforce company scoping: non-superusers must create inspection types in their own company
      if (req.auth?.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping - Inspection type will be created in: ${req.auth?.companyId}`);
        inspectionTypeData.companyId = req.auth?.companyId;
      }
      
      if (!inspectionTypeData.companyId) {
        console.log(`❌ [Routes] Cannot create inspection type without company ID`);
        return res.status(400).json({ error: "Company ID is required" });
      }
      
      const inspectionType = await storage.createInspectionType(inspectionTypeData);
      console.log(`✅ [Routes] Inspection type created successfully: ${inspectionType.inspectionTypeName}`);
      
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
  app.patch("/api/inspection-types/:inspectionTypeName", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { inspectionTypeName } = req.params;
    console.log(`🔄 [Routes] PATCH /api/inspection-types/${inspectionTypeName} - Updating inspection type`);
    
    try {
      const { layoutIds, ...inspectionTypeBody } = req.body;
      const updateData = insertInspectionTypeSchema.partial().parse(inspectionTypeBody);
      
      // Get the existing inspection type to check authorization (use companyId for proper scoping)
      const companyId = req.auth?.companyId || undefined;
      const existingInspectionType = await storage.getInspectionTypeById(inspectionTypeName, companyId);
      
      if (!existingInspectionType) {
        console.log(`❌ [Routes] Inspection type not found: ${inspectionTypeName}`);
        return res.status(404).json({ error: "Inspection type not found" });
      }
      
      // Enforce company scoping (already filtered by getInspectionTypeById, but double-check for superusers)
      if (req.auth?.companyId && existingInspectionType.companyId !== req.auth?.companyId) {
        console.log(`❌ [Routes] Authorization failed - Cannot update inspection type from another company`);
        return res.status(403).json({ error: "Cannot update inspection types from other companies" });
      }
      
      const updatedInspectionType = await storage.updateInspectionType(inspectionTypeName, updateData);
      if (!updatedInspectionType) {
        return res.status(404).json({ error: "Inspection type not found" });
      }
      
      // Handle layout associations (empty array = all layouts)
      if (layoutIds !== undefined) {
        const layoutIdsArray = Array.isArray(layoutIds) ? layoutIds : [];
        await storage.setInspectionTypeLayouts(existingInspectionType.id, layoutIdsArray);
        console.log(`✅ [Routes] Layout associations updated: ${layoutIdsArray.length === 0 ? 'ALL' : layoutIdsArray.length} layout(s)`);
      }
      
      console.log(`✅ [Routes] Inspection type updated successfully: ${inspectionTypeName}`);
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
  app.get("/api/inspection-types/:inspectionTypeName/form-fields", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { inspectionTypeName } = req.params;
    console.log(`🔍 [Routes] GET /api/inspection-types/${inspectionTypeName}/form-fields - Fetching form fields`);
    
    try {
      // Verify the inspection type exists and user has access (use companyId for proper scoping)
      const companyId = req.auth?.companyId || undefined;
      const inspectionType = await storage.getInspectionTypeById(inspectionTypeName, companyId);
      if (!inspectionType) {
        console.log(`❌ [Routes] Inspection type not found: ${inspectionTypeName}`);
        return res.status(404).json({ error: "Inspection type not found" });
      }
      
      // Enforce company scoping (already filtered by getInspectionTypeById, but double-check for superusers)
      if (req.auth?.companyId && inspectionType.companyId !== req.auth?.companyId) {
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
  app.post("/api/inspection-types/:inspectionTypeName/form-fields", requireCustomerAdmin, async (req: AuthRequest, res) => {
    const { inspectionTypeName } = req.params;
    console.log(`➕ [Routes] POST /api/inspection-types/${inspectionTypeName}/form-fields - Creating form field`);
    
    try {
      // Verify the inspection type exists and user has access (use companyId for proper scoping)
      const companyId = req.auth?.companyId || undefined;
      const inspectionType = await storage.getInspectionTypeById(inspectionTypeName, companyId);
      if (!inspectionType) {
        console.log(`❌ [Routes] Inspection type not found: ${inspectionTypeName}`);
        return res.status(404).json({ error: "Inspection type not found" });
      }
      
      // Enforce company scoping
      if (req.auth?.companyId && inspectionType.companyId !== req.auth?.companyId) {
        console.log(`❌ [Routes] Authorization failed - Cannot add form fields to inspection type from another company`);
        return res.status(403).json({ error: "Cannot modify inspection types from other companies" });
      }
      
      const formFieldData = insertInspectionTypeFormFieldSchema.parse({
        ...req.body,
        inspectionTypeId: inspectionType.id, // Use UUID id, not business inspectionTypeName
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
  app.patch("/api/inspection-type-form-fields/:id", requireAuth, async (req: AuthRequest, res) => {
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
      if (req.auth?.companyId && inspectionType.companyId !== req.auth?.companyId) {
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
  app.delete("/api/inspection-type-form-fields/:id", requireAuth, async (req: AuthRequest, res) => {
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
      if (req.auth?.companyId && inspectionType.companyId !== req.auth?.companyId) {
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
  app.get("/api/inspections/filter-values", requireAuth, async (req: AuthRequest, res) => {
    console.log(`🔍 [Routes] GET /api/inspections/filter-values - User: ${req.auth?.userId}, CompanyId: ${req.auth?.companyId || 'null (superuser)'}`);
    
    try {
      // Enforce company scoping: use session's companyId unless user is superuser
      const companyId = req.auth?.companyId || (req.query.companyId as string | undefined);
      
      if (req.auth?.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping for filter values - Company: ${req.auth?.companyId}`);
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

  // Get inspection analytics for dashboard (protected)
  app.get("/api/inspections/analytics", requireAuth, async (req: AuthRequest, res) => {
    console.log(`📊 [Routes] GET /api/inspections/analytics - User: ${req.auth?.userId}`);
    
    try {
      // Enforce company scoping
      const companyId = req.auth?.companyId || (req.query.companyId as string | undefined);
      
      if (!companyId) {
        return res.status(400).json({ error: "Company ID is required" });
      }
      
      const analytics = await storage.getInspectionAnalytics(companyId);
      res.json(analytics);
    } catch (error) {
      console.error("❌ [Routes] Error fetching inspection analytics:", error);
      res.status(500).json({ error: "Failed to fetch inspection analytics" });
    }
  });

  // Get all inspections with their defects (with query params for search, sort, pagination) (protected)
  app.get("/api/inspections", requireAuth, async (req: AuthRequest, res) => {
    console.log(`📋 [Routes] GET /api/inspections - User: ${req.auth?.userId}, Requested companyId: ${req.query.companyId || 'NONE'}`);
    
    try {
      const params = queryParamsSchema.parse(req.query);
      
      // Enforce company scoping: override companyId with session's companyId
      // unless user is superuser (companyId is null, like avazquez)
      if (req.auth?.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping - User restricted to: ${req.auth?.companyId}`);
        params.companyId = req.auth?.companyId;
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
  app.get("/api/inspections/print-list", requireAuth, async (req: AuthRequest, res) => {
    try {
      const params = queryParamsSchema.parse(req.query);
      
      // Enforce company scoping
      if (req.auth?.companyId) {
        params.companyId = req.auth?.companyId;
      }
      
      // Override limit to max 100 for printing
      params.limit = 100;
      params.page = 1;
      
      const result = await storage.getInspections(params);
      const companies = await storage.getCompanies();
      const company = companies.find(c => c.id === params.companyId);
      
      // Get all assets for license plates
      const assetsResult = await storage.getAssets({ 
        companyId: params.companyId, 
        limit: 10000 
      });
      
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
    h2 { font-size: 18px; margin-top: 20px; margin-bottom: 10px; }
    .summary { margin-bottom: 30px; color: #666; }
    .inspection { border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; page-break-inside: avoid; }
    .inspection h2 { font-size: 16px; margin: 0 0 10px 0; }
    .info-row { margin-bottom: 5px; font-size: 14px; }
    .label { font-weight: bold; display: inline-block; width: 150px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    th, td { text-align: left; padding: 6px; border: 1px solid #ddd; }
    th { background-color: #f5f5f5; font-weight: bold; }
  </style>
</head>
<body>
  <h1>EQUIPMENT INSPECTION LIST</h1>
  <div class="summary">
    ${company ? `Company: ${company.name}<br>` : ''}
    ${company?.address ? `Address: ${company.address}<br>` : ''}
    ${company?.dotNumber ? `DOT Number: ${company.dotNumber}<br>` : ''}
    Total Inspections: ${result.total}
  </div>
  
  ${result.data.map(inspection => {
    const date = new Date(inspection.datetime);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString();
    const primaryAssetId = inspection.assets && inspection.assets.length > 0 ? inspection.assets[0] : 'N/A';
    const asset = assetsResult.data.find(a => a.assetId === primaryAssetId);
    
    // Parse inspection form data
    let formDataRows = '';
    if (inspection.inspectionFormData) {
      try {
        const formData = JSON.parse(inspection.inspectionFormData);
        formDataRows = Object.entries(formData).map(([key, value]) => `
        <tr>
          <td>${key}</td>
          <td>${value || '—'}</td>
        </tr>
        `).join('');
      } catch (e) {
        formDataRows = '<tr><td colspan="2">Unable to parse form data</td></tr>';
      }
    }
    
    return `
  <div class="inspection">
    <h2>Inspection: ${primaryAssetId} - ${formattedDate}</h2>
    <div class="info-row"><span class="label">Date/Time:</span> ${formattedDate} ${formattedTime}</div>
    <div class="info-row"><span class="label">Type:</span> ${inspection.inspectionType}</div>
    <div class="info-row"><span class="label">Asset ID${inspection.assets && inspection.assets.length > 1 ? 's' : ''}:</span> ${inspection.assets && inspection.assets.length > 0 ? inspection.assets.join(', ') : 'N/A'}</div>
    ${asset?.licensePlate ? `<div class="info-row"><span class="label">License Plate:</span> ${asset.licensePlate}</div>` : ''}
    <div class="info-row"><span class="label">Driver:</span> ${inspection.driverName} (${inspection.driverId})</div>
    
    ${formDataRows ? `
    <h2>Inspection Form Data</h2>
    <table>
      <thead>
        <tr>
          <th>Field</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        ${formDataRows}
      </tbody>
    </table>
    ` : ''}
    
    ${inspection.defects && inspection.defects.length > 0 ? `
    <h2>Defects</h2>
    <table>
      <thead>
        <tr>
          <th>Asset ID</th>
          <th>Zone</th>
          <th>Component</th>
          <th>Defect</th>
          <th>Severity</th>
          <th>Driver Notes</th>
          <th>Inspection Time</th>
          <th>Status</th>
          <th>Mechanic</th>
          <th>Repair Date</th>
          <th>Repair Notes</th>
        </tr>
      </thead>
      <tbody>
        ${inspection.defects
          .filter(d => d.severity > 0)
          .sort((a, b) => {
            // Sort by asset ID first
            if (a.assetId < b.assetId) return -1;
            if (a.assetId > b.assetId) return 1;
            // Then by inspection time
            const timeA = a.inspectedAtUtc ? new Date(a.inspectedAtUtc).getTime() : new Date(inspection.datetime).getTime();
            const timeB = b.inspectedAtUtc ? new Date(b.inspectedAtUtc).getTime() : new Date(inspection.datetime).getTime();
            return timeA - timeB;
          })
          .map(d => {
          const inspTime = d.inspectedAtUtc 
            ? new Date(d.inspectedAtUtc).toLocaleString() 
            : new Date(inspection.datetime).toLocaleString();
          const repairDate = d.repairDate 
            ? new Date(d.repairDate).toLocaleDateString()
            : '—';
          return `
        <tr>
          <td>${d.assetId}</td>
          <td>${d.zoneName}</td>
          <td>${d.componentName}</td>
          <td>${d.defect}</td>
          <td>${d.severity}</td>
          <td>${d.driverNotes || '—'}</td>
          <td>${inspTime}</td>
          <td>${d.status || 'open'}</td>
          <td>${d.mechanicName || '—'}</td>
          <td>${repairDate}</td>
          <td>${d.repairNotes || '—'}</td>
        </tr>
        `;
        }).join('')}
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
  app.get("/api/inspections/:id/print", requireAuth, async (req: AuthRequest, res) => {
    try {
      const inspection = await storage.getInspection(req.params.id);
      if (!inspection) {
        return res.status(404).send("<html><body><h1>Inspection not found</h1></body></html>");
      }
      
      // Verify user has access to this inspection's company
      if (req.auth?.companyId && inspection.companyId !== req.auth?.companyId) {
        return res.status(403).send("<html><body><h1>Access denied</h1></body></html>");
      }
      
      // Get company details
      const companies = await storage.getCompanies();
      const company = companies.find(c => c.id === inspection.companyId);
      
      // Get asset details for license plates
      const assetsResult = await storage.getAssets({ 
        companyId: inspection.companyId, 
        limit: 10000 
      });
      
      // Build asset info string
      const assetIds = inspection.assets && inspection.assets.length > 0 
        ? inspection.assets 
        : ['N/A'];
      const assetInfo = assetIds.map(assetId => {
        if (assetId === 'N/A') return assetId;
        const asset = assetsResult.data.find(a => a.assetId === assetId);
        const licensePlate = asset?.licensePlate ? ` (${asset.licensePlate})` : '';
        return `${assetId}${licensePlate}`;
      }).join(', ');
      
      // Format date
      const date = new Date(inspection.datetime);
      const formattedDate = date.toLocaleDateString();
      const formattedTime = date.toLocaleTimeString();
      
      // Parse inspection form data
      let formDataRows = '';
      if (inspection.inspectionFormData) {
        try {
          const formData = JSON.parse(inspection.inspectionFormData);
          formDataRows = Object.entries(formData).map(([key, value]) => `
          <tr>
            <td>${key}</td>
            <td>${value || '—'}</td>
          </tr>
          `).join('');
        } catch (e) {
          formDataRows = '<tr><td colspan="2">Unable to parse form data</td></tr>';
        }
      }
      
      // Generate simple HTML
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Inspection Report - ${assetIds.join(', ')}</title>
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
  ${company?.address ? `<div class="info-row"><span class="label">Address:</span> ${company.address}</div>` : ''}
  ${company?.dotNumber ? `<div class="info-row"><span class="label">DOT Number:</span> ${company.dotNumber}</div>` : ''}
  <div class="info-row"><span class="label">Inspection ID:</span> ${inspection.id}</div>
  <div class="info-row"><span class="label">Date:</span> ${formattedDate}</div>
  <div class="info-row"><span class="label">Time:</span> ${formattedTime}</div>
  <div class="info-row"><span class="label">Type:</span> ${inspection.inspectionType}</div>
  <div class="info-row"><span class="label">Asset${assetIds.length > 1 ? 's' : ''}:</span> ${assetInfo}</div>
  <div class="info-row"><span class="label">Driver:</span> ${inspection.driverName}</div>
  <div class="info-row"><span class="label">Driver ID:</span> ${inspection.driverId}</div>
  
  ${formDataRows ? `
  <h2>Inspection Form Data</h2>
  <table>
    <thead>
      <tr>
        <th>Field</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      ${formDataRows}
    </tbody>
  </table>
  ` : ''}
  
  <h2>Defects</h2>
  ${inspection.defects && inspection.defects.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>Asset ID</th>
        <th>Zone</th>
        <th>Component</th>
        <th>Defect</th>
        <th>Severity</th>
        <th>Driver Notes</th>
        <th>Status</th>
        <th>Mechanic</th>
        <th>Repair Date</th>
        <th>Repair Notes</th>
        <th>Inspection Time</th>
      </tr>
    </thead>
    <tbody>
      ${inspection.defects
        .filter(d => d.severity > 0)
        .sort((a, b) => {
          // Sort by asset ID first
          if (a.assetId < b.assetId) return -1;
          if (a.assetId > b.assetId) return 1;
          // Then by inspection time
          const timeA = a.inspectedAtUtc ? new Date(a.inspectedAtUtc).getTime() : new Date(inspection.datetime).getTime();
          const timeB = b.inspectedAtUtc ? new Date(b.inspectedAtUtc).getTime() : new Date(inspection.datetime).getTime();
          return timeA - timeB;
        })
        .map(d => {
        const inspTime = d.inspectedAtUtc 
          ? new Date(d.inspectedAtUtc).toLocaleString() 
          : new Date(inspection.datetime).toLocaleString();
        const repairDateFormatted = d.repairDate ? new Date(d.repairDate).toLocaleDateString() : '—';
        return `
      <tr>
        <td>${d.assetId}</td>
        <td>${d.zoneName}</td>
        <td>${d.componentName}</td>
        <td>${d.defect}</td>
        <td>${d.severity}</td>
        <td>${d.driverNotes || '—'}</td>
        <td>${d.status}</td>
        <td>${d.mechanicName || '—'}</td>
        <td>${repairDateFormatted}</td>
        <td>${d.repairNotes || '—'}</td>
        <td>${inspTime}</td>
      </tr>
      `;
      }).join('')}
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
  app.get("/api/inspections/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const inspection = await storage.getInspection(req.params.id);
      if (!inspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      
      // Verify user has access to this inspection's company
      if (req.auth?.companyId && inspection.companyId !== req.auth?.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(inspection);
    } catch (error) {
      console.error("Error fetching inspection:", error);
      res.status(500).json({ error: "Failed to fetch inspection" });
    }
  });

  // Create a new inspection (protected)
  app.post("/api/inspections", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertInspectionSchema.parse(req.body);
      
      // Enforce company scoping: user can only create inspections for their company
      if (req.auth?.companyId && validatedData.companyId !== req.auth?.companyId) {
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
  app.patch("/api/inspections/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      // First, verify user has access to this inspection
      const existingInspection = await storage.getInspection(req.params.id);
      if (!existingInspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      
      if (req.auth?.companyId && existingInspection.companyId !== req.auth?.companyId) {
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
  app.delete("/api/inspections/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      // First, verify user has access to this inspection
      const existingInspection = await storage.getInspection(req.params.id);
      if (!existingInspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      
      if (req.auth?.companyId && existingInspection.companyId !== req.auth?.companyId) {
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
  app.get("/api/defects/filter-values", requireAuth, async (req: AuthRequest, res) => {
    console.log(`🔍 [Routes] GET /api/defects/filter-values - User: ${req.auth?.userId}, CompanyId: ${req.auth?.companyId || 'null (superuser)'}`);
    
    try {
      // Enforce company scoping: use session's companyId unless user is superuser
      const companyId = req.auth?.companyId || (req.query.companyId as string | undefined);
      
      if (req.auth?.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping for filter values - Company: ${req.auth?.companyId}`);
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

  // Get defect analytics for dashboard (protected)
  app.get("/api/defects/analytics", requireAuth, async (req: AuthRequest, res) => {
    console.log(`📊 [Routes] GET /api/defects/analytics - User: ${req.auth?.userId}`);
    
    try {
      // Enforce company scoping
      const companyId = req.auth?.companyId || (req.query.companyId as string | undefined);
      
      if (!companyId) {
        return res.status(400).json({ error: "Company ID is required" });
      }
      
      const analytics = await storage.getDefectAnalytics(companyId);
      res.json(analytics);
    } catch (error) {
      console.error("❌ [Routes] Error fetching defect analytics:", error);
      res.status(500).json({ error: "Failed to fetch defect analytics" });
    }
  });

  // Get all defects with pagination, search, and filters (protected)
  app.get("/api/defects", requireAuth, async (req: AuthRequest, res) => {
    console.log(`📋 [Routes] GET /api/defects - User: ${req.auth?.userId}, Requested companyId: ${req.query.companyId || 'NONE'}`);
    
    try {
      const params = defectQueryParamsSchema.parse(req.query);
      
      // Enforce company scoping: override companyId with session's companyId
      // unless user is superuser (companyId is null, like avazquez)
      if (req.auth?.companyId) {
        console.log(`🔒 [Routes] Enforcing company scoping - User restricted to: ${req.auth?.companyId}`);
        params.companyId = req.auth?.companyId;
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
  app.post("/api/defects", requireAuth, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertDefectSchema.parse(req.body);
      
      // Verify user has access to the parent inspection
      const inspection = await storage.getInspection(validatedData.inspectionId);
      if (!inspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      
      if (req.auth?.companyId && inspection.companyId !== req.auth?.companyId) {
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
  app.patch("/api/defects/:id", requireAuth, async (req: AuthRequest, res) => {
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
      
      if (req.auth?.companyId && inspection.companyId !== req.auth?.companyId) {
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

  // Batch update defects for repair (protected)
  app.patch("/api/defects/batch/repair", requireAuth, async (req: AuthRequest, res) => {
    console.log(`🔧 [Routes] PATCH /api/defects/batch/repair - User: ${req.auth?.userId}, Company: ${req.auth?.companyId || 'superuser'}`);
    
    try {
      const repairSchema = z.object({
        defectIds: z.array(z.string()).min(1, "At least one defect ID is required"),
        mechanicName: z.string().min(1, "Mechanic name is required"),
        repairDate: z.string().datetime(),
        status: z.enum(["repaired", "not-needed", "open"]),
        repairNotes: z.string().optional(),
      });
      
      const { defectIds, mechanicName, repairDate, status, repairNotes } = repairSchema.parse(req.body);
      
      // Validate repair date parses correctly
      const parsedRepairDate = new Date(repairDate);
      if (isNaN(parsedRepairDate.getTime())) {
        return res.status(400).json({ error: "Invalid repair date format" });
      }
      
      console.log(`🔍 [Routes] Validating access to ${defectIds.length} defects`);
      
      // Verify user has access to all defects by fetching them first
      const defectsToCheck: Array<{ defect: Defect; inspection: InspectionWithDefects }> = [];
      
      for (const defectId of defectIds) {
        const existingDefect = await storage.getDefectById(defectId);
        if (!existingDefect) {
          return res.status(404).json({ error: `Defect ${defectId} not found` });
        }
        
        const inspection = await storage.getInspection(existingDefect.inspectionId);
        if (!inspection) {
          return res.status(404).json({ error: `Inspection for defect ${defectId} not found` });
        }
        
        // Enforce company scoping - users can only update defects from their company
        if (req.auth?.companyId && inspection.companyId !== req.auth?.companyId) {
          console.log(`❌ [Routes] Access denied - defect ${defectId} belongs to company ${inspection.companyId}, user is in company ${req.auth?.companyId}`);
          return res.status(403).json({ error: "Access denied: cannot update defects from other companies" });
        }
        
        defectsToCheck.push({ defect: existingDefect, inspection });
      }
      
      // All defects validated - now update them with company scoping enforced at storage layer
      const updatedDefects = await storage.batchUpdateDefects(
        defectIds,
        {
          mechanicName,
          repairDate: parsedRepairDate,
          status,
          repairNotes: repairNotes ?? null,
        },
        req.auth?.companyId ?? undefined // Pass companyId for double-checking at storage layer
      );
      
      // Verify all requested defects were updated
      if (updatedDefects.length !== defectIds.length) {
        console.log(`⚠️ [Routes] Warning: Only ${updatedDefects.length} of ${defectIds.length} defects were updated`);
        return res.status(500).json({ 
          error: `Only ${updatedDefects.length} of ${defectIds.length} defects were updated. This may indicate a permissions issue.` 
        });
      }
      
      console.log(`✅ [Routes] Successfully updated ${updatedDefects.length} defects`);
      res.json({ success: true, updated: updatedDefects.length, defects: updatedDefects });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("❌ [Routes] Error batch updating defects:", error);
      res.status(500).json({ error: "Failed to update defects" });
    }
  });

  // Delete a defect (protected)
  app.delete("/api/defects/:id", requireAuth, async (req: AuthRequest, res) => {
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
      
      if (req.auth?.companyId && inspection.companyId !== req.auth?.companyId) {
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
  app.get("/api/inspections/:id/defects", requireAuth, async (req: AuthRequest, res) => {
    try {
      // Verify user has access to the parent inspection
      const inspection = await storage.getInspection(req.params.id);
      if (!inspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      
      if (req.auth?.companyId && inspection.companyId !== req.auth?.companyId) {
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
