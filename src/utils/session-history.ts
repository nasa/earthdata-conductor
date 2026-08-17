export interface SessionStep {
  toolName: string;
  timestamp: number;
  params: Record<string, unknown>;
}

class SessionHistoryManager {
  private steps: SessionStep[] = [];

  addStep(toolName: string, params: Record<string, unknown>): void {
    this.steps.push({
      toolName,
      timestamp: Date.now(),
      params,
    });
  }

  getSteps(): SessionStep[] {
    return [...this.steps];
  }

  clear(): void {
    this.steps = [];
  }
}

export const sessionHistory = new SessionHistoryManager();
