import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import { IntakeCompletedDispatcher } from "../../infrastructure/dispatchers/IntakeCompletedDispatcher.js";
import { RabbitMQConnection } from "../../infrastructure/messaging/RabbitMQConnection.js";
import {
  setupTestRabbitMQ,
  teardownTestRabbitMQ,
  deleteTestExchange,
  getTestRabbitMQURI,
  getTestChannel,
} from "../helpers/rabbitmq.js";

describe("IntakeCompletedDispatcher Integration Tests", () => {
  let dispatcher: IntakeCompletedDispatcher;
  let rabbitMQ: RabbitMQConnection;
  const testExchange = "test_intake_events";

  beforeAll(async () => {
    await setupTestRabbitMQ();
    rabbitMQ = RabbitMQConnection.getInstance(getTestRabbitMQURI());
    await rabbitMQ.connect();
  });

  afterAll(async () => {
    await deleteTestExchange(testExchange);
    await rabbitMQ.close();
    await teardownTestRabbitMQ();
  });

  beforeEach(async () => {
    dispatcher = new IntakeCompletedDispatcher(rabbitMQ);
  });

  describe("initialize", () => {
    it("should successfully initialize the dispatcher", async () => {
      await expect(dispatcher.initialize()).resolves.not.toThrow();
    });

    it("should create the exchange in RabbitMQ", async () => {
      await dispatcher.initialize();

      // Verify exchange exists by trying to check it
      const channel = await getTestChannel();

      // If exchange doesn't exist, this will throw
      await expect(
        channel.checkExchange("intake_events"),
      ).resolves.toBeDefined();
    });
  });

  describe("dispatch", () => {
    beforeEach(async () => {
      await dispatcher.initialize();
    });

    it("should successfully dispatch a single event", async () => {
      const result = await dispatcher.dispatch("form-123", {
        formId: "form-123",
        completedBy: new Date(),
        answers: {
          patientName: "John Doe",
          age: 30,
        },
      });

      expect(result).toBe(true);
    });

    it("should dispatch event with all payload fields", async () => {
      const completedDate = new Date("2026-01-22T10:00:00Z");
      const result = await dispatcher.dispatch("form-456", {
        formId: "form-456",
        completedBy: completedDate,
        answers: {
          patientName: "Jane Smith",
          age: 42,
          medicalHistory: "Diabetes",
          medications: ["Metformin"],
        },
      });

      expect(result).toBe(true);
    });

    it("should dispatch multiple events with different aggregate IDs", async () => {
      const result1 = await dispatcher.dispatch("form-001", {
        formId: "form-001",
        completedBy: new Date(),
        answers: { name: "Test 1" },
      });

      const result2 = await dispatcher.dispatch("form-002", {
        formId: "form-002",
        completedBy: new Date(),
        answers: { name: "Test 2" },
      });

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });

  describe("dispatchBatch", () => {
    beforeEach(async () => {
      await dispatcher.initialize();
    });

    it("should dispatch multiple events in a batch", async () => {
      const events = [
        {
          aggregateId: "form-batch-1",
          payload: {
            formId: "form-batch-1",
            completedBy: new Date(),
            answers: { test: "data1" },
          },
        },
        {
          aggregateId: "form-batch-2",
          payload: {
            formId: "form-batch-2",
            completedBy: new Date(),
            answers: { test: "data2" },
          },
        },
        {
          aggregateId: "form-batch-3",
          payload: {
            formId: "form-batch-3",
            completedBy: new Date(),
            answers: { test: "data3" },
          },
        },
      ];

      const results = await dispatcher.dispatchBatch(events);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r === true)).toBe(true);
    });

    it("should handle empty batch", async () => {
      const results = await dispatcher.dispatchBatch([]);

      expect(results).toHaveLength(0);
    });

    it("should dispatch single event in batch", async () => {
      const events = [
        {
          aggregateId: "form-single",
          payload: {
            formId: "form-single",
            completedBy: new Date(),
            answers: { single: true },
          },
        },
      ];

      const results = await dispatcher.dispatchBatch(events);

      expect(results).toHaveLength(1);
      expect(results[0]).toBe(true);
    });
  });

  describe("getConfig", () => {
    it("should return dispatcher configuration", () => {
      const config = dispatcher.getConfig();

      expect(config).toBeDefined();
      expect(config.exchange).toBe("intake_events");
      expect(config.exchangeType).toBe("topic");
      expect(config.durable).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should handle dispatch without initialization", async () => {
      // Create a new dispatcher without calling initialize
      const newDispatcher = new IntakeCompletedDispatcher(rabbitMQ);

      // Should auto-initialize on first dispatch
      const result = await newDispatcher.dispatch("form-auto", {
        formId: "form-auto",
        completedBy: new Date(),
        answers: {},
      });

      expect(result).toBe(true);
    });
  });
});
