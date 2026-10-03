/**
 * vue-sonner wrapper — the only place that imports vue-sonner.
 */
import { toast as sonnerToast } from "vue-sonner";

export { Toaster } from "vue-sonner";
export const toast = sonnerToast;
