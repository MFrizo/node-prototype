import amqp from "amqplib";
import { RabbitMQConnection } from "../../infrastructure/messaging/RabbitMQConnection.js";

const TEST_RABBITMQ_URI =
  process.env["TEST_RABBITMQ_URI"] || "amqp://admin:password@localhost:5672";

type Connection = Awaited<ReturnType<typeof amqp.connect>>;
type Channel = Awaited<ReturnType<Connection["createChannel"]>>;

let testConnection: Connection | null = null;
let testChannel: Channel | null = null;

export async function setupTestRabbitMQ(): Promise<void> {
  if (!testConnection || !testChannel) {
    testConnection = await amqp.connect(TEST_RABBITMQ_URI);
    testChannel = await testConnection.createChannel();
  }
}

export async function teardownTestRabbitMQ(): Promise<void> {
  try {
    if (testChannel) {
      await testChannel.close();
      testChannel = null;
    }
  } catch (error) {
    console.warn("Error closing test channel:", error);
  }

  try {
    if (testConnection) {
      await testConnection.close();
      testConnection = null;
    }
  } catch (error) {
    console.warn("Error closing test connection:", error);
  }
}

export async function getTestChannel(): Promise<Channel> {
  if (!testChannel) {
    await setupTestRabbitMQ();
  }
  if (!testChannel) {
    throw new Error("Test channel not initialized");
  }
  return testChannel;
}

export async function clearTestQueue(queueName: string): Promise<void> {
  const channel = await getTestChannel();
  try {
    await channel.purgeQueue(queueName);
  } catch (error) {
    // Queue might not exist, which is fine
    console.warn(`Could not purge queue ${queueName}:`, error);
  }
}

export async function deleteTestQueue(queueName: string): Promise<void> {
  const channel = await getTestChannel();
  try {
    await channel.deleteQueue(queueName);
  } catch (error) {
    // Queue might not exist, which is fine
    console.warn(`Could not delete queue ${queueName}:`, error);
  }
}

export async function deleteTestExchange(exchangeName: string): Promise<void> {
  const channel = await getTestChannel();
  try {
    await channel.deleteExchange(exchangeName);
  } catch (error) {
    // Exchange might not exist, which is fine
    console.warn(`Could not delete exchange ${exchangeName}:`, error);
  }
}

export function getTestRabbitMQURI(): string {
  return TEST_RABBITMQ_URI;
}

export function getTestRabbitMQConnection(): RabbitMQConnection {
  return RabbitMQConnection.getInstance(TEST_RABBITMQ_URI);
}
