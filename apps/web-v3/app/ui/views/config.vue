<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { ThemePreference, TypeModule } from "~/domain/config/entities";
import { useConfig } from "~/shared/composables/use-config";
import { useRouteSearch } from "~/shared/composables/use-route-search";
import type { SearchParams } from "~/router/search-schemas";
import { useAuthStore } from "~/stores/auth";
import { useThemeStore } from "~/stores/theme";
import {
  PhCheck,
  PhGear,
  PhInfo,
  PhMagnifyingGlass,
  PhMoon,
  PhPlus,
  PhSun,
  PhTrash,
} from "~/shared/vendor/icons";

const { t } = useI18n();
const auth = useAuthStore();
const theme = useThemeStore();
const { params, set } = useRouteSearch("config");
const {
  types,
  states,
  apps,
  currencies,
  search,
  visibleTypes,
  orderedStates,
  isLoading,
  error,
  load,
  addType,
  editType,
  deleteType,
  addState,
  editState,
  deleteState,
  setTheme,
  logout,
} = useConfig();

interface Tab {
  id: NonNullable<SearchParams<"config">["tab"]>;
  label: string;
  subtitle: string;
}

const tabs: Tab[] = [
  { id: "perfil", label: t("config.tabs.perfil"), subtitle: t("config.tabs.perfilSubtitle") },
  { id: "estados", label: t("config.tabs.estados"), subtitle: t("config.tabs.estadosSubtitle") },
  { id: "tipos", label: t("config.tabs.tipos"), subtitle: t("config.tabs.tiposSubtitle") },
  { id: "apps", label: t("config.tabs.apps"), subtitle: t("config.tabs.appsSubtitle") },
  { id: "monedas", label: t("config.tabs.monedas"), subtitle: t("config.tabs.monedasSubtitle") },
];

const activeTab = computed(() => params.value.tab ?? "perfil");

const activeTabMeta = computed(
  () => tabs.find((tab) => tab.id === activeTab.value) ?? tabs[0]!,
);

/** The form state of the "new type" / "new state" inline card. */
const newTypeName = ref("");
const newTypeModules = ref<TypeModule[]>(["tasks"]);
const newStateName = ref("");
const saving = ref(false);

const TYPE_MODULE_OPTIONS: { id: TypeModule; label: string }[] = [
  { id: "tasks", label: t("config.modules.tasks") },
  { id: "incomes", label: t("config.modules.incomes") },
  { id: "expenses", label: t("config.modules.expenses") },
  { id: "schedules", label: t("config.modules.schedules") },
];

const themeOptions: { id: ThemePreference; label: string; icon: string }[] = [
  { id: "light", label: t("config.theme.light"), icon: "sun" },
  { id: "dark", label: t("config.theme.dark"), icon: "moon" },
  { id: "system", label: t("config.theme.system"), icon: "monitor" },
];

const initials = computed(() => {
  const name = auth.session?.name?.trim() ?? "";
  const letters = name ? name.split(/\s+/).slice(0, 2) : [];
  return letters.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
});

onMounted(() => {
  void load(activeTab.value);
});

watch(activeTab, (tab) => {
  void load(tab);
});

function selectTab(id: Tab["id"]) {
  void set({ tab: id });
}

async function submitNewType() {
  const name = newTypeName.value.trim();
  if (!name) return;
  saving.value = true;
  try {
    await addType({ name, modules: newTypeModules.value });
    newTypeName.value = "";
    newTypeModules.value = ["tasks"];
  } finally {
    saving.value = false;
  }
}

async function submitNewState() {
  const name = newStateName.value.trim();
  if (!name) return;
  saving.value = true;
  try {
    await addState({ name });
    newStateName.value = "";
  } finally {
    saving.value = false;
  }
}

async function renameType(id: string, current: string) {
  const name = window.prompt(t("config.types.renamePrompt"), current);
  if (name === null) return;
  const trimmed = name.trim();
  if (!trimmed || trimmed === current) return;
  await editType({ id, name: trimmed });
}

async function renameState(id: string, current: string) {
  const name = window.prompt(t("config.states.renamePrompt"), current);
  if (name === null) return;
  const trimmed = name.trim();
  if (!trimmed || trimmed === current) return;
  await editState({ id, name: trimmed });
}

function toggleModule(module: TypeModule) {
  newTypeModules.value = newTypeModules.value.includes(module)
    ? newTypeModules.value.filter((entry) => entry !== module)
    : [...newTypeModules.value, module];
}
</script>

<template>
  <section class="mx-auto w-full max-w-5xl">
    <header>
      <h1 class="text-2xl font-semibold tracking-tight text-text">
        {{ t("config.title") }}
      </h1>
      <p class="mt-1 text-sm text-text-2">{{ activeTabMeta.subtitle }}</p>
    </header>

    <!-- Tab bar: the tabs live in the URL (PRD-v4 §12.5). -->
    <nav
      class="mt-5 flex flex-wrap gap-1 rounded-lg bg-surface-2 p-1"
      :aria-label="t('config.tabs.ariaLabel')"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="rounded-md px-4 py-2 text-sm transition-colors"
        :class="
          activeTab === tab.id
            ? 'bg-surface font-medium text-accent shadow-sm'
            : 'text-text-2 hover:text-text'
        "
        :aria-current="activeTab === tab.id ? 'page' : undefined"
        :data-testid="`config-tab-${tab.id}`"
        @click="selectTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <p v-if="error" class="mt-4 text-sm text-error" data-testid="config-error">
      {{ t(error) }}
    </p>

    <!-- ── Perfil ─────────────────────────────────────────────── -->
    <div v-if="activeTab === 'perfil'" class="mt-6 space-y-6" data-testid="config-perfil">
      <article class="rounded-lg border border-border bg-surface p-6">
        <h2 class="text-base font-semibold text-text">
          {{ t("config.profile.title") }}
        </h2>
        <p class="mt-1 text-sm text-text-2">
          {{ t("config.profile.subtitle") }}
        </p>

        <div class="mt-5 flex items-center gap-4">
          <span
            class="grid size-12 shrink-0 place-items-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700"
            aria-hidden="true"
          >
            {{ initials }}
          </span>
        </div>

        <dl class="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <dt class="text-xs font-medium text-text-2">
              {{ t("config.profile.name") }}
            </dt>
            <dd class="mt-1 text-sm text-text">{{ auth.session?.name ?? "—" }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-text-2">
              {{ t("config.profile.email") }}
            </dt>
            <dd class="mt-1 text-sm text-text">{{ auth.session?.email ?? "—" }}</dd>
          </div>
        </dl>
      </article>

      <article class="rounded-lg border border-border bg-surface p-6">
        <h2 class="text-base font-semibold text-text">
          {{ t("config.appearance.title") }}
        </h2>
        <p class="mt-1 text-sm text-text-2">
          {{ t("config.appearance.subtitle") }}
        </p>

        <div class="mt-4 grid gap-3 sm:grid-cols-3">
          <button
            v-for="option in themeOptions"
            :key="option.id"
            type="button"
            class="flex items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors"
            :class="
              theme.theme === option.id
                ? 'border-accent text-text'
                : 'border-border text-text-2 hover:bg-surface-2'
            "
            :data-testid="`config-theme-${option.id}`"
            @click="setTheme(option.id)"
          >
            <component
              :is="option.icon === 'sun' ? PhSun : PhMoon"
              :size="18"
              weight="regular"
            />
            <span>{{ option.label }}</span>
            <PhCheck
              v-if="theme.theme === option.id"
              :size="16"
              weight="bold"
              class="ml-auto text-accent"
            />
          </button>
        </div>
      </article>

      <article class="rounded-lg border border-border bg-surface p-6">
        <h2 class="text-base font-semibold text-text">
          {{ t("config.session.title") }}
        </h2>
        <p class="mt-1 text-sm text-text-2">
          {{ t("config.session.subtitle") }}
        </p>
        <div class="mt-4 flex justify-end">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-2"
            data-testid="config-logout"
            @click="logout"
          >
            <PhSignOut :size="16" weight="regular" />
            {{ t("config.session.logout") }}
          </button>
        </div>
      </article>
    </div>

    <!-- ── Tipos ──────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'tipos'" class="mt-6" data-testid="config-tipos">
      <label class="relative block max-w-sm">
        <span class="sr-only">{{ t("config.types.search") }}</span>
        <PhMagnifyingGlass
          :size="16"
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-2"
        />
        <input
          v-model="search"
          type="search"
          :placeholder="t('config.types.search')"
          class="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
        />
      </label>

      <div
        class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="config-types-grid"
      >
        <article
          v-for="type in visibleTypes"
          :key="type.id"
          class="rounded-lg border border-border bg-surface p-5"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-text">{{ type.name }}</p>
              <p class="mt-1 text-xs text-text-2">
                {{ type.modules.join(" · ") }}
              </p>
            </div>
            <button
              type="button"
              class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
              :aria-label="t('config.types.rename')"
              @click="renameType(type.id, type.name)"
            >
              <PhDotsThree :size="16" weight="bold" />
            </button>
          </div>
          <button
            type="button"
            class="mt-3 inline-flex items-center gap-1 text-xs text-text-2 transition-colors hover:text-error"
            :aria-label="t('config.types.delete')"
            @click="deleteType(type.id)"
          >
            <PhTrash :size="14" weight="regular" />
            {{ t("config.types.delete") }}
          </button>
        </article>

        <form
          class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-5 text-center"
          @submit.prevent="submitNewType"
        >
          <PhPlus :size="20" weight="regular" class="text-text-2" />
          <p class="text-sm text-text-2">{{ t("config.types.add") }}</p>
          <input
            v-model="newTypeName"
            type="text"
            :placeholder="t('config.types.namePlaceholder')"
            class="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-text outline-none focus:border-accent"
          />
          <div class="flex flex-wrap justify-center gap-2">
            <button
              v-for="option in TYPE_MODULE_OPTIONS"
              :key="option.id"
              type="button"
              class="rounded-full border px-2 py-0.5 text-xs transition-colors"
              :class="
                newTypeModules.includes(option.id)
                  ? 'border-accent bg-primary-50 text-primary-700'
                  : 'border-border text-text-2'
              "
              @click="toggleModule(option.id)"
            >
              {{ option.label }}
            </button>
          </div>
          <button
            type="submit"
            :disabled="saving"
            class="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {{ t("config.types.save") }}
          </button>
        </form>
      </div>

      <p
        class="mt-6 flex items-start gap-2 rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-700"
      >
        <PhInfo :size="16" weight="bold" class="mt-0.5 shrink-0" />
        <span>{{ t("config.types.info") }}</span>
      </p>
    </div>

    <!-- ── Estados de tarea ───────────────────────────────────── -->
    <div
      v-else-if="activeTab === 'estados'"
      class="mt-6"
      data-testid="config-estados"
    >
      <div
        class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="config-states-grid"
      >
        <article
          v-for="state in orderedStates"
          :key="state.id"
          class="rounded-lg border border-border bg-surface p-5"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="truncate text-sm font-medium text-text">{{ state.name }}</p>
            <button
              type="button"
              class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
              :aria-label="t('config.states.rename')"
              @click="renameState(state.id, state.name)"
            >
              <PhDotsThree :size="16" weight="bold" />
            </button>
          </div>
          <button
            type="button"
            class="mt-3 inline-flex items-center gap-1 text-xs text-text-2 transition-colors hover:text-error"
            :aria-label="t('config.states.delete')"
            @click="deleteState(state.id)"
          >
            <PhTrash :size="14" weight="regular" />
            {{ t("config.states.delete") }}
          </button>
        </article>

        <form
          class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-5 text-center"
          @submit.prevent="submitNewState"
        >
          <PhPlus :size="20" weight="regular" class="text-text-2" />
          <p class="text-sm text-text-2">{{ t("config.states.add") }}</p>
          <input
            v-model="newStateName"
            type="text"
            :placeholder="t('config.states.namePlaceholder')"
            class="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-text outline-none focus:border-accent"
          />
          <button
            type="submit"
            :disabled="saving"
            class="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {{ t("config.states.save") }}
          </button>
        </form>
      </div>

      <p
        class="mt-6 flex items-start gap-2 rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-700"
      >
        <PhInfo :size="16" weight="bold" class="mt-0.5 shrink-0" />
        <span>{{ t("config.states.info") }}</span>
      </p>
    </div>

    <!-- ── Apps ───────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'apps'" class="mt-6" data-testid="config-apps">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="app in apps"
          :key="app.id"
          class="rounded-lg border border-border bg-surface p-5"
        >
          <span
            class="grid size-9 place-items-center rounded-full bg-primary-50 text-primary-700"
            aria-hidden="true"
          >
            <PhGear :size="16" weight="regular" />
          </span>
          <p class="mt-3 text-sm font-medium text-text">{{ app.name }}</p>
        </article>
      </div>
      <p
        class="mt-6 flex items-start gap-2 rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-700"
      >
        <PhInfo :size="16" weight="bold" class="mt-0.5 shrink-0" />
        <span>{{ t("config.apps.info") }}</span>
      </p>
    </div>

    <!-- ── Monedas ─────────────────────────────────────────────── -->
    <div
      v-else-if="activeTab === 'monedas'"
      class="mt-6"
      data-testid="config-monedas"
    >
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="currency in currencies"
          :key="currency.id"
          class="rounded-lg border border-border bg-surface p-5"
        >
          <span
            class="grid size-9 place-items-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700"
            aria-hidden="true"
          >
            {{ currency.symbol }}
          </span>
          <p class="mt-3 text-sm font-medium text-text">{{ currency.name }}</p>
          <p class="mt-1 text-xs text-text-2">
            {{ currency.decimals }} {{ t("config.monedas.decimals") }}
          </p>
        </article>
      </div>
      <p
        class="mt-6 flex items-start gap-2 rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-700"
      >
        <PhInfo :size="16" weight="bold" class="mt-0.5 shrink-0" />
        <span>{{ t("config.monedas.info") }}</span>
      </p>
    </div>

    <p v-if="isLoading" class="mt-4 text-sm text-text-2">
      {{ t("common.loading") }}
    </p>
  </section>
</template>
