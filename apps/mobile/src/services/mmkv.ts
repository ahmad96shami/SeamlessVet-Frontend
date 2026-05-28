import { createMMKV } from "react-native-mmkv";

/**
 * Synchronous, JSI-backed key-value store for **prefs and feature flags only** —
 * language choice, sync indicator state, UI prefs, etc. Tokens go to
 * `expo-secure-store` (services/tokenStorage.ts), never here: MMKV is not
 * keystore-encrypted by default.
 *
 * One instance per logical store; we keep a single shared "prefs" instance for
 * now and can split later if a feature needs its own namespace.
 */
export const prefs = createMMKV({ id: "vet.prefs" });
