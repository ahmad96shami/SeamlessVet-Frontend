import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Top-level error boundary — catches render crashes and offers a reload. */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("UI error boundary:", error, info);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-lg font-semibold">حدث خطأ غير متوقع</h1>
          <p className="max-w-md text-sm text-muted-foreground">{this.state.error.message}</p>
          <Button onClick={() => window.location.reload()}>إعادة تحميل</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
