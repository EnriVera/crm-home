/**
 * Helpers del form de tasks (puros, sin DOM).
 *
 * Round-trip entre el shape de wire (snake_case del contract) y el shape de
 * form (camelCase interno). También gestiona la dependencia cliente↔categoría:
 * si cambia el cliente o el tipo y la categoría previa ya no aplica, se resetea
 * a `null` para evitar inconsistencia.
 */

/** Wire shape del form (subset que el form maneja). */
export interface TaskFormInput {
  title: string;
  description: string | null;
  clientId: string | null;
  typeId: string;
  categoryId: string | null;
  stateId: string;
}

/** Wire shape de una task (dominio snake_case al borde del frontend). */
export interface TaskEntity {
  task_id: string;
  task_title: string;
  task_description: string | null;
  task_clie_id: string | null;
  task_type_id: string;
  task_cate_id: string | null;
  task_tast_id: string;
}

export function mapTaskEntityToFormInput(task: TaskEntity): TaskFormInput {
  return {
    title: task.task_title,
    description: task.task_description,
    clientId: task.task_clie_id,
    typeId: task.task_type_id,
    categoryId: task.task_cate_id,
    stateId: task.task_tast_id,
  };
}

export function mapFormInputToTaskEntity(
  input: TaskFormInput,
): Omit<TaskEntity, "task_id"> {
  return {
    task_title: input.title,
    task_description: input.description,
    task_clie_id: input.clientId,
    task_type_id: input.typeId,
    task_cate_id: input.categoryId,
    task_tast_id: input.stateId,
  };
}

/**
 * Si el par (cliente, tipo) cambió y la categoría previa pertenece a un par
 * distinto, retorna un form con `categoryId = null`. Caso contrario, retorna el
 * form sin modificar.
 *
 * El caller provee `availableCategoryIdsFor({clientId, typeId})` para validar
 * la pertenencia. Si la función no conoce la categoría, retorna null.
 */
export function resetCategoryIfIncompatible(
  form: TaskFormInput,
  newClientId: string | null,
  newTypeId: string,
  availableCategoryIdsFor: (params: {
    clientId: string | null;
    typeId: string;
  }) => string[],
): TaskFormInput {
  if (form.categoryId === null) return form;
  const allowed = availableCategoryIdsFor({
    clientId: newClientId,
    typeId: newTypeId,
  });
  if (allowed.includes(form.categoryId)) return form;
  return { ...form, categoryId: null };
}
