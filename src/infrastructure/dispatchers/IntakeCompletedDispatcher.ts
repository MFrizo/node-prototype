import { EventDispatcher } from "../messaging/EventDispatcher.js";
import { RabbitMQConnection } from "../messaging/RabbitMQConnection.js";
import {
  IntakeCompletedEvent,
  type IntakeCompletedPayload,
} from "../../domain/events/IntakeCompletedEvent.js";

interface IntakeCompletedDispatcherConfig {
  exchange?: string;
  exchangeType?: "direct" | "topic" | "fanout" | "headers";
  durable?: boolean;
}

export class IntakeCompletedDispatcher {
  private readonly eventDispatcher: EventDispatcher;

  constructor(
    rabbitMQConnection: RabbitMQConnection,
    config?: IntakeCompletedDispatcherConfig,
  ) {
    this.eventDispatcher = new EventDispatcher(rabbitMQConnection, {
      exchange: config?.exchange ?? "intake_events",
      exchangeType: config?.exchangeType ?? "topic",
      durable: config?.durable ?? true,
    });
  }

  public async initialize(): Promise<void> {
    await this.eventDispatcher.initialize();
  }

  public async dispatch(
    aggregateId: string,
    payload: IntakeCompletedPayload,
  ): Promise<boolean> {
    const event = new IntakeCompletedEvent(aggregateId, payload);
    return await this.eventDispatcher.dispatch(event);
  }

  public async dispatchBatch(
    events: { aggregateId: string; payload: IntakeCompletedPayload }[],
  ): Promise<boolean[]> {
    const intakeEvents = events.map(
      ({ aggregateId, payload }) =>
        new IntakeCompletedEvent(aggregateId, payload),
    );
    return await this.eventDispatcher.dispatchBatch(intakeEvents);
  }

  public getConfig() {
    return this.eventDispatcher.getConfig();
  }
}
