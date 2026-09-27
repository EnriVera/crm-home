import type { ScheduleRepository } from "../../domain/ports/schedule-repository";
import type { ScheduleRow } from "../../domain/tasks/types";

export interface ListSchedulesInput {
  userId: string;
  limit: number;
}

export interface ListSchedulesDependencies {
  scheduleRepository: ScheduleRepository;
}

export class ListSchedules {
  constructor(private readonly deps: ListSchedulesDependencies) {}

  async execute(input: ListSchedulesInput): Promise<ScheduleRow[]> {
    const limit = Math.min(Math.max(input.limit, 1), 100);
    return this.deps.scheduleRepository.list({
      userId: input.userId,
      limit,
    });
  }
}
