import { BaseEntity } from "../entities/BaseEntity.js";

/**
 * Generic repository interface for domain entities.
 * Defines the contract for CRUD operations.
 */
export interface BaseRepository<T extends BaseEntity> {
  /**
   * Saves an entity. If the entity already exists (by id), it will be updated.
   * Otherwise, it will be inserted.
   */
  save(entity: T): Promise<T>;

  /**
   * Finds an entity by its id.
   * @returns The entity if found, null otherwise.
   */
  findById(id: string): Promise<T | null>;

  /**
   * Retrieves all entities.
   * @returns Array of all entities.
   */
  findAll(): Promise<T[]>;

  /**
   * Deletes an entity by its id.
   * @returns true if the entity was deleted, false if it didn't exist.
   */
  delete(id: string): Promise<boolean>;
}
