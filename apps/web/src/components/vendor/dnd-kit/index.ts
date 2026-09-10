/**
 * Vendor wrapper para `@octanejs/dnd-kit`.
 *
 * Regla §9 (del design): este es el ÚNICO módulo autorizado a importar el
 * binding `@octanejs/dnd-kit`. El resto del código DEBE importar de acá
 * (`apps/web/src/components/vendor/dnd-kit`).
 *
 * Por qué wrapper: el binding expone `DragDropProvider` (no `DndContext`),
 * como se documentó en el spike WU0. Este wrapper re-nombra el componente
 * a `DndContext` para alinear con la convención del ecosistema React/dnd-kit
 * y mantener el contrato público del módulo de tasks.
 */

export {
  DragDropProvider as DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDragDropManager,
  useDragDropMonitor,
  useDragOperation,
  useInstance,
} from "@octanejs/dnd-kit";
