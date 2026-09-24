import type { TaskStateRepository } from "../../domain/ports/task-state-repository";
import type { TransactionManager } from "../../domain/ports/transaction-manager";
import { Unauthorized, TaskStateNotFound } from "./errors";

export interface ReorderTaskStatesInput {
  userId: string;
  stateOrders: Array<{ id: string; order: number }>;
}

export interface ReorderTaskStatesDependencies {
  taskStateRepository: TaskStateRepository;
  transactionManager: TransactionManager;
}

/**
 * Caso de uso: reordenar las columnas del kanban atómicamente.
 *
 * Validaciones:
 * - Todos los `id` provistos deben existir y pertenecer al usuario.
 * - El set de `id` debe cubrir EXACTAMENTE las columnas activas del usuario
 *   (no se permiten reordenes parciales — evita estados "huérfanos").
 *
 * La actualización corre dentro de `transactionManager.run(...)` para que
 * cualquier falla intermediaria haga rollback completo.
 */
export class ReorderTaskStates {
  constructor(private readonly deps: ReorderTaskStatesDependencies) {}

  async execute(input: ReorderTaskStatesInput): Promise<void> {
    const all = await this.deps.taskStateRepository.findByUser(input.userId);
    const allIds = new Set(all.map((s) => s.id));
    const inputIds = new Set(input.stateOrders.map((s) => s.id));

    if (
      allIds.size !== inputIds.size ||
      ![...allIds].every((id) => inputIds.has(id))
    ) {
      throw new Unauthorized(
        "Reorder must cover all active states of the user (no partial reorder)",
      );
    }

    for (const s of all) {
      if (!inputIds.has(s.id)) {
        throw new TaskStateNotFound();
      }
    }

    return this.deps.transactionManager.run(async (trx) => {
      // Reorder en 2 pasadas para evitar violar la UNIQUE constraint
      // (tast_user_id, tast_order) durante el swap:
      //   Pass 1: llevamos todos los órdenes a valores NEGATIVOS únicos
      //          (-1000 - index). Ningún estado tiene orden negativo, así
      //          que la UNIQUE no se viola.
      //   Pass 2: asignamos los órdenes finales positivos. Como todavía
      //          ninguno está en el rango [0..n], los UPDATEs no chocan
      //          con la UNIQUE.
      // Más simple y portable que `SET CONSTRAINTS ALL DEFERRED` (que
      // depende de la implementación de constraints deferrables del driver).
      for (let i = 0; i < input.stateOrders.length; i++) {
        const { id } = input.stateOrders[i]!;
        await this.deps.taskStateRepository.persistOrder(id, -1000 - i, trx);
      }
      for (const { id, order } of input.stateOrders) {
        await this.deps.taskStateRepository.persistOrder(id, order, trx);
      }
    });
  }
}
