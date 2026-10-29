<script setup lang="ts" generic="T extends { id: string }">
import { VueDraggable, type DraggableEvent } from "vue-draggable-plus";

/**
 * DragList — the vendor wrapper around vue-draggable-plus (PRD-v4 §10.3:
 * `vendor/dnd/` is the only place that imports the library).
 *
 * The wrapper pins the contract the app uses: items are keyed by `id`,
 * the group is shared by name so items move between lists, and the only
 * event the consumer handles is `end` (the semantic move intent — the
 * parent owns the data and applies it optimistically).
 */
const props = defineProps<{
  modelValue: T[];
  group: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: T[]];
  end: [
    payload: {
      item: HTMLElement;
      from: HTMLElement;
      to: HTMLElement;
      newIndex: number;
    },
  ];
}>();

function onEnd(event: DraggableEvent) {
  emit("end", {
    item: event.item,
    from: event.from as HTMLElement,
    to: event.to as HTMLElement,
    newIndex: event.newIndex ?? 0,
  });
}
</script>

<template>
  <VueDraggable
    :model-value="props.modelValue"
    :group="{ name: group }"
    :animation="200"
    @update:model-value="emit('update:modelValue', $event as T[])"
    @end="onEnd"
  >
    <!-- vue-draggable-plus renders the items from the DEFAULT slot (it
         inspects the container children), so the list is mapped here. -->
    <template v-for="item in props.modelValue" :key="item.id">
      <slot name="item" :item="item" />
    </template>
  </VueDraggable>
</template>
