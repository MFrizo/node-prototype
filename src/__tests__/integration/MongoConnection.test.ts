import { MongoConnection } from "../../infrastructure/database/MongoConnection.js";
import { setupTestDatabase, teardownTestDatabase } from "../helpers/mongodb.js";

describe("MongoConnection", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe("connect", () => {
    it("should connect to MongoDB successfully", () => {
      expect(MongoConnection.connected).toBe(true);
    });

    it("should not throw error when connecting multiple times", async () => {
      const { uri, dbName } = await setupTestDatabase();
      await expect(MongoConnection.connect(uri, dbName)).resolves.not.toThrow();
    });
  });

  describe("getDatabase", () => {
    it("should return database instance when connected", () => {
      const db = MongoConnection.getDatabase();
      expect(db).toBeDefined();
      expect(db.databaseName).toBe("test-db");
    });
  });

  describe("disconnect", () => {
    it("should not throw error when disconnecting multiple times", async () => {
      await expect(MongoConnection.disconnect()).resolves.not.toThrow();
      // Reconnect for other tests
      await setupTestDatabase();
    });
  });

  describe("connected", () => {
    it("should return true when connected", () => {
      expect(MongoConnection.connected).toBe(true);
    });
  });
});
