# Vendor wrapper: `@octanejs/dnd-kit`

## 1. Encapsula

- `@octanejs/dnd-kit@0.1.47` (binding octane)
- `@dnd-kit/core@0.5.x` (upstream)
- `@dnd-kit/abstract`, `@dnd-kit/collision`, `@dnd-kit/dom`, `@dnd-kit/state`

## 2. API pública

```ts
import { DndContext, useDraggable, useDroppable, DragOverlay } from "@/components/vendor/dnd-kit";
```

- `<DndContext>` — provider del contexto drag/drop. Mapea internamente a `DragDropProvider` del binding.
- `useDraggable({ id, data? })` — hook para hacer un nodo arrastrable.
- `useDroppable({ id, data? })` — hook para declarar una zona drop.
- `<DragOverlay>` — overlay que sigue el cursor durante el drag.

## 3. Regla §9 (gate)

**Único módulo autorizado** a importar `@octanejs/dnd-kit` en `apps/web/src/`.
Cualquier import del binding desde `components/{atoms,molecules,organisms,pages}/`
es una violación. El grep gate:

```sh
grep -RE "from ['\"]@octanejs/dnd-kit['\"]" apps/web/src/
```

Debe devolver únicamente hits bajo `components/vendor/dnd-kit/`.

## 4. Patrón SSR (§D8)

`DndContext` (que internamente monta `DragDropProvider`) usa APIs del DOM que no
existen en Node. La estrategia SSR-safe es **doble**:

1. En el server, `DndContext` renderiza sólo los `children` (sin provider).
2. En el cliente (tras hidratación), `useEffect` monta el provider real.

Esto evita `window is not defined` durante el SSR y mantiene la UI usable en
ambos lados.
