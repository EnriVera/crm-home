/**
 * shadcn-vue vendor wrapper.
 *
 * This is the ONLY place in the app that imports a shadcn-vue primitive
 * directly. The shadcn-vue CLI writes each component into its own file
 * under this directory; we re-export the surface here so consumers
 * (in ui/atoms, ui/molecules) can import from one path.
 *
 * Initialize with `bunx shadcn-vue@latest init` then `bunx shadcn-vue@latest
 * add button input dialog sheet tabs select checkbox tooltip sonner`.
 */
export {};
