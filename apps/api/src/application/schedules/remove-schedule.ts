import type { ScheduleRepository } from "../../domain/ports/schedule-repository";
import type { ScheduleRow } from "../../domain/tasks/types";
import { ScheduleNotFound } from "./errors";

export interface RemoveScheduleInput {
  userId: string;
  scheduleId: string;
}

export interface RemoveScheduleDependencies {
  scheduleRepository: ScheduleRepository;
}

export class RemoveSchedule {
  constructor(private readonly deps: RemoveScheduleDependencies) {}

  async execute(input: RemoveScheduleInput): Promise<ScheduleRow> {
    try {
      return await this.deps.scheduleRepository.softDelete(input);
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
