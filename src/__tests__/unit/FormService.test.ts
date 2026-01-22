import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  FormEntity,
  type FormField,
  type FormFields,
} from "../../domain/entities/FormEntity.js";
import type { FormRepository } from "../../domain/repositories/FormRepository.js";
import { FormService } from "../../application/services/FormService.js";

describe("FormService", () => {
  let formService: FormService;
  let mockRepository: {
    save: (entity: FormEntity) => Promise<FormEntity>;
    findById: (id: string) => Promise<FormEntity | null>;
    findAll: () => Promise<FormEntity[]>;
    delete: (id: string) => Promise<boolean>;
    saveCalls: FormEntity[];
    findByIdCalls: string[];
    findAllCalls: number;
    deleteCalls: string[];
  };

  beforeEach(() => {
    // Create a mock repository with call tracking
    const saveCalls: FormEntity[] = [];
    const findByIdCalls: string[] = [];
    let findAllCalls = 0;
    const deleteCalls: string[] = [];

    mockRepository = {
      save: async (entity: FormEntity) => {
        saveCalls.push(entity);
        return entity;
      },
      findById: async (id: string) => {
        findByIdCalls.push(id);
        return null;
      },
      findAll: async () => {
        findAllCalls++;
        return [];
      },
      delete: async (id: string) => {
        deleteCalls.push(id);
        return false;
      },
      saveCalls,
      findByIdCalls,
      findAllCalls,
      deleteCalls,
    };

    formService = new FormService(mockRepository as FormRepository);
  });

  describe("create", () => {
    it("should create a new form", async () => {
      const formFields: FormFields = {
        name: {
          id: "field-1",
          label: "Name",
          type: "text",
        } as FormField,
      };

      const result = await formService.create({
        id: "form-1",
        fields: formFields,
      });

      expect(result.id).toBe("form-1");
      expect(result.fields).toEqual(formFields);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(mockRepository.saveCalls).toHaveLength(1);
      expect(mockRepository.saveCalls[0]?.id).toBe("form-1");
      expect(mockRepository.saveCalls[0]?.fields).toEqual(formFields);
    });

    it("should create a form with multiple fields", async () => {
      const formFields: FormFields = {
        name: {
          id: "field-1",
          label: "Name",
          type: "text",
        } as FormField,
        email: {
          id: "field-2",
          label: "Email",
          type: "text",
        } as FormField,
        age: {
          id: "field-3",
          label: "Age",
          type: "number",
        } as FormField,
      };

      const result = await formService.create({
        id: "form-1",
        fields: formFields,
      });

      expect(result.fields).toEqual(formFields);
      expect(Object.keys(result.fields)).toHaveLength(3);
    });
  });

  describe("getById", () => {
    it("should retrieve a form by id", async () => {
      const formFields: FormFields = {
        name: {
          id: "field-1",
          label: "Name",
          type: "text",
        } as FormField,
      };

      const expectedForm = FormEntity.create({
        id: "form-1",
        fields: formFields,
      });

      // Override findById for this test
      mockRepository.findById = async (id: string) => {
        mockRepository.findByIdCalls.push(id);
        return id === "form-1" ? expectedForm : null;
      };

      const result = await formService.getById("form-1");

      expect(result).toEqual(expectedForm);
      expect(mockRepository.findByIdCalls).toContain("form-1");
    });

    it("should return null when form does not exist", async () => {
      const result = await formService.getById("non-existent");

      expect(result).toBeNull();
      expect(mockRepository.findByIdCalls).toContain("non-existent");
    });
  });

  describe("getAll", () => {
    it("should retrieve all forms", async () => {
      const form1 = FormEntity.create({
        id: "form-1",
        fields: {
          name: {
            id: "field-1",
            label: "Name",
            type: "text",
          } as FormField,
        },
      });

      const form2 = FormEntity.create({
        id: "form-2",
        fields: {
          email: {
            id: "field-2",
            label: "Email",
            type: "text",
          } as FormField,
        },
      });

      // Override findAll for this test
      mockRepository.findAll = async () => {
        mockRepository.findAllCalls++;
        return [form1, form2];
      };

      const result = await formService.getAll();

      expect(result).toHaveLength(2);
      expect(result).toEqual([form1, form2]);
      expect(mockRepository.findAllCalls).toBeGreaterThan(0);
    });

    it("should return empty array when no forms exist", async () => {
      const result = await formService.getAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe("update", () => {
    it("should update an existing form", async () => {
      const existingForm = FormEntity.create({
        id: "form-1",
        fields: {
          name: {
            id: "field-1",
            label: "Name",
            type: "text",
          } as FormField,
        },
      });

      const updatedFields: FormFields = {
        name: {
          id: "field-1",
          label: "Full Name",
          type: "text",
        } as FormField,
        email: {
          id: "field-2",
          label: "Email",
          type: "text",
        } as FormField,
      };

      // Override methods for this test
      mockRepository.findById = async (id: string) => {
        mockRepository.findByIdCalls.push(id);
        return id === "form-1" ? existingForm : null;
      };

      mockRepository.save = async (entity: FormEntity) => {
        mockRepository.saveCalls.push(entity);
        return entity;
      };

      const result = await formService.update("form-1", {
        fields: updatedFields,
      });

      expect(result).not.toBeNull();
      expect(result?.fields).toEqual(updatedFields);
      expect(result?.id).toBe("form-1");
      expect(result?.createdAt).toEqual(existingForm.createdAt);
      expect(mockRepository.findByIdCalls).toContain("form-1");
      expect(mockRepository.saveCalls.length).toBeGreaterThan(0);
      const savedEntity = mockRepository.saveCalls.at(-1);
      expect(savedEntity?.id).toBe("form-1");
      expect(savedEntity?.fields).toEqual(updatedFields);
    });

    it("should return null when updating a non-existent form", async () => {
      const result = await formService.update("non-existent", {
        fields: {
          name: {
            id: "field-1",
            label: "Name",
            type: "text",
          } as FormField,
        },
      });

      expect(result).toBeNull();
      expect(mockRepository.findByIdCalls).toContain("non-existent");
      expect(mockRepository.saveCalls.length).toBe(0);
    });

    it("should preserve createdAt when updating", async () => {
      const originalDate = new Date("2024-01-01T00:00:00Z");
      const existingForm = FormEntity.from({
        id: "form-1",
        createdAt: originalDate,
        updatedAt: originalDate,
        fields: {
          name: {
            id: "field-1",
            label: "Name",
            type: "text",
          } as FormField,
        },
      });

      const updatedFields: FormFields = {
        name: {
          id: "field-1",
          label: "Updated Name",
          type: "text",
        } as FormField,
      };

      // Override methods for this test
      mockRepository.findById = async (id: string) => {
        mockRepository.findByIdCalls.push(id);
        return id === "form-1" ? existingForm : null;
      };

      mockRepository.save = async (entity: FormEntity) => {
        mockRepository.saveCalls.push(entity);
        return entity;
      };

      const result = await formService.update("form-1", {
        fields: updatedFields,
      });

      expect(result).not.toBeNull();
      expect(result?.createdAt.getTime()).toBe(originalDate.getTime());
      const savedEntity = mockRepository.saveCalls.at(-1);
      expect(savedEntity?.createdAt.getTime()).toBe(originalDate.getTime());
    });
  });

  describe("delete", () => {
    it("should delete a form by id", async () => {
      // Override delete for this test
      mockRepository.delete = async (id: string) => {
        mockRepository.deleteCalls.push(id);
        return true;
      };

      const result = await formService.delete("form-1");

      expect(result).toBe(true);
      expect(mockRepository.deleteCalls).toContain("form-1");
    });

    it("should return false when form does not exist", async () => {
      const result = await formService.delete("non-existent");

      expect(result).toBe(false);
      expect(mockRepository.deleteCalls).toContain("non-existent");
    });
  });

  describe("integration scenarios", () => {
    it("should handle full CRUD lifecycle", async () => {
      // Setup mock repository for full lifecycle
      const forms = new Map<string, FormEntity>();

      mockRepository.save = async (entity: FormEntity) => {
        mockRepository.saveCalls.push(entity);
        forms.set(entity.id, entity);
        return entity;
      };

      mockRepository.findById = async (id: string) => {
        mockRepository.findByIdCalls.push(id);
        return forms.get(id) || null;
      };

      mockRepository.findAll = async () => {
        mockRepository.findAllCalls++;
        return Array.from(forms.values());
      };

      mockRepository.delete = async (id: string) => {
        mockRepository.deleteCalls.push(id);
        const existed = forms.has(id);
        forms.delete(id);
        return existed;
      };

      // Create
      const formFields: FormFields = {
        name: {
          id: "field-1",
          label: "Name",
          type: "text",
        } as FormField,
      };

      const created = await formService.create({
        id: "form-1",
        fields: formFields,
      });
      expect(created.id).toBe("form-1");

      // Read
      const found = await formService.getById("form-1");
      expect(found).not.toBeNull();
      expect(found?.id).toBe("form-1");

      // Update
      const updatedFields: FormFields = {
        ...formFields,
        email: {
          id: "field-2",
          label: "Email",
          type: "text",
        } as FormField,
      };

      const updated = await formService.update("form-1", {
        fields: updatedFields,
      });
      expect(updated?.fields?.["email"]).toBeDefined();

      // Delete
      const deleted = await formService.delete("form-1");
      expect(deleted).toBe(true);

      // Verify deleted
      const afterDelete = await formService.getById("form-1");
      expect(afterDelete).toBeNull();
    });
  });
});
