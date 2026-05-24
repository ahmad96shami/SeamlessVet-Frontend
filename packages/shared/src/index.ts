// @vet/shared — single source of truth shared by both vet clients.
//
// NOTE: "./queries" (React Query hooks) is intentionally NOT re-exported from the root,
// to keep the root entry free of a React dependency. Import hooks via "@vet/shared/queries".
export * from "./constants";
export * from "./enums";
export * from "./formatters";
export * from "./i18n";
export * from "./http";
export * from "./offline";
export * from "./schemas";
export * from "./api";
export type * from "./types";
