import type { Request, Response } from "express";
import { FormMongoRepository } from "../repositories/FormMongoRepository.js";
import {
  FormEntity,
  type FormFields,
} from "../../domain/entities/FormEntity.js";
import { randomUUID } from "node:crypto";
import { FormService } from "../../application/services/FormService.js";

export class FormController {
  private readonly formService: FormService;

  constructor() {
    this.formService = new FormService(new FormMongoRepository());
  }

  /**
   * GET /forms
   * Retrieves all forms
   */
  async getAllForms(_req: Request, res: Response): Promise<void> {
    try {
      const forms = await this.formService.getAll();
      res.json(forms);
    } catch (error) {
      res.status(500).json({
        error: "Failed to retrieve forms",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * GET /forms/:id
   * Retrieves a form by ID
   */
  async getFormById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params["id"];
      if (!id || Array.isArray(id)) {
        res.status(400).json({ error: "Invalid form ID" });
        return;
      }
      const form = await this.formService.getById(id);

      if (!form) {
        res.status(404).json({ error: "Form not found" });
        return;
      }

      res.json(form);
    } catch (error) {
      res.status(500).json({
        error: "Failed to retrieve form",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * POST /forms
   * Creates a new form
   */
  async createForm(req: Request, res: Response): Promise<void> {
    try {
      const { fields } = req.body as { fields?: FormFields };

      if (!fields || typeof fields !== "object") {
        res.status(400).json({
          error: "Invalid request body",
          message: "Fields are required and must be an object",
        });
        return;
      }

      const form = FormEntity.create({
        id: randomUUID(),
        fields,
      });

      const savedForm = await this.formService.create(form);
      res.status(201).json(savedForm);
    } catch (error) {
      res.status(500).json({
        error: "Failed to create form",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * PUT /forms/:id
   * Updates an existing form
   */
  async updateForm(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params["id"];
      if (!id || Array.isArray(id)) {
        res.status(400).json({ error: "Invalid form ID" });
        return;
      }
      const { fields } = req.body as { fields?: FormFields };

      if (!fields || typeof fields !== "object") {
        res.status(400).json({
          error: "Invalid request body",
          message: "Fields are required and must be an object",
        });
        return;
      }

      const existingForm = await this.formService.getById(id);

      if (!existingForm) {
        res.status(404).json({ error: "Form not found" });
        return;
      }

      // Create updated form with same id and timestamps
      const updatedForm = FormEntity.from({
        id: existingForm.id,
        createdAt: existingForm.createdAt,
        updatedAt: new Date(),
        fields,
      });

      const savedForm = await this.formService.update(id, updatedForm);
      res.json(savedForm);
    } catch (error) {
      res.status(500).json({
        error: "Failed to update form",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * DELETE /forms/:id
   * Deletes a form by ID
   */
  async deleteForm(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params["id"];
      if (!id || Array.isArray(id)) {
        res.status(400).json({ error: "Invalid form ID" });
        return;
      }
      const deleted = await this.formService.delete(id);

      if (!deleted) {
        res.status(404).json({ error: "Form not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        error: "Failed to delete form",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
