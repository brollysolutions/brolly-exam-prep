import { HttpApi } from './http';
export * from './types';
export { HttpApi } from './http';

// Browser calls use the same origin in both local development and Docker.
// All published content and practice results are served by the API.
const api = new HttpApi({ baseUrl: '/api' });
export const getApi = () => api;
