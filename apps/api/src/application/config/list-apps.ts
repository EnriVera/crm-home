import type { AppRepository } from "../../domain/ports/app-repository";

export interface ListAppsDependencies {
  appRepository: AppRepository;
}

/**
 * Caso de uso: listar todos los módulos de la aplicación.
 *
 * Sin paginación (el seed actual es chico). La sesión NO se valida
 * acá: el handler exige sesión vía el middleware `requireSession` del
 * router antes de llegar al use case (las tablas son globales, pero
 * /config es página autenticada — el usuario debe estar logueado
 * para verla, aunque el dato en sí no sea per-user).
 */
export class ListApps {
  constructor(private readonly deps: ListAppsDependencies) {}

  async execute(): Promise<Array<{ id: string; name: string }>> {
    return this.deps.appRepository.list();
  }
}
