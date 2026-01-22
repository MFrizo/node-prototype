import { RabbitMQConnection } from "../messaging/RabbitMQConnection.js";
import { EventConsumer } from "../messaging/EventConsumer.js";

async function startConsumer() {
  const rabbitMQ = RabbitMQConnection.getInstance(
    "amqp://admin:password@localhost:5672",
  );
  await rabbitMQ.connect();

  const consumer = new EventConsumer(rabbitMQ, {
    queueName: "intake_completed_queue",
    exchange: "intake_events",
    routingKeys: ["form.*"],
    prefetchCount: 10,
  });

  consumer.on("IntakeCompletedEvent", async (event) => {
    console.log("Handling IntakeCompletedEvent event:", event);
    console.log("Finished handling IntakeCompletedEvent event:", event);
  });

  await consumer.initialize();
  await consumer.start();
  console.log("Event consumer is running...");

  process.on("SIGINT", async () => {
    console.log("Shutting down consumer...");
    await consumer.stop();
    await rabbitMQ.close();
    process.exit(0);
  });
}

try {
  await startConsumer();
} catch (error) {
  console.error(error);
  process.exit(1);
}
