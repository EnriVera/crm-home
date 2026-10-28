# Plugins

Nuxt plugins land here with the feature that needs them. An empty plugin file
would run on every navigation, so the scaffold creates none.

- `orpc.client.ts`: orpc client bound to `@crm/contract` (PRD-v4 §11.1).
- `query.client.ts`: TanStack Query client (PRD-v4 §11.1).
- `realtime.ws.ts`: websocket invalidation channel (PRD-v4 §6.5).
