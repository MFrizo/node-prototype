import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoConnection } from "../../infrastructure/database/MongoConnection.js";

let mongoServer: MongoMemoryServer | null = null;

export async function setupTestDatabase(): Promise<{
  uri: string;
  dbName: string;
}> {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  const dbName = "test-db";

  await MongoConnection.connect(uri, dbName);

  return { uri, dbName };
}

export async function teardownTestDatabase(): Promise<void> {
  try {
    await MongoConnection.disconnect();
  } catch (error) {
    console.error("Error disconnecting from MongoDB:", error);
  }

  if (mongoServer) {
    try {
      await mongoServer.stop();
    } catch (error) {
      console.error("Error stopping MongoDB server:", error);
    }
    mongoServer = null;
  }
}

export async function clearTestDatabase(): Promise<void> {
  const db = MongoConnection.getDatabase();
  const collections = await db.listCollections().toArray();

  await Promise.all(
    collections.map((collection) =>
      db.collection(collection.name).deleteMany({}),
    ),
  );
}
