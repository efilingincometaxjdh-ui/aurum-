import { TraderViewSnapshot } from '../../types.js';

export interface PipelineObservationRecord {
  id: string;
  traceId: string;
  timestamp: string;
  decision: string;
  permission: string;
  confidence: number;
  risk: string;
  macroBias: string;
  timeframeAlignment: string;
  traderView: TraderViewSnapshot;
  rawPipelineData: any;
  outcome?: any;
}

export interface ObservationQueryFilters {
  traceId?: string;
  symbol?: string;
  decision?: string;
  permission?: string;
  minConfidence?: number;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export interface DbIndexMetrics {
  indexedRecordsCount: number;
  postgresConfigured: boolean;
  postgresSchemaReady: boolean;
  activeIndexes: string[];
  cacheProvider: string;
  memoryUsageKb: number;
}

export interface IStateRepository {
  saveObservation(observation: Omit<PipelineObservationRecord, 'id'>): Promise<PipelineObservationRecord>;
  updateObservation(id: string, updates: Partial<PipelineObservationRecord>): Promise<void>;
  getLatestObservation(): Promise<PipelineObservationRecord | null>;
  getObservationsHistory(limit?: number): Promise<PipelineObservationRecord[]>;
  queryObservations(filters: ObservationQueryFilters): Promise<PipelineObservationRecord[]>;
  getHealthStatus(): Promise<{ connected: boolean; provider: string; count: number }>;
  getDatabaseIndexMetrics(): Promise<DbIndexMetrics>;
}
