import { vi } from "vitest";

vi.stubEnv("VITE_API_URL", "http://localhost:8080");
vi.stubEnv("VITE_AUTHULA_URL", "http://localhost:8081");
vi.stubEnv("VITE_WEB_URL", "http://localhost:3000");
vi.stubEnv("VITE_PORT", "3002");
