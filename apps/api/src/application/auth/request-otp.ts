import type { Clock } from "../../domain/ports/clock";
import type {
  EmailSendingRepository,
} from "../../domain/ports/email-sending-repository";
import type { IdGenerator } from "../../domain/ports/id-generator";
import type { LoginRepository } from "../../domain/ports/login-repository";
import type { OtpGenerator } from "../../domain/ports/otp-generator";
import {
  OTP_TTL_MS,
  RATE_LIMIT_MAX_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
} from "./constants";
import { RateLimitedError } from "./errors";

export interface RequestOtpInput {
  email: string;
}

export interface RequestOtpOutput {
  ok: true;
}

export interface RequestOtpDependencies {
  clock: Clock;
  idGenerator: IdGenerator;
  otpGenerator: OtpGenerator;
  loginRepository: LoginRepository;
  emailSendingRepository: EmailSendingRepository;
}

export class RequestOtp {
  constructor(private readonly deps: RequestOtpDependencies) {}

  async execute(input: RequestOtpInput): Promise<RequestOtpOutput> {
    const email = input.email.trim().toLowerCase();
    const now = this.deps.clock.now();

    const recentCount = await this.deps.loginRepository.countRecentByEmail(
      email,
      new Date(now.getTime() - RATE_LIMIT_WINDOW_MS),
    );
    if (recentCount >= RATE_LIMIT_MAX_ATTEMPTS) {
      throw new RateLimitedError();
    }

    const id = this.deps.idGenerator.generate();
    const code = this.deps.otpGenerator.generate();

    await this.deps.loginRepository.create({
      id,
      email,
      code,
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      attempts: 0,
      createdAt: now,
    });

    await this.deps.emailSendingRepository.create({
      id: this.deps.idGenerator.generate(),
      from: "auth@crmhome.app",
      to: email,
      subject: "Tu código de acceso",
      body: `Tu código es ${code}`,
      loginId: id,
      status: "pending",
      createdAt: now,
    });

    return { ok: true };
  }
}
