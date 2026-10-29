import { describe, expect, it } from "vitest";
import {
  clientInitials,
  filterClients,
  type Client,
} from "~/domain/client/entities";

function client(id: string, overrides: Partial<Client> = {}): Client {
  return {
    id,
    name: "Acme Studio",
    email: "hola@acme.test",
    phone: "+54 9 11 0000-1111",
    createdAt: new Date("2026-06-01T10:00:00.000Z"),
    updatedAt: new Date("2026-06-01T10:00:00.000Z"),
    ...overrides,
  };
}

describe("clientInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(clientInitials("Acme Studio")).toBe("AS");
    expect(clientInitials("Estudio Faro")).toBe("EF");
  });

  it("falls back to the first letter for a single word", () => {
    expect(clientInitials("Acme")).toBe("A");
  });

  it("returns ? for an empty name", () => {
    expect(clientInitials("   ")).toBe("?");
  });
});

describe("filterClients", () => {
  const clients = [
    client("a", { name: "Acme Studio", email: "hola@acme.test" }),
    client("b", {
      name: "Norte Digital",
      email: null,
      phone: "+54 9 11 2222-3333",
    }),
  ];

  it("matches the name", () => {
    expect(filterClients(clients, "acme").map((c) => c.id)).toEqual(["a"]);
  });

  it("matches the email", () => {
    expect(filterClients(clients, "acme.test").map((c) => c.id)).toEqual(["a"]);
  });

  it("matches the phone", () => {
    expect(filterClients(clients, "2222").map((c) => c.id)).toEqual(["b"]);
  });

  it("returns everything for an empty search", () => {
    expect(filterClients(clients, "   ")).toHaveLength(2);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterClients(clients, "zzz")).toEqual([]);
  });
});
