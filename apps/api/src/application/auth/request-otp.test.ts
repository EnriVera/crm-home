import { describe, expect, test } from "bun:test";
import { RateLimitedError } from "./errors";
import { RequestOtp } from "./request-otp";
import type {
  EmailSending,
  EmailSendingRepository,
} from "../../domain/ports/email-sending-repository";
import type {
  EmailTemplateRenderer,
  RenderedEmail,
} from "../../domain/ports/email-template-renderer";
import type { IdGenerator } from "../../domain/ports/id-generator";
import type { Login, LoginRepository } from "../../domain/ports/login-repository";
import type { OtpGenerator } from "../../domain/ports/otp-generator";
import type { Clock } from "../../domain/ports/clock";

class FixedClock implements Clock {
  constructor(private readonly time: Date) {}
  now(): Date {
    return new Date(this.time);
  }
}

class FakeIdGenerator implements IdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

class FakeOtpGenerator implements OtpGenerator {
  constructor(private readonly code: string = "041283") {}
  generate(): string {
    return this.code;
  }
}

class FakeEmailTemplateRenderer implements EmailTemplateRenderer {
  constructor(private readonly rendered: RenderedEmail) {}

  async renderOtp(input: { code: string }): Promise<RenderedEmail> {
    return {
      subject: `${this.rendered.subject} ${input.code}`,
      html: `<html><body>${this.rendered.html} ${input.code}</body></html>`,
      text: `${this.rendered.text} ${input.code}`,
    };
  }
}

class InMemoryLoginRepository implements LoginRepository {
  readonly logins: Login[] = [];

  async create(login: Login): Promise<void> {
    this.logins.push({ ...login });
  }

  async findLatestByEmail(_email: string): Promise<Login | undefined> {
    return undefined;
  }

  async incrementAttempts(_id: string): Promise<void> {}

  async markConsumed(_id: string): Promise<void> {}

  async countRecentByEmail(email: string, since: Date): Promise<number> {
    return this.logins.filter(
      (l) => l.email === email && l.createdAt >= since,
    ).length;
  }
}

class InMemoryEmailSendingRepository implements EmailSendingRepository {
  readonly messages: EmailSending[] = [];

  async create(message: EmailSending): Promise<void> {
    this.messages.push({ ...message });
  }

  async findPending(_limit: number): Promise<EmailSending[]> {
    return [];
  }

  async markSent(_id: string): Promise<void> {}

  async markFailed(_id: string): Promise<void> {}
}

function createUseCase(overrides: {
  clock?: Clock;
  idGenerator?: IdGenerator;
  otpGenerator?: OtpGenerator;
  emailTemplateRenderer?: EmailTemplateRenderer;
  loginRepository?: InMemoryLoginRepository;
  emailSendingRepository?: InMemoryEmailSendingRepository;
} = {}) {
  const now = new Date("2025-01-15T12:00:00.000Z");
  const loginRepository =
    overrides.loginRepository ?? new InMemoryLoginRepository();
  const emailSendingRepository =
    overrides.emailSendingRepository ?? new InMemoryEmailSendingRepository();
  return {
    now,
    loginRepository,
    emailSendingRepository,
    useCase: new RequestOtp({
      clock: overrides.clock ?? new FixedClock(now),
      idGenerator: overrides.idGenerator ?? new FakeIdGenerator(),
      otpGenerator: overrides.otpGenerator ?? new FakeOtpGenerator(),
      emailTemplateRenderer:
        overrides.emailTemplateRenderer ??
        new FakeEmailTemplateRenderer({
          subject: "Tu código de acceso",
          html: "<p>Código:</p>",
          text: "Código:",
        }),
      loginRepository,
      emailSendingRepository,
    }),
  };
}

describe("RequestOtp", () => {
  test("solicitud válida persiste login y encola email", async () => {
    const { useCase, loginRepository, emailSendingRepository } = createUseCase();

    const result = await useCase.execute({ email: "Ana@Example.com" });

    expect(result).toEqual({ ok: true });
    expect(loginRepository.logins).toHaveLength(1);
    const login = loginRepository.logins[0]!;
    expect(login.email).toBe("ana@example.com");
    expect(login.code).toBe("041283");
    expect(login.attempts).toBe(0);
    expect(emailSendingRepository.messages).toHaveLength(1);
    expect(emailSendingRepository.messages[0]!.to).toBe("ana@example.com");
    expect(emailSendingRepository.messages[0]!.loginId).toBe(login.id);
  });

  test("email se normaliza a minúsculas", async () => {
    const { useCase, loginRepository } = createUseCase();

    await useCase.execute({ email: "ANA@EXAMPLE.COM" });

    expect(loginRepository.logins[0]!.email).toBe("ana@example.com");
  });

  test("permite hasta 3 envíos por hora", async () => {
    const now = new Date("2025-01-15T12:00:00.000Z");
    const loginRepository = new InMemoryLoginRepository();
    const { useCase } = createUseCase({ clock: new FixedClock(now), loginRepository });

    await useCase.execute({ email: "ana@example.com" });
    await useCase.execute({ email: "ana@example.com" });
    await useCase.execute({ email: "ana@example.com" });

    expect(loginRepository.logins).toHaveLength(3);
  });

  test("rechaza el 4.º envío dentro de una hora con RateLimitedError", async () => {
    const now = new Date("2025-01-15T12:00:00.000Z");
    const loginRepository = new InMemoryLoginRepository();
    const { useCase, emailSendingRepository } = createUseCase({
      clock: new FixedClock(now),
      loginRepository,
    });

    await useCase.execute({ email: "ana@example.com" });
    await useCase.execute({ email: "ana@example.com" });
    await useCase.execute({ email: "ana@example.com" });

    await expect(useCase.execute({ email: "ana@example.com" })).rejects.toThrow(
      RateLimitedError,
    );
    expect(loginRepository.logins).toHaveLength(3);
    expect(emailSendingRepository.messages).toHaveLength(3);
  });

  test("rate-limit no crea filas en login ni email_sending", async () => {
    const now = new Date("2025-01-15T12:00:00.000Z");
    const loginRepository = new InMemoryLoginRepository();
    const emailSendingRepository = new InMemoryEmailSendingRepository();
    const { useCase } = createUseCase({
      clock: new FixedClock(now),
      loginRepository,
      emailSendingRepository,
    });

    for (let i = 0; i < 3; i += 1) {
      await useCase.execute({ email: "ana@example.com" });
    }
    const beforeLimit = loginRepository.logins.length;

    await expect(useCase.execute({ email: "ana@example.com" })).rejects.toThrow();

    expect(loginRepository.logins).toHaveLength(beforeLimit);
    expect(emailSendingRepository.messages).toHaveLength(beforeLimit);
  });

  test("expiresAt es exactamente now + 10 minutos", async () => {
    const now = new Date("2025-01-15T12:00:00.000Z");
    const { useCase, loginRepository } = createUseCase({
      clock: new FixedClock(now),
    });

    await useCase.execute({ email: "ana@example.com" });

    expect(loginRepository.logins[0]!.expiresAt.getTime()).toBe(
      now.getTime() + 10 * 60 * 1000,
    );
  });

  test("asunto y cuerpo del email provienen del renderer", async () => {
    const { useCase, emailSendingRepository } = createUseCase({
      emailTemplateRenderer: new FakeEmailTemplateRenderer({
        subject: "Código de ingreso",
        html: "<p>Usá este código:</p>",
        text: "Usá este código:",
      }),
    });

    await useCase.execute({ email: "ana@example.com" });

    const message = emailSendingRepository.messages[0]!;
    expect(message.subject).toBe("Código de ingreso 041283");
    expect(message.body).toBe("<html><body><p>Usá este código:</p> 041283</body></html>");
  });

  test("el HTML renderizado con markup se persiste en body", async () => {
    const { useCase, emailSendingRepository } = createUseCase();

    await useCase.execute({ email: "ana@example.com" });

    const message = emailSendingRepository.messages[0]!;
    expect(message.body).toContain("<html>");
    expect(message.body).toContain("041283");
  });
});
