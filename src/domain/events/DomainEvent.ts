export interface DomainEvent {
  eventId: string;
  eventType: string;
  occurredOn: Date;
  aggregateId: string;
  payload: Record<string, unknown>;
  toJSON(): object;
}

export abstract class BaseDomainEvent implements DomainEvent {
  public readonly eventId: string;
  public readonly eventType: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;
  public readonly payload: Record<string, unknown>;

  constructor(
    eventType: string,
    aggregateId: string,
    payload: Record<string, unknown>,
  ) {
    this.eventId = crypto.randomUUID();
    this.eventType = eventType;
    this.aggregateId = aggregateId;
    this.occurredOn = new Date();
    this.payload = payload;
  }

  public toJSON(): object {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredOn: this.occurredOn.toISOString(),
      aggregateId: this.aggregateId,
      payload: this.payload,
    };
  }
}
