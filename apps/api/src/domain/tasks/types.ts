/**
 * Tipos de dominio compartidos por puertos (TaskRepository, etc.) y los futuros
 * adapters (kysely en WU5). Son la traducción "amigable" de `DatabaseSchema`:
 * nombres sin prefijos, `Date` en lugar de strings ISO.
 *
 * El adapter kysely (WU5) implementará la conversión `Database row → Domain row`
 * en el borde de infraestructura; dominio y aplicación nunca tocan `DatabaseSchema`.
 */

export interface TaskRow {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  clientId: string | null;
  typeId: string;
  categoryId: string | null;
  stateId: string;
  kanbanOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface TaskStateRow {
  id: string;
  userId: string;
  name: string;
  order: number;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface ClientRow {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  areaPhone: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface TypeRow {
  id: string;
  userId: string;
  name: string;
  module: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface CategoryRow {
  id: string;
  userId: string;
  name: string;
  typeId: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface AttachmentRow {
  id: string;
  userId: string;
  s3Id: string;
  title: string;
  format: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface TypeCategoriesClientRow {
  id: string;
  userId: string;
  typeId: string;
  categoryId: string;
  clientId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Patch parcial para actualizar una task. Todos los campos son opcionales. */
export interface TaskPatch {
  title?: string;
  description?: string | null;
  clientId?: string | null;
  typeId?: string;
  categoryId?: string | null;
  stateId?: string;
}

export interface TaskStatePatch {
  name?: string;
  order?: number;
}

/** Parámetros para mover una task entre columnas / posiciones kanban. */
export interface MoveTaskParams {
  taskId: string;
  targetStateId: string;
  prevTaskId?: string;
  nextTaskId?: string;
}
