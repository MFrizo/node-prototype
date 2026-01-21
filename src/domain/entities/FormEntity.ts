import { BaseEntity } from "./BaseEntity.js";

export class Form extends BaseEntity {
  private constructor(
    id: string,
    createdAt: Date,
    updatedAt: Date,
    public readonly fields: FormFields,
  ) {
    super(id, createdAt, updatedAt);
  }

  static create(params: { id: string; fields: FormFields }): Form {
    const now = new Date();
    return new Form(params.id, now, now, params.fields);
  }
}

export type FormFields = Record<string, FormField>;

export interface FormField {
  id: string;
  label: string;
  type:
    | "text"
    | "number"
    | "date"
    | "checkbox"
    | "radio"
    | "select"
    | "textarea";
}
