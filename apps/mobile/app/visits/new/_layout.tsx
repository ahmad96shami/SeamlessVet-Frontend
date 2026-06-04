import { Stack } from "expo-router";

/** The guided new-visit wizard stack (MoD.5) — screens own their StepHeader chrome. */
export default function NewVisitLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: "fade", freezeOnBlur: true }} />;
}
