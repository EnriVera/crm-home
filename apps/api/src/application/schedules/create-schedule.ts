import type { ScheduleRepository } from "../../domain/ports/schedule-repository";
import type { ScheduleRow } from "../../domain/tasks/types";
import { InvalidScheduleInput } from "./errors";

export interface CreateScheduleInput {
  userId: string;
  name: string;
  accountId: string;
  amount: string;
  currencyId: string;
  frequency: ScheduleRow["frequency"];
  nextRunDate: string;
  isActive: boolean;
  description: string | null;
}

export interface CreateScheduleDependencies {
  scheduleRepository: ScheduleRepository;
}

export class CreateSchedule {
  constructor(private readonly deps: CreateScheduleDependencies) {}

  async execute(input: CreateScheduleInput): Promise<ScheduleRow> {
    const name = input.name.trim();
    if (name.length === 0 || name.length > 100) {
      throw new InvalidScheduleInput("name must be 1-100 chars");
    }
    const amount = input.amount.trim();
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      throw new InvalidScheduleInput("amount must be a positive number");
    }
    if (input.description !== null && input.description.length > 500) {
      throw new InvalidScheduleInput("description exceeds 500 chars");
    }

    return this.deps.scheduleRepository.insert({
      userId: input.userId,
      name,
      accountId: input.accountId,
      amount: numAmount.toFixed(4),
      currencyId: input.currencyId,
      frequency: input.frequency,
      nextRunDate: input.nextRunDate,
      isActive: input.isActive,
      description: input.description,
    });
  }
}
