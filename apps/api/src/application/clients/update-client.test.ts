import { beforeEach, describe, expect, test } from "bun:test";
import type { ClientRepository } from "../../domain/ports/client-repository";
import type { ClientRow } from "../../domain/tasks/types";
import { UpdateClient } from "./update-client";
import { ClientNotFound, InvalidClientInput } from "./errors";

class InMemoryClientRepository implements ClientRepository {
  rows: ClientRow[] = [];
  nextId = "00000000-0000-0000-0000-000000000001";
  throwOnUpdate = false;

  async list(): Promise<ClientRow[]> {
    return this.rows.filter((r) => r.deletedAt === null);
  }
  async findById(params: {
    userId: string;
    clientId: string;
  }): Promise<ClientRow | null> {
    return (
      this.rows.find(
        (r) =>
          r.id === params.clientId &&
          r.userId === params.userId &&
          r.deletedAt === null,
      ) ?? null
    );
  }
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
  async update(params: {
    userId: string;
    clientId: string;
    name?: string;
    email?: string | null;
    phone?: string | null;
  }): Promise<ClientRow> {
    if (this.throwOnUpdate) throw new Error("no result");
    const row = await this.findById({
      userId: params.userId,
      clientId: params.clientId,
    });
    if (!row) throw new Error("no result");
    if (params.name !== undefined) row.name = params.name;
    if (params.email !== undefined) row.email = params.email;
    if (params.phone !== undefined) row.phone = params.phone;
    row.updatedAt = new Date();
    return row;
  }
  async softDelete(params: {
    userId: string;
    clientId: string;
  }): Promise<ClientRow> {
    const row = await this.findById({
      userId: params.userId,
      clientId: params.clientId,
    });
    if (!row) throw new Error("no result");
    row.deletedAt = new Date();
    return row;
  }
}

const USER_ID = "11111111-1111-1111-1111-111111111111";

describe("UpdateClient", () => {
  let repo: InMemoryClientRepository;
  let sut: UpdateClient;
  let existingId: string;

  beforeEach(async () => {
    repo = new InMemoryClientRepository();
    const created = await repo.insert({
      userId: USER_ID,
      name: "Acme Corp",
      email: "info@acme.test",
      phone: null,
    });
    existingId = created.id;
    sut = new UpdateClient({ clientRepository: repo });
  });

  test("updates name only", async () => {
    const result = await sut.execute({
      userId: USER_ID,
      clientId: existingId,
      name: "Acme SA",
    });
    expect(result.name).toBe("Acme SA");
    expect(result.email).toBe("info@acme.test"); // unchanged
  });

  test("updates multiple fields", async () => {
    const result = await sut.execute({
      userId: USER_ID,
      clientId: existingId,
      name: "Acme",
      email: null,
      phone: "+54-11-5000",
    });
    expect(result.name).toBe("Acme");
    expect(result.email).toBeNull();
    expect(result.phone).toBe("+54-11-5000");
  });

  test("trims whitespace from name", async () => {
    const result = await sut.execute({
      userId: USER_ID,
      clientId: existingId,
      name: "  Globex  ",
    });
    expect(result.name).toBe("Globex");
  });

  test("rejects empty name", async () => {
    await expect(
      sut.execute({ userId: USER_ID, clientId: existingId, name: "   " }),
    ).rejects.toThrow(InvalidClientInput);
  });

  test("rejects name > 100 chars", async () => {
    await expect(
      sut.execute({
        userId: USER_ID,
        clientId: existingId,
        name: "a".repeat(101),
      }),
    ).rejects.toThrow(InvalidClientInput);
  });

  test("rejects phone > 40 chars", async () => {
    await expect(
      sut.execute({
        userId: USER_ID,
        clientId: existingId,
        phone: "+".repeat(41),
      }),
    ).rejects.toThrow(InvalidClientInput);
  });

  test("rejects email > 254 chars", async () => {
    await expect(
      sut.execute({
        userId: USER_ID,
        clientId: existingId,
        email: "a".repeat(250) + "@x.com",
      }),
    ).rejects.toThrow(InvalidClientInput);
  });

  test("throws ClientNotFound when client does not exist", async () => {
    repo.throwOnUpdate = true;
    await expect(
      sut.execute({
        userId: USER_ID,
        clientId: "nonexistent-id",
        name: "X",
      }),
    ).rejects.toThrow(ClientNotFound);
  });
});
