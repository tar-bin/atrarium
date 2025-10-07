// Atrarium API Contracts
// Shared oRPC contracts between client and server

// Re-export client router type from server implementation
// This provides proper type safety for createORPCClient
export type { ClientRouter } from './client-types';
export * from './router';
export * from './schemas';
export * from './types';
