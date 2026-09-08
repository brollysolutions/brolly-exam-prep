import { useSessionStore } from '../session';
import { HttpApi } from './http';
export * from './types';
export { HttpApi } from './http';

// Browser calls use the same origin in both local development and Docker.
// Fixture-backed catalogue/papers are retained inside HttpApi until the API serves them.
const api = new HttpApi({ baseUrl: '/api', getToken: () => useSessionStore.getState().token });
export const getApi = () => api;
