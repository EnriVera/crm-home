import type { ScheduleRepository } from "../../domain/ports/schedule-repository";
import type { ScheduleRow } from "../../domain/types";
import { normalizeAmount } from "../shared/money";
import { InvalidScheduleInput, ScheduleNotFound } from "./errors";

export interface UpdateScheduleInput {
  userId: string;
  scheduleId: string;
  name?: string;
  accountId?: string;
  amount?: string;
  currencyId?: string;
  frequency?: ScheduleRow["frequency"];
  nextRunDate?: string;
  isActive?: boolean;
  description?: string | null;
}

export interface UpdateScheduleDependencies {
  scheduleRepository: ScheduleRepository;
}

export class UpdateSchedule {
  constructor(private readonly deps: UpdateScheduleDependencies) {}

  async execute(input: UpdateScheduleInput): Promise<ScheduleRow> {
    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (trimmed.length === 0 || trimmed.length > 100) {
        throw new InvalidScheduleInput("name must be 1-100 chars");
      }
      input = { ...input, name: trimmed };
    }
    if (input.amount !== undefined) {
      input = { ...input, amount: normalizeAmount(input.amount.trim()) };
    }

    try {
      return await this.deps.scheduleRepository.update(input);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("no result") || err.message.includes("not found"))
      ) {
        throw new ScheduleNotFound();
      }
      throw err;
    }
  }
}
