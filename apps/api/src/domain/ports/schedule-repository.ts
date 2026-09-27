import type { ScheduleRow } from "../tasks/types";

export interface ScheduleRepository {
  list(params: { userId: string; limit: number }): Promise<ScheduleRow[]>;

  findById(params: {
    userId: string;
    scheduleId: string;
  }): Promise<ScheduleRow | null>;

  insert(params: {
    userId: string;
    name: string;
    accountId: string;
    amount: string;
    currencyId: string;
    frequency: ScheduleRow["frequency"];
    nextRunDate: string;
    isActive: boolean;
    description: string | null;
  }): Promise<ScheduleRow>;

  update(params: {
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
  }): Promise<ScheduleRow>;

  softDelete(params: {
    userId: string;
    scheduleId: string;
  }): Promise<ScheduleRow>;
}
