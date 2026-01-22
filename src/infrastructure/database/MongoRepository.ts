import { Collection, ObjectId } from "mongodb";
import { BaseEntity } from "../../domain/entities/BaseEntity.js";
import type { BaseRepository } from "../../domain/repositories/BaseRepository.js";
import { MongoConnection } from "./MongoConnection.js";

/**
 * MongoDB document structure stored in the database.
 */
export interface MongoDocument {
  _id: ObjectId;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}

/**
 * Abstract base repository for MongoDB implementations.
 * Provides common CRUD operations for entities.
 */
export abstract class MongoRepository<
  T extends BaseEntity,
> implements BaseRepository<T> {
  protected readonly collection: Collection<MongoDocument>;

  /**
   * Creates a new MongoDB repository instance.
   * @param collectionName - Name of the MongoDB collection
   */
  constructor(collectionName: string) {
    this.collection =
      MongoConnection.getDatabase().collection<MongoDocument>(collectionName);
  }

  /**
   * Saves an entity. If the entity already exists (by id), it will be updated.
   * Otherwise, it will be inserted.
   */
  async save(entity: T): Promise<T> {
    const document = this.toDocument(entity);
    const now = new Date();

    // Check if entity exists
    const existing = await this.collection.findOne({ id: entity.id });

    if (existing) {
      // Update existing document - preserve _id and createdAt
      const updateDoc = { ...document };
      delete (updateDoc as Partial<MongoDocument>)._id; // Remove _id from update document if present

      updateDoc.updatedAt = now;
      updateDoc.createdAt = existing.createdAt; // Preserve original createdAt

      await this.collection.updateOne({ id: entity.id }, { $set: updateDoc });
    } else {
      // Insert new document - let MongoDB generate _id
      const insertDoc = { ...document };
      delete (insertDoc as Partial<MongoDocument>)._id; // Remove _id, MongoDB will generate it

      insertDoc.createdAt = entity.createdAt;
      insertDoc.updatedAt = now;

      await this.collection.insertOne(insertDoc);
    }

    return entity;
  }

  /**
   * Finds an entity by its id.
   * @returns The entity if found, null otherwise.
   */
  async findById(id: string): Promise<T | null> {
    const document = await this.collection.findOne({ id });
    if (!document) {
      return null;
    }
    return this.toEntity(document);
  }

  /**
   * Retrieves all entities.
   * @returns Array of all entities.
   */
  async findAll(): Promise<T[]> {
    const documents = await this.collection.find({}).toArray();
    return documents.map((doc: MongoDocument) => this.toEntity(doc));
  }

  /**
   * Deletes an entity by its id.
   * @returns true if the entity was deleted, false if it didn't exist.
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ id });
    return result.deletedCount > 0;
  }

  /**
   * Converts a MongoDB document to a domain entity.
   * Must be implemented by subclasses.
   */
  protected abstract toEntity(document: MongoDocument): T;

  /**
   * Converts a domain entity to a MongoDB document.
   * Must be implemented by subclasses.
   */
  protected abstract toDocument(entity: T): MongoDocument;
}
