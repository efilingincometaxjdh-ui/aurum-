export interface PipelineMetrics {
  totalPipelineRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageExecutionMs: number;
  lastExecutionMs: number;
  agentDurationsMs: Record<string, number>;
  ctraderApiLatencyMs: number;
  evidenceCollectionLatencyMs: number;
}

class MetricsRegistry {
  private runsCount = 0;
  private successCount = 0;
  private failCount = 0;
  private totalDurationMs = 0;
  private lastDurationMs = 0;
  private agentDurations: Record<string, number> = {};
  private ctraderLatency = 0;
  private evidenceLatency = 0;

  recordPipelineRun(durationMs: boolean | number, success: boolean, agentTimes?: Record<string, number>) {
    this.runsCount++;
    if (success) this.successCount++;
    else this.failCount++;

    const dur = typeof durationMs === 'number' ? durationMs : 0;
    this.lastDurationMs = dur;
    this.totalDurationMs += dur;

    if (agentTimes) {
      for (const [agent, time] of Object.entries(agentTimes)) {
        this.agentDurations[agent] = time;
      }
    }
  }

  setCTraderLatency(ms: number) {
    this.ctraderLatency = ms;
  }

  setEvidenceLatency(ms: number) {
    this.evidenceLatency = ms;
  }

  getMetrics(): PipelineMetrics {
    return {
      totalPipelineRuns: this.runsCount,
      successfulRuns: this.successCount,
      failedRuns: this.failCount,
      averageExecutionMs: this.runsCount > 0 ? Math.round(this.totalDurationMs / this.runsCount) : 0,
      lastExecutionMs: this.lastDurationMs,
      agentDurationsMs: { ...this.agentDurations },
      ctraderApiLatencyMs: this.ctraderLatency,
      evidenceCollectionLatencyMs: this.evidenceLatency
    };
  }
}

export const metricsRegistry = new MetricsRegistry();
