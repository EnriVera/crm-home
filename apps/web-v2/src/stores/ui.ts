import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * UI store — sidebar collapsed, last-used filters per view.
 * Pure local UI state, no server mirror.
 */
export const useUiStore = defineStore("ui", () => {
 const sidebarCollapsed = ref(false);

 function setSidebarCollapsed(next: boolean) {
  sidebarCollapsed.value = next;
 }

 function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
 }

 return { sidebarCollapsed, setSidebarCollapsed, toggleSidebar };
});
