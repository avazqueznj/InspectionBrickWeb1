import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertInspectionSchema, insertDefectSchema } from "@shared/schema";
import { z } from "zod";
import PDFDocument from "pdfkit";

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

  // Generate PDF report for an inspection (protected)
  app.get("/api/inspections/:id/report", requireAuth, async (req, res) => {
    try {
      console.log(`📄 [Routes] GET /api/inspections/${req.params.id}/report - User: ${req.session.userId}`);
      
      // Fetch inspection with defects
      const inspection = await storage.getInspection(req.params.id);
      if (!inspection) {
        return res.status(404).json({ error: "Inspection not found" });
      }
      
      // Verify user has access to this inspection's company
      if (req.session.companyId && inspection.companyId !== req.session.companyId) {
        console.log(`❌ [Routes] Access denied - User company: ${req.session.companyId}, Inspection company: ${inspection.companyId}`);
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get company details
      const companies = await storage.getCompanies();
      const company = companies.find(c => c.id === inspection.companyId);
      
      console.log(`✅ [Routes] Generating PDF report for inspection ${req.params.id}`);
      
      // Create PDF document
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      
      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=inspection-${inspection.assetId}-${inspection.datetime.toISOString().split('T')[0]}.pdf`);
      
      // Pipe PDF to response
      doc.pipe(res);
      
      // --- Header Section ---
      doc.fontSize(20).font('Helvetica-Bold').text('EQUIPMENT INSPECTION REPORT', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text('Official DOT Inspection Document', { align: 'center' });
      doc.moveDown(1);
      
      // Company Info
      doc.fontSize(12).font('Helvetica-Bold').text(company?.name || inspection.companyId, { continued: false });
      if (company?.address) {
        doc.fontSize(10).font('Helvetica').text(company.address);
      }
      doc.moveDown(1);
      
      // Horizontal line
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(0.5);
      
      // --- Inspection Details Section ---
      doc.fontSize(14).font('Helvetica-Bold').text('INSPECTION DETAILS');
      doc.moveDown(0.5);
      
      const leftColumn = 50;
      const rightColumn = 300;
      let yPos = doc.y;
      
      // Left column
      doc.fontSize(10).font('Helvetica-Bold').text('Inspection ID:', leftColumn, yPos);
      doc.font('Helvetica').text(inspection.id.substring(0, 8), leftColumn + 100, yPos);
      yPos += 20;
      
      doc.font('Helvetica-Bold').text('Date & Time:', leftColumn, yPos);
      doc.font('Helvetica').text(new Date(inspection.datetime).toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short'
      }), leftColumn + 100, yPos);
      yPos += 20;
      
      doc.font('Helvetica-Bold').text('Inspection Type:', leftColumn, yPos);
      doc.font('Helvetica').text(inspection.inspectionType, leftColumn + 100, yPos);
      yPos += 20;
      
      // Right column
      yPos = doc.y - 60;
      doc.font('Helvetica-Bold').text('Asset ID:', rightColumn, yPos);
      doc.font('Helvetica').text(inspection.assetId, rightColumn + 80, yPos);
      yPos += 20;
      
      doc.font('Helvetica-Bold').text('Driver Name:', rightColumn, yPos);
      doc.font('Helvetica').text(inspection.driverName, rightColumn + 80, yPos);
      yPos += 20;
      
      doc.font('Helvetica-Bold').text('Driver ID:', rightColumn, yPos);
      doc.font('Helvetica').text(inspection.driverId, rightColumn + 80, yPos);
      
      doc.y = yPos + 20;
      doc.moveDown(1);
      
      // --- Defects Section ---
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(0.5);
      
      doc.fontSize(14).font('Helvetica-Bold').text('DEFECTS IDENTIFIED');
      doc.moveDown(0.5);
      
      if (!inspection.defects || inspection.defects.length === 0) {
        doc.fontSize(11).font('Helvetica').fillColor('#008000')
          .text('✓ NO DEFECTS FOUND - INSPECTION PASSED', { align: 'center' });
        doc.fillColor('#000000');
      } else {
        doc.fontSize(10).font('Helvetica').text(`Total Defects Found: ${inspection.defects.length}`);
        doc.moveDown(0.5);
        
        // Defects table
        inspection.defects.forEach((defect, index) => {
          // Check if we need a new page
          if (doc.y > 700) {
            doc.addPage();
            doc.fontSize(10).font('Helvetica').text(`Inspection Report (continued) - ${inspection.assetId}`, { align: 'center' });
            doc.moveDown(1);
          }
          
          // Defect box with border
          const boxTop = doc.y;
          const boxHeight = 140;
          
          // Background based on severity
          if (defect.severity >= 70) {
            doc.rect(50, boxTop, 512, boxHeight).fillAndStroke('#ffe6e6', '#cc0000');
          } else if (defect.severity >= 40) {
            doc.rect(50, boxTop, 512, boxHeight).fillAndStroke('#fff8e6', '#ff9900');
          } else {
            doc.rect(50, boxTop, 512, boxHeight).fillAndStroke('#f9f9f9', '#999999');
          }
          
          doc.fillColor('#000000');
          
          // Defect number and severity
          doc.fontSize(11).font('Helvetica-Bold')
            .text(`Defect #${index + 1}`, 60, boxTop + 10)
            .text(`Severity: ${defect.severity}/100`, 450, boxTop + 10, { width: 100, align: 'right' });
          
          // Status badge
          const statusColors: Record<string, string> = {
            'open': '#cc0000',
            'pending': '#ff9900',
            'repaired': '#008000'
          };
          doc.fontSize(9).fillColor('#ffffff')
            .rect(60, boxTop + 28, 60, 15).fillAndStroke(statusColors[defect.status] || '#666666', statusColors[defect.status] || '#666666')
            .text(defect.status.toUpperCase(), 62, boxTop + 31, { width: 56, align: 'center' });
          doc.fillColor('#000000');
          
          // Zone and Component
          doc.fontSize(10).font('Helvetica-Bold').text('Zone:', 60, boxTop + 50);
          doc.font('Helvetica').text(defect.zoneName, 110, boxTop + 50);
          doc.font('Helvetica-Bold').text('Component:', 250, boxTop + 50);
          doc.font('Helvetica').text(defect.componentName, 320, boxTop + 50);
          
          // Defect description
          doc.font('Helvetica-Bold').text('Defect:', 60, boxTop + 68);
          doc.font('Helvetica').text(defect.defect, 60, boxTop + 83, { width: 490 });
          
          // Notes
          if (defect.driverNotes) {
            doc.fontSize(9).font('Helvetica-Bold').text('Driver Notes:', 60, boxTop + 105);
            doc.font('Helvetica').text(defect.driverNotes, 60, boxTop + 117, { width: 490 });
          }
          
          if (defect.repairNotes) {
            doc.fontSize(9).font('Helvetica-Bold').text('Repair Notes:', 300, boxTop + 105);
            doc.font('Helvetica').text(defect.repairNotes, 300, boxTop + 117, { width: 250 });
          }
          
          doc.y = boxTop + boxHeight + 10;
        });
      }
      
      // --- Footer ---
      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).font('Helvetica').fillColor('#666666')
        .text('This is an official inspection report. All defects must be addressed according to DOT regulations.', { align: 'center' });
      doc.text(`Report Generated: ${new Date().toLocaleString('en-US')}`, { align: 'center' });
      doc.text(`Generated by: ${req.session.userId}`, { align: 'center' });
      
      // Finalize PDF
      doc.end();
      
      console.log(`✅ [Routes] PDF report generated successfully for inspection ${req.params.id}`);
    } catch (error) {
      console.error("❌ [Routes] Error generating PDF report:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate PDF report" });
      }
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
