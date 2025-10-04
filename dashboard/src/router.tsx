import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

// Create the router with our route tree
export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
});

// Register the router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
