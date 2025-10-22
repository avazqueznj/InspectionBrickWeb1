import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertInspectionSchema, insertDefectSchema } from "@shared/schema";
import { z } from "zod";

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
    try {
      const { userId, password } = loginSchema.parse(req.body);
      const user = await storage.authenticateUser(userId, password);
      
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Set session
      req.session.userId = user.userId;
      req.session.companyId = user.companyId;
      
      // Return user info (without password)
      res.json({
        userId: user.userId,
        companyId: user.companyId,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Error during login:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Auth: Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error during logout:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Auth: Get current user
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "User not found" });
      }
      
      res.json({
        userId: user.userId,
        companyId: user.companyId,
      });
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Get all companies
  app.get("/api/companies", async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  // Get all inspections with their defects (with query params for search, sort, pagination)
  app.get("/api/inspections", async (req, res) => {
    try {
      const params = queryParamsSchema.parse(req.query);
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

  // Get a single inspection by ID
  app.get("/api/inspections/:id", async (req, res) => {
    try {
      const inspection = await storage.getInspection(req.params.id);
      if (!inspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      res.json(inspection);
    } catch (error) {
      console.error("Error fetching inspection:", error);
      res.status(500).json({ error: "Failed to fetch inspection" });
    }
  });

  // Create a new inspection
  app.post("/api/inspections", async (req, res) => {
    try {
      const validatedData = insertInspectionSchema.parse(req.body);
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

  // Update an inspection
  app.patch("/api/inspections/:id", async (req, res) => {
    try {
      const validatedData = insertInspectionSchema.partial().parse(req.body);
      const inspection = await storage.updateInspection(req.params.id, validatedData);
      if (!inspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      res.json(inspection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Error updating inspection:", error);
      res.status(500).json({ error: "Failed to update inspection" });
    }
  });

  // Delete an inspection
  app.delete("/api/inspections/:id", async (req, res) => {
    try {
      const success = await storage.deleteInspection(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting inspection:", error);
      res.status(500).json({ error: "Failed to delete inspection" });
    }
  });

  // Create a new defect
  app.post("/api/defects", async (req, res) => {
    try {
      const validatedData = insertDefectSchema.parse(req.body);
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

  // Update a defect
  app.patch("/api/defects/:id", async (req, res) => {
    try {
      const validatedData = insertDefectSchema.partial().parse(req.body);
      const defect = await storage.updateDefect(req.params.id, validatedData);
      if (!defect) {
        return res.status(404).json({ error: "Defect not found" });
      }
      res.json(defect);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Error updating defect:", error);
      res.status(500).json({ error: "Failed to update defect" });
    }
  });

  // Delete a defect
  app.delete("/api/defects/:id", async (req, res) => {
    try {
      const success = await storage.deleteDefect(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Defect not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting defect:", error);
      res.status(500).json({ error: "Failed to delete defect" });
    }
  });

  // Get defects by inspection ID
  app.get("/api/inspections/:id/defects", async (req, res) => {
    try {
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
