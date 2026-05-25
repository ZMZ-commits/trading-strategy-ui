// In development (Vite proxy active) this is empty — all calls go to /strategies etc.
// In production set VITE_API_BASE_URL to the backend URL, e.g. https://trading-strategy-backend.onrender.com
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
