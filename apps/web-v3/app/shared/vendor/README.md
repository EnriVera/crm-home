# Vendor wrappers

The only place in web-v3 allowed to import third-party UI libraries (PRD-v4 §10.3,
§11.4). Each tool gets its own subfolder that re-exports a narrow surface, and the
rest of the app imports the wrapper instead of the library.

- `icons/`: `@phosphor-icons/vue`
- `toast/`: `vue-sonner`

`eslint.config.ts` fails the build on a direct import of those libraries anywhere
else, so a new tool lands here the first time it is used.
