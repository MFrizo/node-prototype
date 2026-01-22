import { BaseDomainEvent } from "./DomainEvent.js";

export interface IntakeCompletedPayload extends Record<string, unknown> {
  formId: string;
  completedBy: Date;
  answers: Record<string, unknown>;
}

export class IntakeCompletedEvent extends BaseDomainEvent {
  constructor(aggregateId: string, payload: IntakeCompletedPayload) {
    super("IntakeCompleted", aggregateId, payload);
  }

  get formId(): string {
    return this.payload["formId"] as string;
  }

  get completedBy(): Date {
    return this.payload["completedBy"] as Date;
  }

  get answers(): Record<string, unknown> {
    return this.payload["answers"] as Record<string, unknown>;
  }
}
