import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertInspectionSchema, insertDefectSchema } from "@shared/schema";
import { z } from "zod";

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
