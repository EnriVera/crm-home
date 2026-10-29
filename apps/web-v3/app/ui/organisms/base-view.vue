<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from "vue";
import { PhList, PhMagnifyingGlass, PhSquaresFour } from "~/shared/vendor/icons";

/**
 * BaseView (PRD-v2 §9, PRD-v4 §10.1): grid/list views, view switcher and
 * search filter. Each instance persists its view + search in localStorage
 * under its own key (anti-collision) — the default id comes from `useId()`.
 *
 * The records themselves are the parent's job: this organism renders the
 * toolbar and delegates the items to the `grid` / `list` slots, so every
 * module keeps its own card design.
 */
const props = withDefaults(
  defineProps<{
    /** localStorage key suffix. Default: a unique id per instance. */
    id?: string | undefined;
    /** Which views the switcher offers. Single view → no switcher. */
    views?: ("grid" | "list")[] | undefined;
    searchPlaceholder: string;
    /** Live search term (persisted per instance). */
    search?: string | undefined;
    /** Loading state: shows a skeleton grid instead of the slots. */
    loading?: boolean | undefined;
    /**
     * Controlled view: when set, the parent owns the active view (and the
     * internal switcher + persistence stay off). Used by screens whose
     * switcher has more options than grid/list (e.g. /tasks adds kanban).
     */
    view?: "grid" | "list" | undefined;
    /** Hides the search input when the page renders its own. */
    searchable?: boolean | undefined;
    /** Hides the whole toolbar (the page renders its own). */
    toolbar?: boolean | undefined;
  }>(),
  {
    id: undefined,
    views: () => ["grid", "list"],
    search: "",
    loading: false,
    view: undefined,
    searchable: true,
    toolbar: true,
  },
);

const emit = defineEmits<{
  "update:search": [value: string];
  "update:view": [value: "grid" | "list"];
}>();

const instanceId = props.id ?? useId();
const storageKey = `baseview:${instanceId}`;

type ViewMode = "grid" | "list";

/** The persisted view, validated against what this instance offers. */
const internalView = ref<ViewMode>("grid");

const isControlled = computed(() => props.view !== undefined);
const activeView = computed<ViewMode>(() => props.view ?? internalView.value);

const searchModel = ref(props.search);

watch(searchModel, (value) => {
  emit("update:search", value);
  persist({ view: activeView.value, search: value });
});

function persist(state: { view: ViewMode; search: string }) {
  if (isControlled.value) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode); the view still works.
  }
}

onMounted(() => {
  if (isControlled.value) return;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    const saved = JSON.parse(raw) as { view?: string; search?: string };
    if (
      typeof saved.view === "string" &&
      (props.views as string[]).includes(saved.view)
    ) {
      internalView.value = saved.view as ViewMode;
    }
    if (typeof saved.search === "string") {
      searchModel.value = saved.search;
      emit("update:search", saved.search);
    }
  } catch {
    // Corrupted entry: start fresh.
  }
});

function selectView(next: ViewMode) {
  if (isControlled.value) {
    emit("update:view", next);
    return;
  }
  internalView.value = next;
  persist({ view: next, search: searchModel.value });
}

const { t } = useI18n();

const VIEW_META: { id: ViewMode; labelKey: string; icon: typeof PhList }[] = [
  { id: "grid", labelKey: "baseview.grid", icon: PhSquaresFour },
  { id: "list", labelKey: "baseview.list", icon: PhList },
];
</script>

<template>
  <div>
    <!-- Toolbar: pill search (PRD-DESIGN §7.5) + segmented view switcher. -->
    <div v-if="toolbar" class="flex flex-wrap items-center justify-between gap-3">
      <label v-if="searchable" class="relative block w-full max-w-sm">
        <span class="sr-only">{{ searchPlaceholder }}</span>
        <PhMagnifyingGlass
          :size="16"
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-2"
        />
        <input
          v-model="searchModel"
          type="search"
          :placeholder="searchPlaceholder"
          class="h-10 w-full rounded-full border border-border bg-surface pl-9 pr-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
        />
      </label>
      <slot v-else name="toolbar-start" />

      <div
        v-if="views.length > 1 && !isControlled"
        class="flex gap-1 rounded-full bg-surface-2 p-1"
        role="group"
        :aria-label="t('baseview.switcher')"
      >
        <button
          v-for="meta in VIEW_META.filter((entry) =>
            (views as string[]).includes(entry.id),
          )"
          :key="meta.id"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors"
          :class="
            activeView === meta.id
              ? 'bg-surface font-medium text-accent shadow-sm'
              : 'text-text-2 hover:text-text'
          "
          :aria-pressed="activeView === meta.id"
          :data-testid="`baseview-${meta.id}`"
          @click="selectView(meta.id)"
        >
          <component :is="meta.icon" :size="16" weight="regular" />
          <span class="hidden sm:inline">{{ t(meta.labelKey) }}</span>
        </button>
      </div>
      <slot v-if="isControlled" name="toolbar-end" />
    </div>

    <!-- Loading: skeleton in the shape of the grid (PRD-v4 §11.5 #9). -->
    <div
      v-if="loading"
      class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      data-testid="baseview-loading"
      aria-hidden="true"
    >
      <div
        v-for="n in 4"
        :key="n"
        class="h-24 animate-pulse rounded-[var(--radius)] bg-surface-2"
      />
    </div>

    <div v-else class="mt-5">
      <div v-if="activeView === 'grid'" data-testid="baseview-grid-view">
        <slot name="grid" />
      </div>
      <div v-else data-testid="baseview-list-view">
        <slot name="list" />
      </div>
      <slot name="empty" />
    </div>
  </div>
</template>
