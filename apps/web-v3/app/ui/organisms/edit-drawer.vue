<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { PhX } from "~/shared/vendor/icons";

/**
 * EditDrawer (PRD-v4 §9.1, §10.2): the right-side creation/edition panel.
 *
 * Anatomy: fixed white panel on the right with a 16px viewport margin,
 * semitransparent overlay that closes on click, header with title + X,
 * scrollable body, sticky footer with Cancelar + Guardar.
 *
 * Behavior:
 *  - Slide from the right on open AND on close (250ms var(--ease-drawer),
 *    PRD-v4 §11.5 #7). Vue's <Transition> keeps the subtree mounted during
 *    the leave, so the closing animation is the same motion reversed.
 *  - Overlay fades in/out with the same timing.
 *  - Closes on Esc and overlay click; traps Tab focus inside while open and
 *    restores focus to the opener on close.
 *  - Resizable via the left-edge handle; the width persists per session
 *    (sessionStorage), per PRD §9.1.
 *
 * The open state lives in the URL at the call site (?drawer / ?edit), not
 * here: this organism is presentational.
 */
const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    /** Disables the primary button while the save is in flight. */
    submitting?: boolean | undefined;
    /** Disables the primary button without the "saving" label. */
    saveDisabled?: boolean | undefined;
    /** Error shown above the footer (form inline errors, §11.5 matrix). */
    error?: string | null | undefined;
  }>(),
  {
    submitting: false,
    saveDisabled: false,
    error: null,
  },
);

const emit = defineEmits<{
  close: [];
  submit: [];
}>();

const { t } = useI18n();

const WIDTH_KEY = "drawer:width";
const MIN_WIDTH = 340;
const MAX_WIDTH = 720;
const DEFAULT_WIDTH = 420;

const panel = ref<HTMLElement | null>(null);
const width = ref(DEFAULT_WIDTH);

let opener: Element | null = null;

function readStoredWidth(): number {
  try {
    const raw = sessionStorage.getItem(WIDTH_KEY);
    const parsed = raw === null ? NaN : Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) {
      return Math.min(Math.max(parsed, MIN_WIDTH), MAX_WIDTH);
    }
  } catch {
    // sessionStorage unavailable: keep the default.
  }
  return DEFAULT_WIDTH;
}

/** Focusables inside the panel, in DOM order. */
function focusables(): HTMLElement[] {
  if (!panel.value) return [];
  return Array.from(
    panel.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => !el.hasAttribute("disabled"));
}

function close() {
  emit("close");
}

/** Tab cycles inside the drawer; Esc closes. */
function onKeydown(event: KeyboardEvent) {
  if (!props.open) return;
  if (event.key === "Escape") {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== "Tab") return;

  const items = focusables();
  if (items.length === 0) return;
  const first = items[0]!;
  const last = items[items.length - 1]!;
  const active = document.activeElement as HTMLElement | null;

  if (event.shiftKey && (active === first || !panel.value?.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      opener = document.activeElement;
      width.value = readStoredWidth();
      await nextTick();
      // Focus the first field (usually the name input) so the user types
      // right away; fall back to the panel itself. NOTE: `??` would also
      // run for a successful focus() (it returns undefined), so use an
      // explicit branch.
      const first = focusables()[0];
      if (first) first.focus();
      else panel.value?.focus();
      document.addEventListener("keydown", onKeydown);
    } else {
      document.removeEventListener("keydown", onKeydown);
      // Restore focus to whatever opened the drawer.
      if (opener instanceof HTMLElement) opener.focus();
      opener = null;
    }
  },
);

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
});

/** Left-edge drag to resize; width persists per session. */
const resizing = ref(false);

function startResize(event: PointerEvent) {
  event.preventDefault();
  resizing.value = true;
  const startX = event.clientX;
  const startWidth = width.value;

  function onMove(move: PointerEvent) {
    const next = Math.min(
      Math.max(startWidth + (startX - move.clientX), MIN_WIDTH),
      MAX_WIDTH,
    );
    width.value = next;
  }

  function onUp() {
    resizing.value = false;
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    try {
      sessionStorage.setItem(WIDTH_KEY, String(width.value));
    } catch {
      // sessionStorage unavailable: the width just won't persist.
    }
  }

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer-overlay">
      <div
        v-if="open"
        class="fixed inset-0 z-40 bg-black/40"
        data-testid="drawer-overlay"
        @click="close"
      />
    </Transition>

    <Transition name="drawer-panel">
      <aside
        v-if="open"
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
        class="fixed inset-y-4 right-4 z-50 flex flex-col overflow-hidden rounded-[var(--radius-lg)] bg-surface shadow-elevation focus:outline-none"
        :style="{ width: `${width}px` }"
        data-testid="drawer-panel"
      >
        <!-- Left-edge resize handle (PRD §9.1: resizable). -->
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="resize"
          class="absolute inset-y-0 left-0 w-1 cursor-col-resize touch-none transition-colors hover:bg-primary-300"
          :class="resizing ? 'bg-primary-400' : 'bg-transparent'"
          data-testid="drawer-resize"
          @pointerdown="startResize"
        />

        <header
          class="flex items-center justify-between border-b border-border px-6 py-4"
        >
          <h2 class="text-lg font-semibold tracking-tight text-text">
            {{ title }}
          </h2>
          <button
            type="button"
            class="rounded-full p-1.5 text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
            :aria-label="title"
            data-testid="drawer-close"
            @click="close"
          >
            <PhX :size="18" weight="regular" />
          </button>
        </header>

        <form
          class="flex min-h-0 flex-1 flex-col"
          @submit.prevent="emit('submit')"
        >
          <div class="flex-1 overflow-y-auto px-6 py-5">
            <slot />
          </div>

          <p
            v-if="error"
            class="border-t border-border px-6 py-2 text-sm text-error"
            data-testid="drawer-error"
          >
            {{ t(error) }}
          </p>

          <footer
            class="flex justify-end gap-3 border-t border-border px-6 py-4"
          >
            <slot name="footer" :submitting="submitting">
              <button
                type="button"
                class="rounded-[var(--radius)] border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-2"
                data-testid="drawer-cancel"
                @click="close"
              >
                {{ t("config.drawer.cancel") }}
              </button>
              <button
                type="submit"
                :disabled="submitting || saveDisabled"
                class="rounded-[var(--radius)] bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-60"
                data-testid="drawer-save"
              >
                {{
                  submitting ? t("config.drawer.saving") : t("config.drawer.save")
                }}
              </button>
            </slot>
          </footer>
        </form>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* PRD-v4 §11.5 #7: slide from the right + overlay fade, 250ms ease-drawer.
   Enter y leave usan la misma curva: el cierre es el mismo movimiento
   revertido, sin desaparecer de golpe. */
.drawer-overlay-enter-active,
.drawer-overlay-leave-active {
  transition: opacity var(--duration-drawer) ease;
}

.drawer-overlay-enter-from,
.drawer-overlay-leave-to {
  opacity: 0;
}

.drawer-panel-enter-active,
.drawer-panel-leave-active {
  transition: transform var(--duration-drawer) var(--ease-drawer);
}

.drawer-panel-enter-from,
.drawer-panel-leave-to {
  /* 100% of the panel + the 16px margin of the viewport (PRD §9.1) */
  transform: translateX(calc(100% + 1rem));
}
</style>
