# Vendor wrapper: `@octanejs/lexical`

## 1. Encapsula

- `@octanejs/lexical@0.1.52` (binding octane)
- `lexical@0.46.0` (upstream, Meta's text editor framework)
- `@lexical/{plain-text,rich-text,table,text,utils,yjs}` (plugins upstream)

## 2. API pública

```ts
import { RichTextEditor, type RichTextEditorProps } from "@/components/vendor/lexical";
```

Props:
- `value: string` — estado del editor serializado como JSON string (Lexical state).
- `onChange: (value: string) => void` — callback al cambiar.
- `placeholder: string` — placeholder visible cuando el editor está vacío.
- `maxLength?: number` — opcional, longitud máxima en caracteres del texto plano.

El wrapper también re-exporta las primitivas del binding crudo
(`LexicalComposer`, `ContentEditable`, `RichTextPlugin`, etc.) por si algún
organismo necesita control fino.

## 3. Regla §9 (gate)

**Único módulo autorizado** a importar `@octanejs/lexical` en `apps/web/src/`.
El grep gate:

```sh
grep -RE "from ['\"]@octanejs/lexical['\"]" apps/web/src/
```

Debe devolver únicamente hits bajo `components/vendor/lexical/`.

## 4. Patrón SSR (§D8)

`LexicalComposer` requiere el DOM (window, document) y no se puede montar en
server. La estrategia SSR-safe:

1. **Server:** el componente renderiza un placeholder con el texto plano del
   `value` parseado (o un fallback vacío). Sin composer, sin plugins, sin DOM.
2. **Cliente:** tras hidratación, `useEffect` monta el `LexicalComposer` con
   los plugins (`RichTextPlugin`, `HistoryPlugin`, `OnChangePlugin`).

Esto evita hydration mismatch y mantiene el SSR funcional (placeholder visible
mientras el cliente hidrata).
