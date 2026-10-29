<script setup lang="ts">
// Incomes (PRD-v4 §8.7, Phase 2): the API exists, the screen does not yet.
import ComingSoon from "~/ui/organisms/coming-soon.vue";

const { t } = useI18n();
</script>

<template>
  <ComingSoon :name="t('nav.incomes')" />
</template>
