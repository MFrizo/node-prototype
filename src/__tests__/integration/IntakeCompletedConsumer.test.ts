import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { EventConsumer } from "../../infrastructure/messaging/EventConsumer.js";
import { IntakeCompletedDispatcher } from "../../infrastructure/dispatchers/IntakeCompletedDispatcher.js";
import {
  setupTestRabbitMQ,
  teardownTestRabbitMQ,
  deleteTestQueue,
  deleteTestExchange,
  getTestRabbitMQConnection,
} from "../helpers/rabbitmq.js";
import type { DomainEvent } from "../../domain/events/DomainEvent.js";

describe("IntakeCompletedConsumer Integration Tests", () => {
  let consumer: EventConsumer;
  let dispatcher: IntakeCompletedDispatcher;
  const testSuiteId = `consumer_${Date.now()}`;
  const testQueue = `test_queue_${testSuiteId}`;
  const testExchange = `test_exchange_${testSuiteId}`;

  beforeAll(async () => {
    await setupTestRabbitMQ();
    const rabbitMQ = getTestRabbitMQConnection();

    // Create dispatcher with custom exchange for this test suite
    dispatcher = new IntakeCompletedDispatcher(rabbitMQ, {
      exchange: testExchange,
      exchangeType: "topic",
      durable: false,
    });
    await dispatcher.initialize();
  });

  afterAll(async () => {
    await deleteTestQueue(testQueue);
    await deleteTestExchange(testExchange);
    await teardownTestRabbitMQ();
  });

  beforeEach(async () => {
    const rabbitMQ = getTestRabbitMQConnection();
    consumer = new EventConsumer(rabbitMQ, {
      queueName: testQueue,
      exchange: testExchange,
      routingKeys: ["intake.completed"],
      durable: false,
      prefetchCount: 10,
    });
  });

  afterEach(async () => {
    if (consumer) {
      await consumer.stop();
    }
  });

  describe("initialize", () => {
    it("should successfully initialize the consumer", async () => {
      await expect(consumer.initialize()).resolves.not.toThrow();
    });

    it("should create and bind queue to exchange", async () => {
      await consumer.initialize();

      const rabbitMQ = getTestRabbitMQConnection();
      const channel = await rabbitMQ.getChannel();

      // Verify queue exists
      const queueInfo = await channel.checkQueue(testQueue);
      expect(queueInfo).toBeDefined();
      expect(queueInfo.queue).toBe(testQueue);
    });
  });

  describe("event consumption", () => {
    it("should receive and process dispatched event", async () => {
      const receivedEvents: DomainEvent[] = [];

      consumer.on("IntakeCompleted", async (event) => {
        receivedEvents.push(event);
      });

      await consumer.initialize();
      await consumer.start();

      // Give consumer time to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Dispatch an event
      await dispatcher.dispatch("form-consume-1", {
        formId: "form-consume-1",
        completedBy: new Date(),
        answers: { test: "data" },
      });

      // Wait for event to be processed
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0]?.eventType).toBe("IntakeCompleted");
      expect(receivedEvents[0]?.aggregateId).toBe("form-consume-1");
    });

    it("should handle multiple events", async () => {
      const receivedEvents: DomainEvent[] = [];

      consumer.on("IntakeCompleted", async (event) => {
        receivedEvents.push(event);
      });

      await consumer.initialize();
      await consumer.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Dispatch multiple events
      await dispatcher.dispatchBatch([
        {
          aggregateId: "form-multi-1",
          payload: {
            formId: "form-multi-1",
            completedBy: new Date(),
            answers: {},
          },
        },
        {
          aggregateId: "form-multi-2",
          payload: {
            formId: "form-multi-2",
            completedBy: new Date(),
            answers: {},
          },
        },
        {
          aggregateId: "form-multi-3",
          payload: {
            formId: "form-multi-3",
            completedBy: new Date(),
            answers: {},
          },
        },
      ]);

      // Wait for events to be processed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(receivedEvents.length).toBeGreaterThanOrEqual(3);
    });

    it("should process event payload correctly", async () => {
      const receivedEvents: DomainEvent[] = [];

      consumer.on("IntakeCompleted", async (event) => {
        receivedEvents.push(event);
      });

      await consumer.initialize();
      await consumer.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const testDate = new Date("2026-01-22T15:30:00Z");
      await dispatcher.dispatch("form-payload-test", {
        formId: "form-payload-test",
        completedBy: testDate,
        answers: {
          patientName: "Alice Johnson",
          age: 35,
          condition: "Healthy",
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(receivedEvents).toHaveLength(1);
      const receivedEvent = receivedEvents[0];
      expect(receivedEvent?.payload["formId"]).toBe("form-payload-test");
      expect(receivedEvent?.payload["answers"]).toEqual({
        patientName: "Alice Johnson",
        age: 35,
        condition: "Healthy",
      });
    });

    it("should call multiple handlers for same event type", async () => {
      const handler1Calls: DomainEvent[] = [];
      const handler2Calls: DomainEvent[] = [];

      consumer.on("IntakeCompleted", async (event) => {
        handler1Calls.push(event);
      });

      consumer.on("IntakeCompleted", async (event) => {
        handler2Calls.push(event);
      });

      await consumer.initialize();
      await consumer.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      await dispatcher.dispatch("form-multi-handler", {
        formId: "form-multi-handler",
        completedBy: new Date(),
        answers: {},
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(handler1Calls).toHaveLength(1);
      expect(handler2Calls).toHaveLength(1);
    });
  });

  describe("error handling", () => {
    it("should handle event with no registered handlers", async () => {
      // Don't register any handlers
      await consumer.initialize();
      await consumer.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Dispatch event - should not throw
      await expect(
        dispatcher.dispatch("form-no-handler", {
          formId: "form-no-handler",
          completedBy: new Date(),
          answers: {},
        }),
      ).resolves.toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 500));
    });

    it("should handle handler errors gracefully", async () => {
      let errorThrown = false;

      consumer.on("IntakeCompleted", async () => {
        errorThrown = true;
        throw new Error("Handler error");
      });

      await consumer.initialize();
      await consumer.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not throw - error should be caught
      await expect(
        dispatcher.dispatch("form-error", {
          formId: "form-error",
          completedBy: new Date(),
          answers: {},
        }),
      ).resolves.toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(errorThrown).toBe(true);
    });
  });

  describe("lifecycle", () => {
    it("should stop consumer cleanly", async () => {
      await consumer.initialize();
      await consumer.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      await expect(consumer.stop()).resolves.not.toThrow();
    });

    it("should allow restart after stop", async () => {
      const receivedEvents: DomainEvent[] = [];

      consumer.on("IntakeCompleted", async (event) => {
        receivedEvents.push(event);
      });

      await consumer.initialize();
      await consumer.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      await consumer.stop();

      // Create new consumer with same queue
      const rabbitMQ = getTestRabbitMQConnection();
      const newConsumer = new EventConsumer(rabbitMQ, {
        queueName: testQueue,
        exchange: testExchange,
        routingKeys: ["intake.completed"],
        durable: false,
        prefetchCount: 10,
      });

      newConsumer.on("IntakeCompleted", async (event) => {
        receivedEvents.push(event);
      });

      await newConsumer.initialize();
      await newConsumer.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      await dispatcher.dispatch("form-restart", {
        formId: "form-restart",
        completedBy: new Date(),
        answers: {},
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(receivedEvents.length).toBeGreaterThanOrEqual(1);

      await newConsumer.stop();
    });
  });
});
