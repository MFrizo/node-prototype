import amqp from "amqplib";
import { type DomainEvent } from "../../domain/events/DomainEvent.js";
import { RabbitMQConnection } from "./RabbitMQConnection.js";

type Connection = Awaited<ReturnType<typeof amqp.connect>>;
type Channel = Awaited<ReturnType<Connection["createChannel"]>>;

export interface EventDispatcherConfig {
  exchange: string;
  exchangeType: "direct" | "topic" | "fanout" | "headers";
  durable: boolean;
}

export class EventDispatcher {
  private readonly config: EventDispatcherConfig;
  private readonly rabbitMQConnection: RabbitMQConnection;
  private channel: Channel | null = null;

  constructor(
    rabbitMQConnection: RabbitMQConnection,
    config?: Partial<EventDispatcherConfig>,
  ) {
    this.rabbitMQConnection = rabbitMQConnection;
    this.config = {
      exchange: config?.exchange || "intake_events",
      exchangeType: config?.exchangeType || "topic",
      durable: config?.durable ?? true,
    };
  }

  public async initialize(): Promise<void> {
    try {
      this.channel = await this.rabbitMQConnection.getChannel();

      // Assert the exchange
      await this.channel.assertExchange(
        this.config.exchange,
        this.config.exchangeType,
        {
          durable: this.config.durable,
        },
      );

      console.log(
        `EventDispatcher initialized with exchange: ${this.config.exchange}`,
      );
    } catch (error) {
      console.error("Failed to initialize EventDispatcher:", error);
      throw error;
    }
  }

  public async dispatch(event: DomainEvent): Promise<boolean> {
    try {
      if (!this.channel) {
        await this.initialize();
      }

      if (!this.channel) {
        throw new Error("Channel not initialized");
      }

      const routingKey = this.getRoutingKey(event);
      const message = JSON.stringify(event.toJSON());

      const published = this.channel.publish(
        this.config.exchange,
        routingKey,
        Buffer.from(message),
        {
          persistent: this.config.durable,
          contentType: "application/json",
          timestamp: Date.now(),
          messageId: event.eventId,
          type: event.eventType,
        },
      );

      if (published) {
        console.log(
          `Event dispatched: ${event.eventType} (${event.eventId}) with routing key: ${routingKey}`,
        );
        return true;
      } else {
        console.warn(
          `Failed to dispatch event: ${event.eventType} (${event.eventId})`,
        );
        return false;
      }
    } catch (error) {
      console.error("Error dispatching event:", error);
      throw error;
    }
  }

  public async dispatchBatch(events: DomainEvent[]): Promise<boolean[]> {
    const results: boolean[] = [];

    for (const event of events) {
      try {
        const result = await this.dispatch(event);
        results.push(result);
      } catch (error) {
        console.error(`Failed to dispatch event ${event.eventId}:`, error);
        results.push(false);
      }
    }

    return results;
  }

  private getRoutingKey(event: DomainEvent): string {
    // Convert event type from PascalCase to dot.notation
    // Example: FormCreated -> form.created
    const routingKey = event.eventType
      .replaceAll(/([A-Z])/g, ".$1")
      .toLowerCase()
      .substring(1);

    return routingKey;
  }

  public getConfig(): EventDispatcherConfig {
    return { ...this.config };
  }
}
