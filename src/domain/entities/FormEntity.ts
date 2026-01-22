import { BaseEntity } from "./BaseEntity.js";

export class FormEntity extends BaseEntity {
  private constructor(
    id: string,
    createdAt: Date,
    updatedAt: Date,
    public readonly fields: FormFields,
  ) {
    super(id, createdAt, updatedAt);
  }

  static create(params: { id: string; fields: FormFields }): FormEntity {
    const now = new Date();
    return new FormEntity(params.id, now, now, params.fields);
  }

  static from(params: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    fields: FormFields;
  }): FormEntity {
    return new FormEntity(
      params.id,
      params.createdAt,
      params.updatedAt,
      params.fields,
    );
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
