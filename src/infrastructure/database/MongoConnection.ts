import { MongoClient, type Db } from "mongodb";

/**
 * Singleton MongoDB connection manager.
 * Handles database connection lifecycle.
 */
export class MongoConnection {
  private static client: MongoClient | null = null;
  private static database: Db | null = null;
  private static isConnected = false;

  /**
   * Connects to MongoDB using the provided URI and database name.
   * @param uri - MongoDB connection URI
   * @param dbName - Database name
   * @throws Error if connection fails
   */
  static async connect(uri: string, dbName: string): Promise<void> {
    if (this.isConnected && this.database) {
      return;
    }

    try {
      this.client = new MongoClient(uri);
      await this.client.connect();
      this.database = this.client.db(dbName);
      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;
      throw new Error(
        `Failed to connect to MongoDB: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Gets the database instance.
   * @throws Error if not connected
   */
  static getDatabase(): Db {
    if (!this.database || !this.isConnected) {
      throw new Error(
        "MongoDB not connected. Call MongoConnection.connect() first.",
      );
    }
    return this.database;
  }

  /**
   * Disconnects from MongoDB.
   */
  static async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.database = null;
      this.isConnected = false;
    }
  }

  /**
   * Checks if currently connected to MongoDB.
   */
  static get connected(): boolean {
    return this.isConnected;
  }
}
