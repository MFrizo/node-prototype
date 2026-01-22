import {
  FormEntity,
  type FormField,
} from "../../domain/entities/FormEntity.js";
import { FormMongoRepository } from "../../infrastructure/repositories/FormMongoRepository.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from "../helpers/mongodb.js";

describe("FormMongoRepository", () => {
  let repository: FormMongoRepository;

  beforeAll(async () => {
    await setupTestDatabase();
    repository = new FormMongoRepository();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe("save", () => {
    it("should save a new form entity", async () => {
      const formFields = {
        name: {
          id: "field-1",
          label: "Name",
          type: "text",
        } as FormField,
      };

      const form = FormEntity.create({
        id: "form-1",
        fields: formFields,
      });

      const savedForm = await repository.save(form);

      expect(savedForm.id).toBe("form-1");
      expect(savedForm.fields).toEqual(formFields);
      expect(savedForm.createdAt).toBeInstanceOf(Date);
      expect(savedForm.updatedAt).toBeInstanceOf(Date);
    });

    it("should update an existing form entity", async () => {
      const initialFields = {
        name: {
          id: "field-1",
          label: "Name",
          type: "text",
        } as FormField,
      };

      const form = FormEntity.create({
        id: "form-1",
        fields: initialFields,
      });

      await repository.save(form);

      const updatedFields = {
        ...initialFields,
        email: {
          id: "field-2",
          label: "Email",
          type: "text",
        } as FormField,
      };

      const updatedForm = FormEntity.from({
        id: form.id,
        createdAt: form.createdAt,
        updatedAt: new Date(),
        fields: updatedFields,
      });

      const savedForm = await repository.save(updatedForm);

      expect(savedForm.id).toBe("form-1");
      expect(savedForm.fields).toEqual(updatedFields);
      expect(savedForm.fields?.["email"]).toBeDefined();
      expect(savedForm.createdAt.getTime()).toBe(form.createdAt.getTime());
    });

    it("should handle complex form fields", async () => {
      const complexFields = {
        personalInfo: {
          id: "field-1",
          label: "Personal Information",
          type: "textarea",
        } as FormField,
        age: {
          id: "field-2",
          label: "Age",
          type: "number",
        } as FormField,
        birthDate: {
          id: "field-3",
          label: "Birth Date",
          type: "date",
        } as FormField,
        agree: {
          id: "field-4",
          label: "I agree to terms",
          type: "checkbox",
        } as FormField,
      };

      const form = FormEntity.create({
        id: "form-complex",
        fields: complexFields,
      });

      const savedForm = await repository.save(form);

      expect(savedForm.fields).toEqual(complexFields);
      expect(Object.keys(savedForm.fields)).toHaveLength(4);
    });
  });

  describe("findById", () => {
    it("should find a form by id", async () => {
      const formFields = {
        name: {
          id: "field-1",
          label: "Name",
          type: "text",
        } as FormField,
      };

      const form = FormEntity.create({
        id: "form-1",
        fields: formFields,
      });

      await repository.save(form);

      const foundForm = await repository.findById("form-1");

      expect(foundForm).not.toBeNull();
      expect(foundForm?.id).toBe("form-1");
      expect(foundForm?.fields).toEqual(formFields);
    });

    it("should return null when form does not exist", async () => {
      const foundForm = await repository.findById("non-existent");

      expect(foundForm).toBeNull();
    });

    it("should preserve timestamps when finding a form", async () => {
      const form = FormEntity.create({
        id: "form-1",
        fields: {
          name: {
            id: "field-1",
            label: "Name",
            type: "text",
          } as FormField,
        },
      });

      await repository.save(form);
      const foundForm = await repository.findById("form-1");

      expect(foundForm).not.toBeNull();
      expect(foundForm?.createdAt).toBeInstanceOf(Date);
      expect(foundForm?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("findAll", () => {
    it("should return empty array when no forms exist", async () => {
      const forms = await repository.findAll();

      expect(forms).toEqual([]);
    });

    it("should return all forms", async () => {
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

      await repository.save(form1);
      await repository.save(form2);

      const forms = await repository.findAll();

      expect(forms).toHaveLength(2);
      expect(forms.map((f) => f.id)).toContain("form-1");
      expect(forms.map((f) => f.id)).toContain("form-2");
    });

    it("should return forms with all properties", async () => {
      const form = FormEntity.create({
        id: "form-1",
        fields: {
          name: {
            id: "field-1",
            label: "Name",
            type: "text",
          } as FormField,
        },
      });

      await repository.save(form);

      const forms = await repository.findAll();

      expect(forms[0]).toHaveProperty("id");
      expect(forms[0]).toHaveProperty("createdAt");
      expect(forms[0]).toHaveProperty("updatedAt");
      expect(forms[0]).toHaveProperty("fields");
    });
  });

  describe("delete", () => {
    it("should delete a form by id", async () => {
      const form = FormEntity.create({
        id: "form-1",
        fields: {
          name: {
            id: "field-1",
            label: "Name",
            type: "text",
          } as FormField,
        },
      });

      await repository.save(form);

      const deleted = await repository.delete("form-1");

      expect(deleted).toBe(true);

      const foundForm = await repository.findById("form-1");
      expect(foundForm).toBeNull();
    });

    it("should return false when form does not exist", async () => {
      const deleted = await repository.delete("non-existent");

      expect(deleted).toBe(false);
    });

    it("should not affect other forms when deleting", async () => {
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

      await repository.save(form1);
      await repository.save(form2);

      await repository.delete("form-1");

      const forms = await repository.findAll();
      expect(forms).toHaveLength(1);
      expect(forms[0]?.id).toBe("form-2");
    });
  });

  describe("integration scenarios", () => {
    it("should handle full CRUD lifecycle", async () => {
      // Create
      const form = FormEntity.create({
        id: "form-lifecycle",
        fields: {
          name: {
            id: "field-1",
            label: "Name",
            type: "text",
          } as FormField,
        },
      });

      const saved = await repository.save(form);
      expect(saved.id).toBe("form-lifecycle");

      // Read
      const found = await repository.findById("form-lifecycle");
      expect(found).not.toBeNull();

      // Update
      const updatedFields = {
        ...form.fields,
        email: {
          id: "field-2",
          label: "Email",
          type: "text",
        } as FormField,
      };

      const updated = FormEntity.from({
        id: form.id,
        createdAt: form.createdAt,
        updatedAt: new Date(),
        fields: updatedFields,
      });

      await repository.save(updated);
      const afterUpdate = await repository.findById("form-lifecycle");
      expect(afterUpdate?.fields?.["email"]).toBeDefined();

      // Delete
      const deleted = await repository.delete("form-lifecycle");
      expect(deleted).toBe(true);

      const afterDelete = await repository.findById("form-lifecycle");
      expect(afterDelete).toBeNull();
    });

    it("should handle multiple forms with different field types", async () => {
      const forms = [
        FormEntity.create({
          id: "form-text",
          fields: {
            name: {
              id: "field-1",
              label: "Name",
              type: "text",
            } as FormField,
          },
        }),
        FormEntity.create({
          id: "form-number",
          fields: {
            age: {
              id: "field-2",
              label: "Age",
              type: "number",
            } as FormField,
          },
        }),
        FormEntity.create({
          id: "form-date",
          fields: {
            birthDate: {
              id: "field-3",
              label: "Birth Date",
              type: "date",
            } as FormField,
          },
        }),
        FormEntity.create({
          id: "form-checkbox",
          fields: {
            agree: {
              id: "field-4",
              label: "I agree",
              type: "checkbox",
            } as FormField,
          },
        }),
      ];

      for (const form of forms) {
        await repository.save(form);
      }

      const allForms = await repository.findAll();
      expect(allForms).toHaveLength(4);

      const textForm = await repository.findById("form-text");
      expect(textForm?.fields?.["name"]?.type).toBe("text");

      const numberForm = await repository.findById("form-number");
      expect(numberForm?.fields?.["age"]?.type).toBe("number");
    });
  });
});
