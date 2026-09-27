import { beforeEach, describe, expect, test } from "bun:test";
import { CreateClient } from "./create-client";
import { InvalidClientInput } from "./errors";
import type { ClientRepository } from "../../domain/ports/client-repository";
import type { ClientRow } from "../../domain/tasks/types";

/**
 * In-memory minimal para el contract del ClientRepository.
 *
 * Implementa solo los 2 métodos que usa `CreateClient` (insert +
 * nada más). Los demás métodos lanzan — si el use case los invoca por
 * error, el test rompe con un mensaje claro.
 */
class InMemoryClientRepository implements Pick<ClientRepository, "insert"> {
  rows: ClientRow[] = [];
  nextId = "00000000-0000-0000-0000-000000000001";

  async insert(params: {
    userId: string;
    name: string;
    email: string | null;
    phone: string | null;
  }): Promise<ClientRow> {
    const now = new Date();
    const row: ClientRow = {
      id: this.nextId,
      userId: params.userId,
      name: params.name,
      email: params.email,
      areaPhone: null,
      phone: params.phone,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.rows.push(row);
    return row;
  }
}

const USER_ID = "11111111-1111-1111-1111-111111111111";

describe("CreateClient", () => {
  let repo: InMemoryClientRepository;
  let sut: CreateClient;

  beforeEach(() => {
    repo = new InMemoryClientRepository();
    sut = new CreateClient({ clientRepository: repo as unknown as ClientRepository });
  });

  test("creates a client with trimmed name, null email, null phone", async () => {
    const result = await sut.execute({
      userId: USER_ID,
      name: "Acme Corp",
      email: null,
      phone: null,
    });
    expect(result.name).toBe("Acme Corp");
    expect(result.userId).toBe(USER_ID);
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(repo.rows.length).toBe(1);
  });

  test("trims whitespace from name", async () => {
    const result = await sut.execute({
      userId: USER_ID,
      name: "  Globex SA  ",
      email: null,
      phone: null,
    });
    expect(result.name).toBe("Globex SA");
  });

  test("rejects empty name (after trim)", async () => {
    await expect(
      sut.execute({ userId: USER_ID, name: "   ", email: null, phone: null }),
    ).rejects.toThrow(InvalidClientInput);
  });

  test("rejects name longer than 100 chars", async () => {
    await expect(
      sut.execute({
        userId: USER_ID,
        name: "a".repeat(101),
        email: null,
        phone: null,
      }),
    ).rejects.toThrow(InvalidClientInput);
  });

  test("rejects email longer than 254 chars", async () => {
    await expect(
      sut.execute({
        userId: USER_ID,
        name: "Valid",
        email: "a".repeat(250) + "@x.com",
        phone: null,
      }),
    ).rejects.toThrow(InvalidClientInput);
  });

  test("rejects phone longer than 40 chars", async () => {
    await expect(
      sut.execute({
        userId: USER_ID,
        name: "Valid",
        email: null,
        phone: "+".repeat(41),
      }),
    ).rejects.toThrow(InvalidClientInput);
  });

  test("accepts name at exactly 100 chars", async () => {
    const result = await sut.execute({
      userId: USER_ID,
      name: "a".repeat(100),
      email: null,
      phone: null,
    });
    expect(result.name.length).toBe(100);
  });

  test("propagates email and phone when provided", async () => {
    const result = await sut.execute({
      userId: USER_ID,
      name: "Acme",
      email: "info@acme.test",
      phone: "+54-11-4000-0000",
    });
    expect(result.email).toBe("info@acme.test");
    expect(result.phone).toBe("+54-11-4000-0000");
  });
});
