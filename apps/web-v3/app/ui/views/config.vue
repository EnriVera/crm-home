<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { Component } from "vue";
import type { ThemePreference, TypeModule } from "~/domain/config/entities";
import { categoryTypeName } from "~/domain/config/entities";
import { useConfig } from "~/shared/composables/use-config";
import { useRouteSearch } from "~/shared/composables/use-route-search";
import type { SearchParams } from "~/router/search-schemas";
import { useAuthStore } from "~/stores/auth";
import { useThemeStore } from "~/stores/theme";
import BaseView from "~/ui/organisms/base-view.vue";
import ConfigCategoryDrawer from "~/ui/organisms/config-drawers/config-category-drawer.vue";
import ConfigCurrencyDrawer from "~/ui/organisms/config-drawers/config-currency-drawer.vue";
import ConfigStateDrawer from "~/ui/organisms/config-drawers/config-state-drawer.vue";
import ConfigTypeDrawer from "~/ui/organisms/config-drawers/config-type-drawer.vue";
import ConfigCard from "~/ui/molecules/config-card.vue";
import {
  PhCheck,
  PhGear,
  PhInfo,
  PhMonitor,
  PhMoon,
  PhPencilSimple,
  PhPlus,
  PhSignOut,
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
  categories,
  apps,
  currencies,
  search,
  visibleTypes,
  visibleCategories,
  visibleStates,
  visibleCurrencies,
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
  moveState,
  addCategory,
  editCategory,
  deleteCategory,
  addCurrency,
  setTheme,
  logout,
} = useConfig();

interface Tab {
  id: NonNullable<SearchParams<"config">["tab"]>;
  label: string;
  subtitle: string;
}

// A computed and not a fixed array: the labels are translated and have to
// follow the locale when it changes.
const tabs = computed<Tab[]>(() => [
  { id: "perfil", label: t("config.tabs.perfil"), subtitle: t("config.tabs.perfilSubtitle") },
  { id: "estados", label: t("config.tabs.estados"), subtitle: t("config.tabs.estadosSubtitle") },
  { id: "tipos", label: t("config.tabs.tipos"), subtitle: t("config.tabs.tiposSubtitle") },
  { id: "categorias", label: t("config.tabs.categorias"), subtitle: t("config.tabs.categoriasSubtitle") },
  { id: "apps", label: t("config.tabs.apps"), subtitle: t("config.tabs.appsSubtitle") },
  { id: "monedas", label: t("config.tabs.monedas"), subtitle: t("config.tabs.monedasSubtitle") },
]);

const activeTab = computed(() => params.value.tab ?? "perfil");

const activeTabMeta = computed(
  () => tabs.value.find((tab) => tab.id === activeTab.value) ?? tabs.value[0]!,
);

/** The tabs that list records through BaseView. */
const LIST_TABS = ["estados", "tipos", "categorias", "monedas"] as const;

const drawerOpen = computed(
  () =>
    (LIST_TABS as readonly string[]).includes(activeTab.value) &&
    (params.value.drawer === "new" || params.value.edit !== undefined),
);

const editingType = computed(
  () => types.value.find((type) => type.id === params.value.edit) ?? null,
);
const editingState = computed(
  () => states.value.find((state) => state.id === params.value.edit) ?? null,
);
const editingCategory = computed(
  () =>
    categories.value.find((category) => category.id === params.value.edit) ??
    null,
);

const saving = ref(false);
const drawerError = ref<string | null>(null);

function openCreate(tab: (typeof LIST_TABS)[number]) {
  drawerError.value = null;
  void set({ tab, drawer: "new", edit: "" });
}

function openEdit(tab: (typeof LIST_TABS)[number], id: string) {
  drawerError.value = null;
  void set({ tab, edit: id, drawer: "" });
}

function closeDrawer() {
  return set({ drawer: "", edit: "" });
}

async function submitType(values: { name: string; modules: TypeModule[] }) {
  drawerError.value = null;
  saving.value = true;
  try {
    if (editingType.value) {
      await editType({ id: editingType.value.id, ...values });
    } else {
      await addType(values);
    }
    await closeDrawer();
  } catch {
    drawerError.value = "config.drawer.saveError";
  } finally {
    saving.value = false;
  }
}

async function submitState(values: { name: string; position: number }) {
  drawerError.value = null;
  saving.value = true;
  try {
    if (editingState.value) {
      const state = editingState.value;
      await editState({ id: state.id, name: values.name });
      // The update endpoint only takes the name: the position of a column
      // is an order, and the order moves with the reorder endpoint.
      const current = orderedStates.value.findIndex((item) => item.id === state.id);
      if (current !== -1 && current !== values.position) {
        await moveState(state.id, values.position);
      }
    } else {
      await addState({ name: values.name, position: values.position });
    }
    await closeDrawer();
  } catch {
    drawerError.value = "config.drawer.saveError";
  } finally {
    saving.value = false;
  }
}

async function submitCategory(values: { name: string; typeId: string }) {
  drawerError.value = null;
  saving.value = true;
  try {
    if (editingCategory.value) {
      await editCategory({ id: editingCategory.value.id, ...values });
    } else {
      await addCategory(values);
    }
    await closeDrawer();
  } catch {
    drawerError.value = "config.drawer.saveError";
  } finally {
    saving.value = false;
  }
}

async function submitCurrency(values: {
  name: string;
  symbol: string;
  decimals: number;
}) {
  drawerError.value = null;
  saving.value = true;
  try {
    await addCurrency(values);
    await closeDrawer();
  } catch {
    drawerError.value = "config.drawer.saveError";
  } finally {
    saving.value = false;
  }
}

const themeOptions = computed<{ id: ThemePreference; label: string; icon: Component }[]>(
  () => [
    { id: "light", label: t("config.theme.light"), icon: PhSun },
    { id: "dark", label: t("config.theme.dark"), icon: PhMoon },
    { id: "system", label: t("config.theme.system"), icon: PhMonitor },
  ],
);

const initials = computed(() => {
  const name = auth.session?.name?.trim() ?? "";
  const letters = name ? name.split(/\s+/).slice(0, 2) : [];
  return letters.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
});

/** Module ids of a type, translated, for the card subtitle. */
function modulesLabel(modules: readonly string[]): string {
  if (modules.length === 0) return t("config.drawer.modulesEmpty");
  return modules.map((module) => t(`config.modules.${module}`)).join(" · ");
}

onMounted(() => {
  void load(activeTab.value);
});

watch(activeTab, (tab) => {
  void load(tab);
});

function selectTab(id: Tab["id"]) {
  void set({ tab: id });
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

    <!-- Tab bar: full-width pill segmented, active in green tint (PRD §8.8). -->
    <nav
      class="mt-5 flex gap-1 overflow-x-auto rounded-full bg-surface-2 p-1 sm:flex-wrap"
      :aria-label="t('config.tabs.ariaLabel')"
      role="tablist"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        class="flex-none whitespace-nowrap rounded-full px-3 py-2 text-sm transition-colors sm:flex-1"
        :class="
          activeTab === tab.id
            ? 'bg-primary-50 font-medium text-primary-700'
            : 'text-text-2 hover:text-text'
        "
        :id="`config-tab-${tab.id}`"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`config-panel-${tab.id}`"
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
    <div v-if="activeTab === 'perfil'" role="tabpanel"
      :id="`config-panel-perfil`"
      :aria-labelledby="`config-tab-perfil`"
      class="mt-6 space-y-6" data-testid="config-perfil">
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
          <div v-if="auth.session?.name">
            <dt class="text-xs font-medium text-text-2">
              {{ t("config.profile.name") }}
            </dt>
            <dd class="mt-1 text-sm text-text">{{ auth.session.name }}</dd>
          </div>
          <div v-if="auth.session?.email">
            <dt class="text-xs font-medium text-text-2">
              {{ t("config.profile.email") }}
            </dt>
            <dd class="mt-1 text-sm text-text">{{ auth.session.email }}</dd>
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
            <component :is="option.icon" :size="18" weight="regular" />
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
    <div v-else-if="activeTab === 'tipos'" role="tabpanel"
      :id="`config-panel-tipos`"
      :aria-labelledby="`config-tab-tipos`"
      class="mt-6" data-testid="config-tipos">
      <BaseView
        id="config-tipos"
        v-model:search="search"
        :loading="isLoading"
        :search-placeholder="t('config.types.search')"
      >
        <template #grid>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ConfigCard
              v-for="type in visibleTypes"
              :key="type.id"
              :name="type.name"
              :subtitle="modulesLabel(type.modules)"
              :edit-label="t('config.drawer.editType')"
              :delete-label="t('config.types.delete')"
              @edit="openEdit('tipos', type.id)"
              @remove="deleteType(type.id)"
            />
            <button
              type="button"
              class="flex min-h-24 flex-col items-center justify-center gap-1 rounded-[var(--radius)] border border-dashed border-border p-5 text-text-2 transition-colors hover:border-primary-300 hover:text-text"
              data-testid="config-add-type"
              @click="openCreate('tipos')"
            >
              <PhPlus :size="20" weight="regular" />
              <span class="text-sm">{{ t("config.types.add") }}</span>
            </button>
          </div>
        </template>
        <template #list>
          <ul class="divide-y divide-border rounded-[var(--radius)] border border-border bg-surface">
            <li
              v-for="type in visibleTypes"
              :key="type.id"
              class="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-text">{{ type.name }}</p>
                <p class="truncate text-xs text-text-2">
                  {{ modulesLabel(type.modules) }}
                </p>
              </div>
              <div class="flex shrink-0 gap-1">
                <button
                  type="button"
                  class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
                  :aria-label="t('config.drawer.editType')"
                  @click="openEdit('tipos', type.id)"
                >
                  <PhPencilSimple :size="15" weight="regular" />
                </button>
                <button
                  type="button"
                  class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-error"
                  :aria-label="t('config.types.delete')"
                  @click="deleteType(type.id)"
                >
                  <PhTrash :size="15" weight="regular" />
                </button>
              </div>
            </li>
          </ul>
        </template>
      </BaseView>

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
      role="tabpanel"
      :id="`config-panel-estados`"
      :aria-labelledby="`config-tab-estados`"
      class="mt-6"
      data-testid="config-estados"
    >
      <BaseView
        id="config-estados"
        v-model:search="search"
        :loading="isLoading"
        :search-placeholder="t('config.states.search')"
      >
        <template #grid>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ConfigCard
              v-for="(state, index) in visibleStates"
              :key="state.id"
              :name="state.name"
              :subtitle="t('config.states.position', { n: index + 1 })"
              :edit-label="t('config.drawer.editState')"
              :delete-label="t('config.states.delete')"
              @edit="openEdit('estados', state.id)"
              @remove="deleteState(state.id)"
            />
            <button
              type="button"
              class="flex min-h-24 flex-col items-center justify-center gap-1 rounded-[var(--radius)] border border-dashed border-border p-5 text-text-2 transition-colors hover:border-primary-300 hover:text-text"
              data-testid="config-add-state"
              @click="openCreate('estados')"
            >
              <PhPlus :size="20" weight="regular" />
              <span class="text-sm">{{ t("config.states.add") }}</span>
            </button>
          </div>
        </template>
        <template #list>
          <ul class="divide-y divide-border rounded-[var(--radius)] border border-border bg-surface">
            <li
              v-for="(state, index) in visibleStates"
              :key="state.id"
              class="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-text">{{ state.name }}</p>
                <p class="truncate text-xs text-text-2">
                  {{ t("config.states.position", { n: index + 1 }) }}
                </p>
              </div>
              <div class="flex shrink-0 gap-1">
                <button
                  type="button"
                  class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
                  :aria-label="t('config.drawer.editState')"
                  @click="openEdit('estados', state.id)"
                >
                  <PhPencilSimple :size="15" weight="regular" />
                </button>
                <button
                  type="button"
                  class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-error"
                  :aria-label="t('config.states.delete')"
                  @click="deleteState(state.id)"
                >
                  <PhTrash :size="15" weight="regular" />
                </button>
              </div>
            </li>
          </ul>
        </template>
      </BaseView>

      <p
        class="mt-6 flex items-start gap-2 rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-700"
      >
        <PhInfo :size="16" weight="bold" class="mt-0.5 shrink-0" />
        <span>{{ t("config.states.info") }}</span>
      </p>
    </div>

    <!-- ── Categorías ─────────────────────────────────────────── -->
    <div
      v-else-if="activeTab === 'categorias'"
      role="tabpanel"
      :id="`config-panel-categorias`"
      :aria-labelledby="`config-tab-categorias`"
      class="mt-6"
      data-testid="config-categorias"
    >
      <BaseView
        id="config-categorias"
        v-model:search="search"
        :loading="isLoading"
        :search-placeholder="t('config.categorias.search')"
      >
        <template #grid>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ConfigCard
              v-for="category in visibleCategories"
              :key="category.id"
              :name="category.name"
              :subtitle="
                categoryTypeName(category, types) ??
                t('config.drawer.type')
              "
              :edit-label="t('config.drawer.editCategory')"
              :delete-label="t('config.categorias.delete')"
              @edit="openEdit('categorias', category.id)"
              @remove="deleteCategory(category.id)"
            />
            <button
              type="button"
              class="flex min-h-24 flex-col items-center justify-center gap-1 rounded-[var(--radius)] border border-dashed border-border p-5 text-text-2 transition-colors hover:border-primary-300 hover:text-text"
              data-testid="config-add-category"
              @click="openCreate('categorias')"
            >
              <PhPlus :size="20" weight="regular" />
              <span class="text-sm">{{ t("config.categorias.add") }}</span>
            </button>
          </div>
        </template>
        <template #list>
          <ul class="divide-y divide-border rounded-[var(--radius)] border border-border bg-surface">
            <li
              v-for="category in visibleCategories"
              :key="category.id"
              class="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-text">{{ category.name }}</p>
                <p class="truncate text-xs text-text-2">
                  {{ categoryTypeName(category, types) ?? t("config.drawer.type") }}
                </p>
              </div>
              <div class="flex shrink-0 gap-1">
                <button
                  type="button"
                  class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
                  :aria-label="t('config.drawer.editCategory')"
                  @click="openEdit('categorias', category.id)"
                >
                  <PhPencilSimple :size="15" weight="regular" />
                </button>
                <button
                  type="button"
                  class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-error"
                  :aria-label="t('config.categorias.delete')"
                  @click="deleteCategory(category.id)"
                >
                  <PhTrash :size="15" weight="regular" />
                </button>
              </div>
            </li>
          </ul>
        </template>
      </BaseView>

      <p
        class="mt-6 flex items-start gap-2 rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-700"
      >
        <PhInfo :size="16" weight="bold" class="mt-0.5 shrink-0" />
        <span>{{ t("config.categorias.info") }}</span>
      </p>
    </div>

    <!-- ── Apps ───────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'apps'" role="tabpanel"
      :id="`config-panel-apps`"
      :aria-labelledby="`config-tab-apps`"
      class="mt-6" data-testid="config-apps">
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
      role="tabpanel"
      :id="`config-panel-monedas`"
      :aria-labelledby="`config-tab-monedas`"
      class="mt-6"
      data-testid="config-monedas"
    >
      <BaseView
        id="config-monedas"
        v-model:search="search"
        :loading="isLoading"
        :search-placeholder="t('config.monedas.search')"
      >
        <template #grid>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ConfigCard
              v-for="currency in visibleCurrencies"
              :key="currency.id"
              :name="currency.name"
              :subtitle="`${currency.decimals} ${t('config.monedas.decimals')}`"
              edit-label=""
              delete-label=""
            />
            <button
              type="button"
              class="flex min-h-24 flex-col items-center justify-center gap-1 rounded-[var(--radius)] border border-dashed border-border p-5 text-text-2 transition-colors hover:border-primary-300 hover:text-text"
              data-testid="config-add-currency"
              @click="openCreate('monedas')"
            >
              <PhPlus :size="20" weight="regular" />
              <span class="text-sm">{{ t("config.monedas.add") }}</span>
            </button>
          </div>
        </template>
        <template #list>
          <ul class="divide-y divide-border rounded-[var(--radius)] border border-border bg-surface">
            <li
              v-for="currency in visibleCurrencies"
              :key="currency.id"
              class="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-text">{{ currency.name }}</p>
                <p class="truncate text-xs text-text-2">
                  {{ currency.decimals }} {{ t("config.monedas.decimals") }}
                </p>
              </div>
            </li>
          </ul>
        </template>
      </BaseView>

      <p
        class="mt-6 flex items-start gap-2 rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-700"
      >
        <PhInfo :size="16" weight="bold" class="mt-0.5 shrink-0" />
        <span>{{ t("config.monedas.info") }}</span>
      </p>
    </div>

    <!-- ── Drawers: creation/edition lives in the URL (PRD §9.1). ── -->
    <ConfigTypeDrawer
      :open="drawerOpen && activeTab === 'tipos'"
      :initial="editingType"
      :submitting="saving"
      :error="drawerError"
      @close="closeDrawer"
      @submit="submitType"
    />
    <ConfigStateDrawer
      :open="drawerOpen && activeTab === 'estados'"
      :initial="editingState"
      :states="orderedStates"
      :submitting="saving"
      :error="drawerError"
      @close="closeDrawer"
      @submit="submitState"
    />
    <ConfigCategoryDrawer
      :open="drawerOpen && activeTab === 'categorias'"
      :initial="editingCategory"
      :types="types"
      :submitting="saving"
      :error="drawerError"
      @close="closeDrawer"
      @submit="submitCategory"
    />
    <ConfigCurrencyDrawer
      :open="drawerOpen && activeTab === 'monedas'"
      :submitting="saving"
      :error="drawerError"
      @close="closeDrawer"
      @submit="submitCurrency"
    />
  </section>
</template>
