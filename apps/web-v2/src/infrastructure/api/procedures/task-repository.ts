import type {
  TaskRepository,
  TaskStateRepository,
  TaskFormListersRepository,
} from "@/domain/task/ports";
import { err, ok } from "@/domain/shared/result";
import { mapOrpcError } from "../errors";
import { orpcClient } from "@/shared/vendor/orpc";

/**
 * OrpcTaskRepository — see auth-repository for the callPath pattern.
 * The backend router exposes the task procedures under `tasks.*`.
 */
const TASK_PROCEDURES = {
  list: ["tasks", "list"] as const,
  get: ["tasks", "get"] as const,
  create: ["tasks", "create"] as const,
  patch: ["tasks", "update"] as const,
  remove: ["tasks", "delete"] as const,
  moveToColumn: ["tasks", "move"] as const,
  listStates: ["tasks", "listStates"] as const,
} as const;

export const createOrpcTaskRepository = (): TaskRepository => {
  // SAFETY: NestedClient — same bridge-deferred typing as auth.
  const callPath = async (
    parts: readonly string[],
    input: unknown,
  ): Promise<unknown> => {
    const map = orpcClient as unknown as Record<string, unknown>;
    const fn = parts.reduce<unknown>(
      (acc, p) => (acc as Record<string, unknown>)[p],
      map,
    );
    if (typeof fn !== "function") {
      throw new Error(
        `orpc procedure ${parts.join(".")} not registered in client`,
      );
    }
    return (fn as (i: unknown) => Promise<unknown>)(input);
  };

  return {
    async list(query) {
      try {
        const res = await callPath(TASK_PROCEDURES.list, query);
        return ok(res as never);
      } catch (e) {
        return err(mapOrpcError(e));
      }
    },
    async get(id) {
      try {
        const res = await callPath(TASK_PROCEDURES.get, { id });
        return ok(res as never);
      } catch (e) {
        return err(mapOrpcError(e));
      }
    },
    async create(input) {
      try {
        const res = await callPath(TASK_PROCEDURES.create, input);
        return ok(res as never);
      } catch (e) {
        return err(mapOrpcError(e));
      }
    },
    async patch(id, input) {
      try {
        const res = await callPath(TASK_PROCEDURES.patch, { id, ...input });
        return ok(res as never);
      } catch (e) {
        return err(mapOrpcError(e));
      }
    },
    async remove(id) {
      try {
        await callPath(TASK_PROCEDURES.remove, { id });
        return ok(null);
      } catch (e) {
        return err(mapOrpcError(e));
      }
    },
    async moveToColumn(id, columnId, toIndex) {
      try {
        const res = await callPath(TASK_PROCEDURES.moveToColumn, {
          id,
          columnId,
          toIndex,
        });
        return ok(res as never);
      } catch (e) {
        return err(mapOrpcError(e));
      }
    },
  };
};

export const createOrpcTaskStateRepository = (): TaskStateRepository => ({
  async list() {
    try {
      const callPath = async (
        parts: readonly string[],
        input: unknown,
      ): Promise<unknown> => {
        // SAFETY: same NestedClient cast as above.
        const map = orpcClient as unknown as Record<string, unknown>;
        const fn = parts.reduce<unknown>(
          (acc, p) => (acc as Record<string, unknown>)[p],
          map,
        );
        if (typeof fn !== "function") {
          throw new Error(
            `orpc procedure ${parts.join(".")} not registered in client`,
          );
        }
        return (fn as (i: unknown) => Promise<unknown>)(input);
      };
      const res = await callPath(TASK_PROCEDURES.listStates, undefined);
      return ok(res as never);
    } catch (e) {
      return err(mapOrpcError(e));
    }
  },
});

/* ============================================================== */
/*  Form listers (EditTaskDrawer cascade)                          */
/* ============================================================== */

const TASK_FORM_LISTERS_PROCEDURES = {
  listTypesForForm: ["tasks", "types", "listForForm"] as const,
  listCategoriesByType: ["tasks", "categories", "listByType"] as const,
  searchClients: ["tasks", "clients", "search"] as const,
} as const;

export const createOrpcTaskFormListersRepository =
  (): TaskFormListersRepository => {
    // SAFETY: NestedClient — same bridge-deferred typing as above.
    const callPath = async (
      parts: readonly string[],
      input: unknown,
    ): Promise<unknown> => {
      const map = orpcClient as unknown as Record<string, unknown>;
      const fn = parts.reduce<unknown>(
        (acc, p) => (acc as Record<string, unknown>)[p],
        map,
      );
      if (typeof fn !== "function") {
        throw new Error(
          `orpc procedure ${parts.join(".")} not registered in client`,
        );
      }
      return (fn as (i: unknown) => Promise<unknown>)(input);
    };

    return {
      async listTypesForForm(input) {
        try {
          const res = await callPath(
            TASK_FORM_LISTERS_PROCEDURES.listTypesForForm,
            input,
          );
          return ok(res as never);
        } catch (e) {
          return err(mapOrpcError(e));
        }
      },
      async listCategoriesByType(input) {
        try {
          const res = await callPath(
            TASK_FORM_LISTERS_PROCEDURES.listCategoriesByType,
            input,
          );
          return ok(res as never);
        } catch (e) {
          return err(mapOrpcError(e));
        }
      },
      async searchClients(input) {
        try {
          const res = await callPath(
            TASK_FORM_LISTERS_PROCEDURES.searchClients,
            input,
          );
          return ok(res as never);
        } catch (e) {
          return err(mapOrpcError(e));
        }
      },
    };
  };
