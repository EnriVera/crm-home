<script setup lang="ts">
import LegalPage from "~/ui/organisms/legal-page.vue";

const { t } = useI18n();
</script>

<template>
  <LegalPage
    :title="t('legal.privacy.title')"
    :body="t('legal.privacy.body')"
  />
</template>
