import { t } from "../../vendor/i18n/core";
import { useDebounceValue } from "../../vendor/hooks";

/**
 * Search input molecule. Renderiza `<input type="search">` con placeholder
 * i18n y emite `onChange(value)` con el valor debounced.
 *
 * El componente `.tsrx` no se puede testear en bun:test directamente
 * (requiere plugin Octane). La lógica de debounce vive en
 * `useDebounceValue` del wrapper `vendor/hooks/`.
 */

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  delayMs?: number;
}

export function SearchInput(props: SearchInputProps) @{
  const [debounced, setDebounced] = useDebounceValue(props.value, props.delayMs ?? 250);

  <input
    type="search"
    data-component="search-input"
    placeholder={t("tasks.search.placeholder")}
    value={debounced}
    onInput={(event) => props.onChange((event.target as HTMLInputElement).value)}
    onChange={() => setDebounced(props.value)}
  />
}
