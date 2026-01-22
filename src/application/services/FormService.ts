import {
  FormEntity,
  type FormFields,
} from "../../domain/entities/FormEntity.js";
import type { FormRepository } from "../../domain/repositories/FormRepository.js";

export class FormService {
  constructor(private readonly formRepository: FormRepository) {}

  /**
   * Creates a new form.
   * @param params - Parameters to create the form
   * @returns The created form entity
   */
  async create(params: {
    id: string;
    fields: FormFields;
  }): Promise<FormEntity> {
    const form = FormEntity.create({
      id: params.id,
      fields: params.fields,
    });

    return await this.formRepository.save(form);
  }

  /**
   * Retrieves a form by its id.
   * @param id - The form id
   * @returns The form if found, null otherwise
   */
  async getById(id: string): Promise<FormEntity | null> {
    return await this.formRepository.findById(id);
  }

  /**
   * Retrieves all forms.
   * @returns Array of all forms
   */
  async getAll(): Promise<FormEntity[]> {
    return await this.formRepository.findAll();
  }

  /**
   * Updates an existing form.
   * @param id - The form id
   * @param params - Parameters to update (fields)
   * @returns The updated form entity, or null if not found
   */
  async update(
    id: string,
    params: { fields: FormFields },
  ): Promise<FormEntity | null> {
    const existingForm = await this.formRepository.findById(id);

    if (!existingForm) {
      return null;
    }

    const updatedForm = FormEntity.from({
      id: existingForm.id,
      createdAt: existingForm.createdAt,
      updatedAt: new Date(),
      fields: params.fields,
    });

    return await this.formRepository.save(updatedForm);
  }

  /**
   * Deletes a form by its id.
   * @param id - The form id
   * @returns true if the form was deleted, false if it didn't exist
   */
  async delete(id: string): Promise<boolean> {
    return await this.formRepository.delete(id);
  }
}
