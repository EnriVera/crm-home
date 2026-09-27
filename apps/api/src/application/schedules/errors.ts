export abstract class ScheduleDomainError extends Error {
  abstract readonly code: string;
}

export class ScheduleNotFound extends ScheduleDomainError {
  readonly code = "SCHEDULE_NOT_FOUND";
  constructor(message = "Schedule not found") {
    super(message);
    this.name = "ScheduleNotFound";
  }
}

export class InvalidScheduleInput extends ScheduleDomainError {
  readonly code = "INVALID_SCHEDULE_INPUT";
  constructor(message = "Invalid schedule input") {
    super(message);
    this.name = "InvalidScheduleInput";
  }
}
