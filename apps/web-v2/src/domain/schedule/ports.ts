import type {
  Schedule,
  ScheduleItem,
  StartTimerInput,
} from "@crm/contract/schedule";
import type { Result } from "../shared/result";
import type { DomainError } from "../shared/errors";

export interface ScheduleRepository {
  startTimer(input: StartTimerInput): Promise<Result<Schedule, DomainError>>;
  stopTimer(
    scheduleId: Schedule["id"],
  ): Promise<Result<ScheduleItem, DomainError>>;
  heartbeat(scheduleId: Schedule["id"]): Promise<Result<null, DomainError>>;
  listHistory(query: {
    fromDate?: string;
    toDate?: string;
  }): Promise<Result<ScheduleItem[], DomainError>>;
}

export type { Schedule, ScheduleItem, StartTimerInput };
