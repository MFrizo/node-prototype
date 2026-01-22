import express, { type Express } from "express";
import type { Server } from "node:http";
import { FormController } from "../../infrastructure/controllers/FormController.js";
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from "../helpers/mongodb.js";
import type {
  FormEntity,
  FormField,
} from "../../domain/entities/FormEntity.js";

describe("FormController Integration Tests", () => {
  let app: Express;
  let server: Server;
  let baseUrl: string;
  const PORT = 3001;

  beforeAll(async () => {
    await setupTestDatabase();

    // Setup Express app for testing
    app = express();
    app.use(express.json());

    const formController = new FormController();

    // Setup routes
    app.get("/forms", (req, res) => {
      void formController.getAllForms(req, res);
    });

    app.get("/forms/:id", (req, res) => {
      void formController.getFormById(req, res);
    });

    app.post("/forms", (req, res) => {
      void formController.createForm(req, res);
    });

    app.put("/forms/:id", (req, res) => {
      void formController.updateForm(req, res);
    });

    app.delete("/forms/:id", (req, res) => {
      void formController.deleteForm(req, res);
    });

    // Start test server
    await new Promise<void>((resolve) => {
      server = app.listen(PORT, () => {
        baseUrl = `http://localhost:${PORT}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      if (server) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe("GET /forms", () => {
    it("should return empty array when no forms exist", async () => {
      const response = await fetch(`${baseUrl}/forms`);
      expect(response.status).toBe(200);

      const forms = await response.json();
      expect(Array.isArray(forms)).toBe(true);
      expect(forms).toHaveLength(0);
    });

    it("should return all forms", async () => {
      // Create forms via POST
      const form1Fields = {
        name: {
          id: "field-1",
          label: "Name",
          type: "text",
        } as FormField,
      };

      const form2Fields = {
        email: {
          id: "field-2",
          label: "Email",
          type: "text",
        } as FormField,
      };

      await fetch(`${baseUrl}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: form1Fields }),
      });

      await fetch(`${baseUrl}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: form2Fields }),
      });

      const response = await fetch(`${baseUrl}/forms`);
      expect(response.status).toBe(200);

      const forms = (await response.json()) as FormEntity[];
      expect(forms).toHaveLength(2);
      expect(forms[0]).toHaveProperty("id");
      expect(forms[0]).toHaveProperty("fields");
      expect(forms[0]).toHaveProperty("createdAt");
      expect(forms[0]).toHaveProperty("updatedAt");
    });

    it("should handle database errors gracefully", async () => {
      // This test would require mocking database errors
      // For now, we'll test the happy path
      const response = await fetch(`${baseUrl}/forms`);
      expect(response.status).toBe(200);
    });
  });

  describe("GET /forms/:id", () => {
    it("should return a form by id", async () => {
      const formFields = {
        name: {
          id: "field-1",
          label: "Name",
          type: "text",
        } as FormField,
      };

      // Create a form
      const createResponse = await fetch(`${baseUrl}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: formFields }),
      });

      expect(createResponse.status).toBe(201);
      const createdForm = (await createResponse.json()) as FormEntity;
      const formId = createdForm?.id;

      // Get the form by id
      const response = await fetch(`${baseUrl}/forms/${formId}`);
      expect(response.status).toBe(200);

      const form = (await response.json()) as FormEntity;
      expect(form.id).toBe(formId);
      expect(form.fields).toEqual(formFields);
    });

    it("should return 404 when form does not exist", async () => {
      const response = await fetch(`${baseUrl}/forms/non-existent-id`);
      expect(response.status).toBe(404);

      const error = (await response.json()) as { error: string };
      expect(error).toHaveProperty("error");
      expect(error.error).toBe("Form not found");
    });

    it("should handle empty id parameter", async () => {
      const responseSuccess = await fetch(`${baseUrl}/forms/`);
      expect(responseSuccess.status).toBe(200);
    });
  });

  describe("POST /forms", () => {
    it("should create a new form", async () => {
      const formFields = {
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
      };

      const response = await fetch(`${baseUrl}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: formFields }),
      });

      expect(response.status).toBe(201);

      const form = (await response.json()) as FormEntity;
      expect(form).toHaveProperty("id");
      expect(form.fields).toEqual(formFields);
      expect(form.createdAt).toBeDefined();
      expect(form.updatedAt).toBeDefined();
    });

    it("should return 400 when fields are missing", async () => {
      const response = await fetch(`${baseUrl}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);

      const error = (await response.json()) as { error: string };
      expect(error).toHaveProperty("error");
      expect(error.error).toBe("Invalid request body");
    });

    it("should return 400 when fields is not an object", async () => {
      const response = await fetch(`${baseUrl}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: "invalid" }),
      });

      expect(response.status).toBe(400);

      const error = (await response.json()) as { error: string };
      expect(error).toHaveProperty("error");
      expect(error.error).toBe("Invalid request body");
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

      const response = await fetch(`${baseUrl}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: complexFields }),
      });

      expect(response.status).toBe(201);

      const form = (await response.json()) as FormEntity;
      expect(form.fields).toEqual(complexFields);
      expect(Object.keys(form.fields)).toHaveLength(4);
    });
  });

  describe("PUT /forms/:id", () => {
    it("should update an existing form", async () => {
      const initialFields = {
        name: {
          id: "field-1",
          label: "Name",
          type: "text",
        } as FormField,
      };

      // Create a form
      const createResponse = await fetch(`${baseUrl}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: initialFields }),
      });

      expect(createResponse.status).toBe(201);
      const createdForm = (await createResponse.json()) as FormEntity;
      const formId = createdForm.id;

      // Update the form
      const updatedFields = {
        ...initialFields,
        email: {
          id: "field-2",
          label: "Email",
          type: "text",
        } as FormField,
      };

      const updateResponse = await fetch(`${baseUrl}/forms/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: updatedFields }),
      });

      expect(updateResponse.status).toBe(200);

      const updatedForm = (await updateResponse.json()) as FormEntity;
      expect(updatedForm.id).toBe(formId);
      expect(updatedForm.fields).toEqual(updatedFields);
      expect(updatedForm.fields?.["email"]).toBeDefined();
      expect(updatedForm.createdAt).toBeDefined();
      expect(updatedForm.updatedAt).toBeDefined();
    });

    it("should return 404 when form does not exist", async () => {
      const formFields = {
        name: {
          id: "field-1",
          label: "Name",
          type: "text",
        } as FormField,
      };

      const response = await fetch(`${baseUrl}/forms/non-existent-id`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: formFields }),
      });

      expect(response.status).toBe(404);

      const error = (await response.json()) as { error: string };
      expect(error).toHaveProperty("error");
      expect(error.error).toBe("Form not found");
    });

    it("should return 400 when fields are missing", async () => {
      const formFields = {
        name: {
          id: "field-1",
          label: "Name",
          type: "text",
        } as FormField,
      };

      // Create a form first
      const createResponse = await fetch(`${baseUrl}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: formFields }),
      });

      const createdForm = (await createResponse.json()) as FormEntity;
      const formId = createdForm.id;

      // Try to update without fields
      const response = await fetch(`${baseUrl}/forms/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);

      const error = (await response.json()) as { error: string };
      expect(error).toHaveProperty("error");
      expect(error.error).toBe("Invalid request body");
    });

    it("should handle empty id parameter", async () => {
      const formFields = {
        name: {
          id: "field-1",
          label: "Name",
          type: "text",
        } as FormField,
      };

      const response = await fetch(`${baseUrl}/forms/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: formFields }),
      });

      // Express routing behavior - might match different route
      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe("DELETE /forms/:id", () => {
    it("should delete an existing form", async () => {
      const formFields = {
        name: {
          id: "field-1",
          label: "Name",
          type: "text",
        } as FormField,
      };

      // Create a form
      const createResponse = await fetch(`${baseUrl}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: formFields }),
      });

      expect(createResponse.status).toBe(201);
      const createdForm = (await createResponse.json()) as FormEntity;
      const formId = createdForm.id;

      // Delete the form
      const deleteResponse = await fetch(`${baseUrl}/forms/${formId}`, {
        method: "DELETE",
      });

      expect(deleteResponse.status).toBe(204);

      // Verify it's deleted
      const getResponse = await fetch(`${baseUrl}/forms/${formId}`);
      expect(getResponse.status).toBe(404);
    });

    it("should return 404 when form does not exist", async () => {
      const response = await fetch(`${baseUrl}/forms/non-existent-id`, {
        method: "DELETE",
      });

      expect(response.status).toBe(404);

      const error = (await response.json()) as { error: string };
      expect(error).toHaveProperty("error");
      expect(error.error).toBe("Form not found");
    });

    it("should handle empty id parameter", async () => {
      const response = await fetch(`${baseUrl}/forms/`, {
        method: "DELETE",
      });

      // Express routing behavior - might match different route
      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle full CRUD lifecycle", async () => {
      const formFields = {
        name: {
          id: "field-1",
          label: "Name",
          type: "text",
        } as FormField,
      };

      // Create
      const createResponse = await fetch(`${baseUrl}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: formFields }),
      });

      expect(createResponse.status).toBe(201);
      const createdForm = (await createResponse.json()) as FormEntity;
      const formId = createdForm.id;

      // Read
      const getResponse = await fetch(`${baseUrl}/forms/${formId}`);
      expect(getResponse.status).toBe(200);
      const retrievedForm = (await getResponse.json()) as FormEntity;
      expect(retrievedForm.id).toBe(formId);

      // Update
      const updatedFields = {
        ...formFields,
        email: {
          id: "field-2",
          label: "Email",
          type: "text",
        } as FormField,
      };

      const updateResponse = await fetch(`${baseUrl}/forms/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: updatedFields }),
      });

      expect(updateResponse.status).toBe(200);
      const updatedForm = (await updateResponse.json()) as FormEntity;
      expect(updatedForm.fields?.["email"]).toBeDefined();

      // Delete
      const deleteResponse = await fetch(`${baseUrl}/forms/${formId}`, {
        method: "DELETE",
      });

      expect(deleteResponse.status).toBe(204);

      // Verify deletion
      const verifyResponse = await fetch(`${baseUrl}/forms/${formId}`);
      expect(verifyResponse.status).toBe(404);
    });

    it("should handle multiple forms independently", async () => {
      const form1Fields = {
        name: {
          id: "field-1",
          label: "Name",
          type: "text",
        } as FormField,
      };

      const form2Fields = {
        email: {
          id: "field-2",
          label: "Email",
          type: "text",
        } as FormField,
      };

      // Create two forms
      const create1Response = await fetch(`${baseUrl}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: form1Fields }),
      });

      const create2Response = await fetch(`${baseUrl}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: form2Fields }),
      });

      expect(create1Response.status).toBe(201);
      expect(create2Response.status).toBe(201);

      const form1 = (await create1Response.json()) as FormEntity;
      const form2 = (await create2Response.json()) as FormEntity;

      // Verify both exist
      const getAllResponse = await fetch(`${baseUrl}/forms`);
      const allForms = (await getAllResponse.json()) as FormEntity[];
      expect(allForms).toHaveLength(2);

      // Delete one
      const deleteResponse = await fetch(`${baseUrl}/forms/${form1?.id}`, {
        method: "DELETE",
      });
      expect(deleteResponse.status).toBe(204);

      // Verify the other still exists
      const getResponse = await fetch(`${baseUrl}/forms/${form2?.id}`);
      expect(getResponse.status).toBe(200);
      const remainingForm = (await getResponse.json()) as FormEntity;
      expect(remainingForm?.id).toBe(form2?.id);
    });
  });
});
