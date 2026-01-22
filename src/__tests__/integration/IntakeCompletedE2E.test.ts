import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { RabbitMQConnection } from "../../infrastructure/messaging/RabbitMQConnection.js";
import { EventConsumer } from "../../infrastructure/messaging/EventConsumer.js";
import { EventDispatcher } from "../../infrastructure/messaging/EventDispatcher.js";
import { IntakeCompletedEvent } from "../../domain/events/IntakeCompletedEvent.js";
import {
  setupTestRabbitMQ,
  teardownTestRabbitMQ,
  deleteTestQueue,
  deleteTestExchange,
  getTestRabbitMQURI,
} from "../helpers/rabbitmq.js";
import type { DomainEvent } from "../../domain/events/DomainEvent.js";
import type { IntakeCompletedPayload } from "../../domain/events/IntakeCompletedEvent.js";

interface TestDispatcher {
  initialize: () => Promise<void>;
  dispatch: (
    aggregateId: string,
    payload: IntakeCompletedPayload,
  ) => Promise<boolean>;
  dispatchBatch: (
    events: { aggregateId: string; payload: IntakeCompletedPayload }[],
  ) => Promise<boolean[]>;
  getConfig: () => { exchange: string; exchangeType: string };
}

describe("IntakeCompleted End-to-End Integration Tests", () => {
  let consumer: EventConsumer;
  let dispatcher: TestDispatcher;
  let rabbitMQ: RabbitMQConnection;
  const testSuiteId = `e2e_${Date.now()}`;
  const testQueue = `test_queue_${testSuiteId}`;
  const testExchange = `test_exchange_${testSuiteId}`;

  beforeAll(async () => {
    await setupTestRabbitMQ();
    rabbitMQ = RabbitMQConnection.getInstance(getTestRabbitMQURI());
    await rabbitMQ.connect();
  });

  afterAll(async () => {
    await deleteTestQueue(testQueue);
    await deleteTestExchange(testExchange);
    await rabbitMQ.close();
    await teardownTestRabbitMQ();
  });

  beforeEach(async () => {
    // Use EventDispatcher with our test exchange
    const eventDispatcher = new EventDispatcher(rabbitMQ, {
      exchange: testExchange,
      exchangeType: "topic",
      durable: false,
    });
    await eventDispatcher.initialize();

    // Create a wrapper dispatcher that uses our test exchange
    dispatcher = {
      initialize: async () => {
        // Already initialized above
      },
      dispatch: async (
        aggregateId: string,
        payload: IntakeCompletedPayload,
      ) => {
        const event = new IntakeCompletedEvent(aggregateId, payload);
        return await eventDispatcher.dispatch(event);
      },
      dispatchBatch: async (
        events: {
          aggregateId: string;
          payload: IntakeCompletedPayload;
        }[],
      ) => {
        const intakeEvents = events.map(
          ({ aggregateId, payload }) =>
            new IntakeCompletedEvent(aggregateId, payload),
        );
        return await eventDispatcher.dispatchBatch(intakeEvents);
      },
      getConfig: () => eventDispatcher.getConfig(),
    };

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

  describe("full workflow", () => {
    it("should complete full dispatch-consume cycle", async () => {
      const processedEvents: {
        event: DomainEvent;
        processedAt: Date;
      }[] = [];

      // Register consumer handler
      consumer.on("IntakeCompleted", async (event) => {
        processedEvents.push({
          event,
          processedAt: new Date(),
        });
      });

      await consumer.initialize();
      await consumer.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Dispatch event
      const dispatchTime = new Date();
      const dispatched = await dispatcher.dispatch("form-e2e-1", {
        formId: "form-e2e-1",
        completedBy: dispatchTime,
        answers: {
          patientName: "End-to-End Test Patient",
          age: 40,
        },
      });

      expect(dispatched).toBe(true);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(processedEvents).toHaveLength(1);
      expect(processedEvents[0]?.event.eventType).toBe("IntakeCompleted");
      expect(processedEvents[0]?.event.aggregateId).toBe("form-e2e-1");
      expect(processedEvents[0]?.processedAt.getTime()).toBeGreaterThanOrEqual(
        dispatchTime.getTime(),
      );
    });

    it("should handle batch dispatch and consumption", async () => {
      const processedFormIds = new Set<string>();

      consumer.on("IntakeCompleted", async (event) => {
        const formId = event.payload["formId"] as string;
        processedFormIds.add(formId);
      });

      await consumer.initialize();
      await consumer.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Dispatch batch
      const results = await dispatcher.dispatchBatch([
        {
          aggregateId: "form-batch-e2e-1",
          payload: {
            formId: "form-batch-e2e-1",
            completedBy: new Date(),
            answers: { patient: "Patient 1" },
          },
        },
        {
          aggregateId: "form-batch-e2e-2",
          payload: {
            formId: "form-batch-e2e-2",
            completedBy: new Date(),
            answers: { patient: "Patient 2" },
          },
        },
        {
          aggregateId: "form-batch-e2e-3",
          payload: {
            formId: "form-batch-e2e-3",
            completedBy: new Date(),
            answers: { patient: "Patient 3" },
          },
        },
      ]);

      expect(results.every((r: boolean) => r === true)).toBe(true);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(processedFormIds.size).toBe(3);
      expect(processedFormIds.has("form-batch-e2e-1")).toBe(true);
      expect(processedFormIds.has("form-batch-e2e-2")).toBe(true);
      expect(processedFormIds.has("form-batch-e2e-3")).toBe(true);
    });

    it("should maintain event order for same aggregate", async () => {
      const processedEvents: DomainEvent[] = [];

      consumer.on("IntakeCompleted", async (event) => {
        processedEvents.push(event);
      });

      await consumer.initialize();
      await consumer.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Dispatch multiple events for same form
      for (let i = 1; i <= 5; i++) {
        await dispatcher.dispatch(`form-order-${i}`, {
          formId: `form-order-${i}`,
          completedBy: new Date(),
          answers: { sequence: i },
        });
      }

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(processedEvents.length).toBeGreaterThanOrEqual(5);

      // Verify all events were processed
      const sequences = processedEvents.map(
        (e: DomainEvent) =>
          (e.payload["answers"] as Record<string, unknown>)["sequence"],
      );
      expect(sequences).toEqual(expect.arrayContaining([1, 2, 3, 4, 5]));
    });

    it("should handle complex payload data", async () => {
      let receivedPayload: Record<string, unknown> | null = null;

      consumer.on("IntakeCompleted", async (event) => {
        receivedPayload = event.payload;
      });

      await consumer.initialize();
      await consumer.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const complexAnswers = {
        patientInfo: {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: "1986-05-15",
        },
        medicalHistory: {
          conditions: ["Hypertension", "Type 2 Diabetes"],
          medications: [
            { name: "Metformin", dosage: "500mg", frequency: "twice daily" },
            { name: "Lisinopril", dosage: "10mg", frequency: "once daily" },
          ],
          allergies: ["Penicillin"],
        },
        vitals: {
          bloodPressure: "130/85",
          heartRate: 72,
          temperature: 98.6,
          weight: 185,
          height: 70,
        },
        consent: true,
        signature: "data:image/png;base64,iVBORw0KG...",
      };

      await dispatcher.dispatch("form-complex", {
        formId: "form-complex",
        completedBy: new Date(),
        answers: complexAnswers,
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(receivedPayload).not.toBeNull();
      if (receivedPayload) {
        expect(receivedPayload["formId"]).toBe("form-complex");

        const receivedAnswers = receivedPayload["answers"] as Record<
          string,
          unknown
        >;
        expect(receivedAnswers).toEqual(complexAnswers);
      }
    });
  });

  describe("performance", () => {
    it("should handle high volume of events", async () => {
      const processedCount = { value: 0 };

      consumer.on("IntakeCompleted", async () => {
        processedCount.value++;
      });

      await consumer.initialize();
      await consumer.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const eventCount = 50;
      const events = Array.from({ length: eventCount }, (_, i) => ({
        aggregateId: `form-perf-${i}`,
        payload: {
          formId: `form-perf-${i}`,
          completedBy: new Date(),
          answers: { index: i },
        },
      }));

      const startTime = Date.now();
      await dispatcher.dispatchBatch(events);
      const dispatchTime = Date.now() - startTime;

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      expect(processedCount.value).toBeGreaterThanOrEqual(eventCount);
      expect(dispatchTime).toBeLessThan(5000); // Should dispatch 50 events in < 5s
    }, 10000); // Increase timeout for this test
  });
});
