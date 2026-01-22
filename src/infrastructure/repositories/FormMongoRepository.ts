import { ObjectId } from "mongodb";
import { FormEntity } from "../../domain/entities/FormEntity.js";
import type { FormFields } from "../../domain/entities/FormEntity.js";
import {
  MongoRepository,
  type MongoDocument,
} from "../database/MongoRepository.js";
import type { FormRepository } from "../../domain/repositories/FormRepository.js";

interface FormDocument {
  _id: ObjectId;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  fields: FormFields;
}

// Type guard to check if document has FormFields
function isFormDocument(doc: unknown): doc is FormDocument {
  if (typeof doc !== "object" || doc === null) return false;
  const d = doc as Record<string, unknown>;
  return (
    "_id" in d &&
    "id" in d &&
    "createdAt" in d &&
    "updatedAt" in d &&
    "fields" in d &&
    typeof d["fields"] === "object" &&
    d["fields"] !== null
  );
}

export class FormMongoRepository
  extends MongoRepository<FormEntity>
  implements FormRepository
{
  constructor() {
    super("forms");
  }

  protected toEntity(document: Record<string, unknown>): FormEntity {
    if (!isFormDocument(document)) {
      throw new Error("Invalid Form document structure");
    }
    return FormEntity.from({
      id: document.id,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      fields: document.fields,
    });
  }

  protected toDocument(entity: FormEntity): MongoDocument {
    return {
      _id: new ObjectId(), // Will be replaced on save if document exists
      id: entity.id,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      fields: entity.fields,
    };
  }
}
