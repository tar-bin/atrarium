// Atrarium API Contracts
// Shared oRPC contracts between client and server

export * from './router';
export * from './schemas';
export * from './types';

// Export Router type alias for client-side usage
import type { contract } from './router';
export type Router = typeof contract;
