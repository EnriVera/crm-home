import { beforeEach, describe, expect, test } from "bun:test";
import type { ClientRepository } from "../../domain/ports/client-repository";
import type { ClientRow } from "../../domain/tasks/types";
import { DeleteClient } from "./delete-client";
import { ClientNotFound } from "./errors";

class InMemoryClientRepository implements ClientRepository {
  rows: ClientRow[] = [];
  nextId = "00000000-0000-0000-0000-000000000001";
  throwOnSoftDelete = false;

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
  async update(): Promise<ClientRow> {
    throw new Error("not implemented");
  }
  async softDelete(params: {
    userId: string;
    clientId: string;
  }): Promise<ClientRow> {
    if (this.throwOnSoftDelete) throw new Error("no result");
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

describe("DeleteClient", () => {
  let repo: InMemoryClientRepository;
  let sut: DeleteClient;
  let existingId: string;

  beforeEach(async () => {
    repo = new InMemoryClientRepository();
    const created = await repo.insert({
      userId: USER_ID,
      name: "Acme",
      email: null,
      phone: null,
    });
    existingId = created.id;
    sut = new DeleteClient({ clientRepository: repo });
  });

  test("soft-deletes a client (sets deletedAt)", async () => {
    const result = await sut.execute({
      userId: USER_ID,
      clientId: existingId,
    });
    expect(result.deletedAt).not.toBeNull();
    const found = await repo.findById({
      userId: USER_ID,
      clientId: existingId,
    });
    expect(found).toBeNull();
  });

  test("throws ClientNotFound when client does not exist", async () => {
    repo.throwOnSoftDelete = true;
    await expect(
      sut.execute({ userId: USER_ID, clientId: "nonexistent" }),
    ).rejects.toThrow(ClientNotFound);
  });

  test("throws ClientNotFound when client belongs to another user", async () => {
    await expect(
      sut.execute({
        userId: "22222222-2222-2222-2222-222222222222",
        clientId: existingId,
      }),
    ).rejects.toThrow(ClientNotFound);
  });
});
