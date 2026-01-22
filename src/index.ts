import express, { type Express } from "express";
import { FormController } from "./infrastructure/controllers/FormController.js";
import { MongoConnection } from "./infrastructure/database/MongoConnection.js";

const app: Express = express();
const PORT = process.env["PORT"] ?? 3000;
const MONGODB_URI = process.env["MONGODB_URI"] ?? "mongodb://localhost:27017";
const MONGODB_DB_NAME = process.env["MONGODB_DB_NAME"] ?? "node-prototype";

// Middleware
app.use(express.json());

// Initialize database connection
async function initializeDatabase(): Promise<void> {
  try {
    await MongoConnection.connect(MONGODB_URI, MONGODB_DB_NAME);
    console.log(`Connected to MongoDB: ${MONGODB_URI}/${MONGODB_DB_NAME}`);
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

// Setup routes
function setupRoutes(formController: FormController): void {
  // Form routes
  app.get("/forms", (req, res) => {
    void formController.getAllForms(req, res);
  });

  app.get("/forms/:id", (req, res) => {
    void formController.getFormById(req, res);
  });

  app.post("/forms", (req, res) => {
    void formController.createForm(req, res);
  });

  app.put("/forms/:id", (req, res) => {
    void formController.updateForm(req, res);
  });

  app.delete("/forms/:id", (req, res) => {
    void formController.deleteForm(req, res);
  });

  // Health check endpoint
  app.get("/health", async (_req, res) => {
    const dbConnected = MongoConnection.connected;
    const dbPing = await MongoConnection.ping();

    const isHealthy = dbConnected && dbPing;

    const status = {
      status: isHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          connected: dbConnected,
          ping: dbPing,
          status: dbConnected && dbPing ? "healthy" : "unhealthy",
        },
      },
    };

    res.status(isHealthy ? 200 : 503).json(status);
  });
}

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully...");
  await MongoConnection.disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully...");
  await MongoConnection.disconnect();
  process.exit(0);
});

// Start the application
try {
  // Initialize database connection first
  await initializeDatabase();

  // Initialize controller after DB is connected
  const formController = new FormController();

  // Setup routes
  setupRoutes(formController);

  // Start HTTP server
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
} catch (error) {
  console.error("Failed to start server:", error);
  process.exit(1);
}
