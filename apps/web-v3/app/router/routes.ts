import type { RouteRecordRaw } from "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    /** The route needs a session (PRD-v4 §12.4). */
    auth?: boolean;
    /** The route is public and redirects an authenticated user (PRD-v4 §12.4). */
    guest?: boolean;
    /** Layout selected in app.vue from app/layouts/. */
    layout?: "default" | "auth" | "legal";
  }
}

/**
 * Canonical route table (PRD-v4 §7.2, §12.2). Adding or removing a screen means
 * editing a row here, never creating a file under a pages/ folder.
 */
export const routes: RouteRecordRaw[] = [
  { path: "/", name: "index", redirect: () => "/dashboard" },
  {
    path: "/login",
    name: "login",
    component: () => import("~/ui/views/login.vue"),
    meta: { layout: "auth", guest: true },
  },
  {
    path: "/login-verification",
    name: "login-verification",
    component: () => import("~/ui/views/login-verification.vue"),
    meta: { layout: "auth", guest: true },
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: () => import("~/ui/views/dashboard.vue"),
    meta: { auth: true },
  },
  {
    path: "/tasks",
    name: "tasks",
    component: () => import("~/ui/views/tasks.vue"),
    meta: { auth: true },
  },
  {
    path: "/tasks-config",
    name: "tasks-config",
    component: () => import("~/ui/views/tasks-config.vue"),
    meta: { auth: true },
  },
  {
    path: "/schedules",
    name: "schedules",
    component: () => import("~/ui/views/schedules.vue"),
    meta: { auth: true },
  },
  {
    path: "/clients",
    name: "clients",
    component: () => import("~/ui/views/clients.vue"),
    meta: { auth: true },
  },
  {
    path: "/incomes",
    name: "incomes",
    component: () => import("~/ui/views/incomes.vue"),
    meta: { auth: true },
  },
  {
    path: "/expenses",
    name: "expenses",
    component: () => import("~/ui/views/expenses.vue"),
    meta: { auth: true },
  },
  {
    path: "/transfers",
    name: "transfers",
    component: () => import("~/ui/views/transfers.vue"),
    meta: { auth: true },
  },
  {
    path: "/config",
    name: "config",
    component: () => import("~/ui/views/config.vue"),
    meta: { auth: true },
  },
  {
    path: "/terms",
    name: "terms",
    component: () => import("~/ui/views/terms.vue"),
    meta: { layout: "legal", guest: true },
  },
  {
    path: "/privacy",
    name: "privacy",
    component: () => import("~/ui/views/privacy.vue"),
    meta: { layout: "legal", guest: true },
  },
  {
    path: "/cookies",
    name: "cookies",
    component: () => import("~/ui/views/cookies.vue"),
    meta: { layout: "legal", guest: true },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("~/ui/views/not-found.vue"),
    meta: { layout: "auth", guest: true },
  },
];
