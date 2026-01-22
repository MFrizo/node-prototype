import amqp from "amqplib";
import { RabbitMQConnection } from "./RabbitMQConnection.js";
import { type DomainEvent } from "../../domain/events/DomainEvent.js";

type Connection = Awaited<ReturnType<typeof amqp.connect>>;
type Channel = Awaited<ReturnType<Connection["createChannel"]>>;
type ConsumeMessage = amqp.ConsumeMessage;

export interface ConsumerConfig {
  queueName: string;
  exchange: string;
  routingKeys: string[];
  durable: boolean;
  prefetchCount: number;
}

export type EventHandler = (event: DomainEvent) => Promise<void>;

export class EventConsumer {
  private readonly config: ConsumerConfig;
  private readonly rabbitMQConnection: RabbitMQConnection;
  private readonly handlers = new Map<string, EventHandler[]>();
  private channel: Channel | null = null;

  constructor(
    rabbitMQConnection: RabbitMQConnection,
    config?: Partial<ConsumerConfig>,
  ) {
    this.rabbitMQConnection = rabbitMQConnection;
    this.config = {
      queueName: config?.queueName || "intake_completed_queue",
      exchange: config?.exchange || "intake_events",
      routingKeys: config?.routingKeys || ["form.*"],
      durable: config?.durable ?? true,
      prefetchCount: config?.prefetchCount || 10,
    };
  }

  /**
   * Register a handler for a specific event type
   */
  public on(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)?.push(handler);
  }

  /**
   * Initialize the consumer: create queue, bind to exchange, start consuming
   */
  public async initialize(): Promise<void> {
    try {
      // Create a new channel for this consumer to avoid sharing issues
      this.channel = await this.rabbitMQConnection.createChannel();

      // Set prefetch count for load balancing
      this.channel.prefetch(this.config.prefetchCount);

      // Assert queue exists
      await this.channel.assertQueue(this.config.queueName, {
        durable: this.config.durable,
      });

      // Bind queue to exchange with routing keys
      for (const routingKey of this.config.routingKeys) {
        await this.channel.bindQueue(
          this.config.queueName,
          this.config.exchange,
          routingKey,
        );
        console.log(
          `Queue ${this.config.queueName} bound to exchange ${this.config.exchange} with routing key: ${routingKey}`,
        );
      }

      console.log(
        `EventConsumer initialized for queue: ${this.config.queueName}`,
      );
    } catch (error) {
      console.error("Failed to initialize EventConsumer:", error);
      throw error;
    }
  }

  /**
   * Start consuming messages from the queue
   */
  public async start(): Promise<void> {
    if (!this.channel) {
      await this.initialize();
    }

    if (!this.channel) {
      throw new Error("Channel not initialized");
    }

    console.log(`Starting consumer for queue: ${this.config.queueName}`);

    await this.channel.consume(
      this.config.queueName,
      async (message) => {
        if (message) {
          await this.handleMessage(message);
        }
      },
      {
        noAck: false, // Manual acknowledgment
      },
    );

    console.log(`Consumer started for queue: ${this.config.queueName}`);
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(message: ConsumeMessage): Promise<void> {
    try {
      const content = message.content.toString();
      const event = JSON.parse(content) as DomainEvent;

      console.log(`Received event: ${event.eventType} (${event.eventId})`);

      // Get handlers for this event type
      const handlers = this.handlers.get(event.eventType) || [];

      if (handlers.length === 0) {
        console.warn(
          `No handlers registered for event type: ${event.eventType}`,
        );
        // Acknowledge even if no handlers (to prevent redelivery)
        this.channel?.ack(message);
        return;
      }

      // Execute all handlers
      await Promise.all(handlers.map((handler) => handler(event)));

      // Acknowledge message after successful processing
      this.channel?.ack(message);

      console.log(
        `Event processed successfully: ${event.eventType} (${event.eventId})`,
      );
    } catch (error) {
      console.error("Error processing message:", error);

      // Reject message and requeue (or send to dead letter queue)
      this.channel?.nack(message, false, true);
    }
  }

  /**
   * Stop consuming messages
   */
  public async stop(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
      console.log("EventConsumer stopped");
    }
  }
}
