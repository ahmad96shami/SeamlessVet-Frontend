import { View } from "react-native";

import { TopBar } from "./TopBar";

/**
 * The design's wizard header — a TopBar over a row of equal-width progress bars
 * (teal-filled up to the current step). Drives the new-visit guided flow; under
 * forced RTL the first bar sits on the right, matching the design's direction.
 */
interface StepHeaderProps {
  title: string;
  /** 0-based index of the current step. */
  step: number;
  /** Total number of steps (bars). */
  steps: number;
  onBack?: () => void;
}

export function StepHeader({ title, step, steps, onBack }: StepHeaderProps) {
  return (
    <View className="bg-paper border-ink-100 border-b">
      <TopBar title={title} onBack={onBack} solid={false} />
      <View className="flex-row gap-1.5 px-5 pb-3">
        {Array.from({ length: steps }, (_, i) => (
          <View
            key={i}
            className={`h-[5px] flex-1 rounded-pill ${i <= step ? "bg-teal-500" : "bg-ink-100"}`}
          />
        ))}
      </View>
    </View>
  );
}
