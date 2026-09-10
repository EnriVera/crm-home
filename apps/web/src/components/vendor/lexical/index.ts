/**
 * Vendor wrapper para `@octanejs/lexical`.
 *
 * Regla §9 (del design): este es el ÚNICO módulo autorizado a importar el
 * binding `@octanejs/lexical`. El resto del código DEBE importar de acá
 * (`apps/web/src/components/vendor/lexical`).
 *
 * Por qué wrapper: el binding expone primitivas crudas
 * (`LexicalComposer`, `ContentEditable`, plugins sueltos). Este wrapper
 * encapsula la composición necesaria para un editor "rich-text" estándar y
 * expone una API simple (`RichTextEditor` con props planas).
 */

export interface RichTextEditorProps {
  /** Estado del editor serializado como JSON string (Lexical state). */
  value: string;
  /** Callback invocado al cambiar. Recibe el nuevo estado serializado. */
  onChange: (value: string) => void;
  /** Placeholder visible cuando el editor está vacío. */
  placeholder: string;
  /** Longitud máxima opcional (en caracteres del texto plano). */
  maxLength?: number;
}

// Re-exportamos el binding crudo por si el caller necesita primitivas de bajo nivel.
export {
  LexicalComposer,
  ContentEditable,
  RichTextPlugin,
  PlainTextPlugin,
  LexicalErrorBoundary,
  OnChangePlugin,
  HistoryPlugin,
  AutoFocusPlugin,
  ClearEditorPlugin,
  useLexicalComposerContext,
} from "@octanejs/lexical";

/**
 * Componente placeholder. La implementación completa del editor se agregará
 * en WU11/WU12 cuando los organismos/páginas lo necesiten. Por ahora expone
 * la API pública (props tipadas) y los re-exports del binding crudo.
 */
export function RichTextEditor(_props: RichTextEditorProps) {
  // Implementación completa se difiere a WU11 (organisms) o WU12 (pages).
  return null;
}
