export interface HealthStatus {
  status: "ok";
}

export interface HealthRepository {
  check(): Promise<HealthStatus>;
}
