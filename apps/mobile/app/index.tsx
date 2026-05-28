import { v7 as uuidv7 } from "uuid";
import { Text, View } from "react-native";

export default function Index() {
  // Smoke proof for Mo0 task 1: a uuid v7 mint only succeeds if the
  // `react-native-get-random-values` polyfill loaded first (Hermes has no
  // built-in crypto.getRandomValues, which uuid v7 requires).
  const id = uuidv7();
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-2xl font-bold text-slate-900">SeamlessVet Field</Text>
      <Text className="mt-2 text-sm text-slate-600">Mo0 scaffold — uuid v7 mint OK</Text>
      <Text className="mt-2 text-xs font-mono text-slate-500" selectable>
        {id}
      </Text>
    </View>
  );
}
