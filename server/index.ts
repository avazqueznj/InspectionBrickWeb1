import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

console.log("🚀 Starting Inspection Brick Server");
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔐 Session Secret: ${process.env.SESSION_SECRET ? 'SET (from env)' : 'USING DEFAULT (not secure for production)'}`);

// Trust proxy - required for Replit deployments to handle cookies correctly
app.set('trust proxy', 1);
console.log(`🔒 Trust proxy: enabled (required for production deployments)`);

// Extend session data type
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    companyId?: string | null;
  }
}

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

// Session configuration optimized for production
const isProduction = process.env.NODE_ENV === "production";
app.use(session({
  secret: process.env.SESSION_SECRET || "inspection-brick-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  proxy: true, // Trust the reverse proxy for secure cookies
  cookie: {
    secure: isProduction, // Require HTTPS in production
    httpOnly: true, // Prevent client-side JS access
    sameSite: isProduction ? 'none' : 'lax', // Required for cross-site cookies in production
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

console.log(`🍪 Session configured - secure: ${isProduction}, sameSite: ${isProduction ? 'none' : 'lax'}, maxAge: 24h`);

app.use(express.text({ type: 'text/plain', limit: '10mb' }));
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
