<script setup lang="ts">
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { onBeforeUnmount, watch } from "vue";
import {
  PhLinkSimple,
  PhListBullets,
  PhTextB,
  PhTextItalic,
} from "~/shared/vendor/icons";

/**
 * RichTextEditor — the vendor wrapper around tiptap (PRD-v4 §10.3:
 * `vendor/richtext/` is the only place that imports tiptap).
 *
 * Minimal toolbar per the task drawer spec (PRD-v4 §9.2): bold, italic,
 * list and link. The model is the HTML string stored in
 * `task_description`; empty content maps to null so the column stays
 * clean.
 */
const props = defineProps<{
  modelValue: string | null;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
}>();

const { t } = useI18n();

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      // The drawer toolbar is B/I/list/link — keep the surface minimal.
      heading: false,
      blockquote: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
    }),
    Link.configure({ openOnClick: false }),
  ],
  content: props.modelValue ?? "",
  onUpdate: ({ editor: instance }) => {
    const html = instance.getHTML();
    const isEmpty =
      instance.getText().trim().length === 0 && !html.includes("<a ");
    emit("update:modelValue", isEmpty ? null : html);
  },
  editorProps: {
    attributes: {
      class:
        "min-h-28 w-full rounded-b-[var(--radius-sm)] border border-t-0 border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent [&_a]:text-accent [&_a]:underline",
      "data-testid": "richtext-input",
    },
  },
});

watch(
  () => props.modelValue,
  (value) => {
    const current = editor.value?.getHTML() ?? "";
    const next = value ?? "";
    // Avoid clobbering the editor (and cursor) while the user types.
    if (editor.value && current !== next) {
      editor.value.commands.setContent(next, false);
    }
  },
);

onBeforeUnmount(() => {
  editor.value?.destroy();
});

function setLink() {
  if (!editor.value) return;
  const previous = editor.value.getAttributes("link").href as
    | string
    | undefined;
  const url = window.prompt(
    t("tasks.drawer.linkPrompt"),
    previous ?? "https://",
  );
  if (url === null) return;
  if (url === "") {
    editor.value.chain().focus().unsetLink().run();
    return;
  }
  editor.value.chain().focus().setLink({ href: url }).run();
}
</script>

<template>
  <div>
    <div
      class="flex gap-1 rounded-t-[var(--radius-sm)] border border-b-0 border-border bg-surface-2 px-2 py-1.5"
      role="toolbar"
      :aria-label="t('tasks.drawer.description')"
    >
      <button
        type="button"
        class="rounded p-1 transition-colors hover:bg-surface"
        :class="{ 'bg-surface text-primary-700': editor?.isActive('bold') }"
        :aria-label="t('tasks.drawer.bold')"
        data-testid="richtext-bold"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        <PhTextB :size="16" weight="bold" />
      </button>
      <button
        type="button"
        class="rounded p-1 transition-colors hover:bg-surface"
        :class="{ 'bg-surface text-primary-700': editor?.isActive('italic') }"
        :aria-label="t('tasks.drawer.italic')"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        <PhTextItalic :size="16" weight="regular" />
      </button>
      <button
        type="button"
        class="rounded p-1 transition-colors hover:bg-surface"
        :class="{ 'bg-surface text-primary-700': editor?.isActive('bulletList') }"
        :aria-label="t('tasks.drawer.list')"
        data-testid="richtext-list"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        <PhListBullets :size="16" weight="regular" />
      </button>
      <button
        type="button"
        class="rounded p-1 transition-colors hover:bg-surface"
        :class="{ 'bg-surface text-primary-700': editor?.isActive('link') }"
        :aria-label="t('tasks.drawer.link')"
        data-testid="richtext-link"
        @click="setLink"
      >
        <PhLinkSimple :size="16" weight="regular" />
      </button>
    </div>
    <EditorContent v-if="editor" :editor="editor" />
  </div>
</template>
