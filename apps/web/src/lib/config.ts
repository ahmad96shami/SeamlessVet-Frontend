/** Base URL of the .NET backend. Override via VITE_API_URL (.env.local / build env). */
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5180";
//export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";