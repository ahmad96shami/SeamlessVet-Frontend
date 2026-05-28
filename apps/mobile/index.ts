// MUST be the very first import in the app entry.
//
// Hermes does not expose `crypto.getRandomValues()` by default, but uuid v7
// (used by `@vet/shared/http/idempotency.ts` to mint idempotency keys and
// by `@vet/shared/offline/queue.ts` to mint queue ids) calls it. Without
// this polyfill, every mint throws — and every offline write would fail.
//
// Audit reference: docs/frontend/MOBILE.md § "@vet/shared RN-safety audit"
// (the one required RN setup step the audit identified).
import "react-native-get-random-values";

// Expo Router takes over after the polyfill is loaded.
import "expo-router/entry";
