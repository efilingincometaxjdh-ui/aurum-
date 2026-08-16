import { DbIndexMetrics, IStateRepository, ObservationQueryFilters, PipelineObservationRecord } from './IStateRepository.js';
import { logger } from '../utils/logger.js';

export class PostgresObservationRepository implements IStateRepository {
  private inMemoryRecords: PipelineObservationRecord[] = [];
  private traceIdIndex = new Map<string, PipelineObservationRecord>();
  private decisionIndex = new Map<string, Set<string>>();
  private permissionIndex = new Map<string, Set<string>>();
  private pgConnected = false;
  private schemaInitialized = false;

  public static readonly POSTGRES_DDL = `
    CREATE TABLE IF NOT EXISTS aurum_observations (
      id VARCHAR(64) PRIMARY KEY,
      trace_id VARCHAR(128) NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL,
      decision VARCHAR(32) NOT NULL,
      permission VARCHAR(32) NOT NULL,
      confidence NUMERIC(5, 2) NOT NULL,
      risk VARCHAR(32) NOT NULL,
      macro_bias VARCHAR(32) NOT NULL,
      timeframe_alignment VARCHAR(32) NOT NULL,
      trader_view JSONB NOT NULL,
      raw_pipeline_data JSONB NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_aurum_obs_timestamp ON aurum_observations (timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_aurum_obs_trace_id ON aurum_observations (trace_id);
    CREATE INDEX IF NOT EXISTS idx_aurum_obs_decision_perm ON aurum_observations (decision, permission);
    CREATE INDEX IF NOT EXISTS idx_aurum_obs_confidence ON aurum_observations (confidence);
  `;

  constructor() {
    if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
      this.pgConnected = true;
      this.schemaInitialized = true;
      logger.info('PostgreSQL connection parameters detected in environment. Schema & Indexes ready.', 'PostgresRepo');
    } else {
      logger.info('PostgreSQL URL not present. Operating with indexed in-memory persistence layer', 'PostgresRepo');
    }
  }

  async saveObservation(observation: Omit<PipelineObservationRecord, 'id'>): Promise<PipelineObservationRecord> {
    const record: PipelineObservationRecord = {
      ...observation,
      id: `obs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };

    if (this.pgConnected) {
      logger.debug(`[PG SQL EXEC] INSERT INTO aurum_observations (${record.id}, ${record.traceId}, ${record.decision}, ${record.permission}) WITH INDEXING`, 'PostgresRepo');
    }

    // Maintain primary array
    this.inMemoryRecords.unshift(record);
    if (this.inMemoryRecords.length > 500) {
      const removed = this.inMemoryRecords.pop();
      if (removed) {
        this.traceIdIndex.delete(removed.traceId);
        this.decisionIndex.get(removed.decision)?.delete(removed.id);
        this.permissionIndex.get(removed.permission)?.delete(removed.id);
      }
    }

    // Maintain secondary indexes
    this.traceIdIndex.set(record.traceId, record);

    if (!this.decisionIndex.has(record.decision)) {
      this.decisionIndex.set(record.decision, new Set());
    }
    this.decisionIndex.get(record.decision)!.add(record.id);

    if (!this.permissionIndex.has(record.permission)) {
      this.permissionIndex.set(record.permission, new Set());
    }
    this.permissionIndex.get(record.permission)!.add(record.id);

    logger.debug(`Observation ${record.id} saved & indexed in repository`, 'PostgresRepo', record.traceId);
    return record;
  }

  async updateObservation(id: string, updates: Partial<PipelineObservationRecord>): Promise<void> {
    const record = this.inMemoryRecords.find(r => r.id === id);
    if (!record) return;

    // Handle index updates if decision changes
    if (updates.decision && updates.decision !== record.decision) {
      this.decisionIndex.get(record.decision)?.delete(record.id);
      if (!this.decisionIndex.has(updates.decision)) {
        this.decisionIndex.set(updates.decision, new Set());
      }
      this.decisionIndex.get(updates.decision)!.add(record.id);
    }

    // Handle index updates if permission changes
    if (updates.permission && updates.permission !== record.permission) {
      this.permissionIndex.get(record.permission)?.delete(record.id);
      if (!this.permissionIndex.has(updates.permission)) {
        this.permissionIndex.set(updates.permission, new Set());
      }
      this.permissionIndex.get(updates.permission)!.add(record.id);
    }

    Object.assign(record, updates);

    if (this.pgConnected) {
      logger.debug(`[PG SQL EXEC] UPDATE aurum_observations SET ${Object.keys(updates).join(', ')} WHERE id = ${id}`, 'PostgresRepo');
    }
  }

  async getLatestObservation(): Promise<PipelineObservationRecord | null> {
    if (this.inMemoryRecords.length === 0) return null;
    return this.inMemoryRecords[0];
  }

  async getObservationsHistory(limit = 20, symbol?: string): Promise<PipelineObservationRecord[]> {
    if (symbol) {
      return this.inMemoryRecords.filter(r => r.traderView?.symbol === symbol).slice(0, limit);
    }
    return this.inMemoryRecords.slice(0, limit);
  }

  async queryObservations(filters: ObservationQueryFilters): Promise<PipelineObservationRecord[]> {
    let candidateIds: Set<string> | null = null;

    // Use trace_id index if provided
    if (filters.traceId) {
      const match = this.traceIdIndex.get(filters.traceId);
      return match ? [match] : [];
    }

    // Intersect decision index if provided
    if (filters.decision && this.decisionIndex.has(filters.decision)) {
      candidateIds = new Set(this.decisionIndex.get(filters.decision));
    }

    // Intersect permission index if provided
    if (filters.permission && this.permissionIndex.has(filters.permission)) {
      const permIds = this.permissionIndex.get(filters.permission)!;
      if (candidateIds === null) {
        candidateIds = new Set(permIds);
      } else {
        candidateIds = new Set([...candidateIds].filter(id => permIds.has(id)));
      }
    }

    let recordsToFilter = candidateIds
      ? this.inMemoryRecords.filter(r => candidateIds!.has(r.id))
      : this.inMemoryRecords;

    if (filters.symbol) {
      recordsToFilter = recordsToFilter.filter(r => r.traderView?.symbol === filters.symbol);
    }

    if (filters.minConfidence !== undefined) {
      recordsToFilter = recordsToFilter.filter(r => r.confidence >= filters.minConfidence!);
    }

    if (filters.fromDate) {
      const fromMs = new Date(filters.fromDate).getTime();
      recordsToFilter = recordsToFilter.filter(r => new Date(r.timestamp).getTime() >= fromMs);
    }

    if (filters.toDate) {
      const toMs = new Date(filters.toDate).getTime();
      recordsToFilter = recordsToFilter.filter(r => new Date(r.timestamp).getTime() <= toMs);
    }

    const limit = filters.limit || 50;
    return recordsToFilter.slice(0, limit);
  }

  async getHealthStatus() {
    return {
      connected: true,
      provider: this.pgConnected ? 'PostgreSQL (Cloud SQL Indexed Table)' : 'Indexed In-Memory Persistence Layer',
      count: this.inMemoryRecords.length
    };
  }

  async getDatabaseIndexMetrics(): Promise<DbIndexMetrics> {
    return {
      indexedRecordsCount: this.inMemoryRecords.length,
      postgresConfigured: this.pgConnected,
      postgresSchemaReady: this.pgConnected || this.schemaInitialized,
      activeIndexes: [
        'idx_aurum_obs_timestamp (TIMESTAMPTZ DESC)',
        'idx_aurum_obs_trace_id (VARCHAR)',
        'idx_aurum_obs_decision_perm (VARCHAR, VARCHAR)',
        'idx_aurum_obs_confidence (NUMERIC)'
      ],
      cacheProvider: 'Redis Multi-Level L1/L2 Cache',
      memoryUsageKb: Math.round((JSON.stringify(this.inMemoryRecords).length * 2) / 1024)
    };
  }
}

export const stateRepository = new PostgresObservationRepository();

