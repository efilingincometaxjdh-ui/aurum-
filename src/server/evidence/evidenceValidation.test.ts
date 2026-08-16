import { EvidenceEngine } from './EvidenceEngine.js';
import { PipelineOrchestrator } from '../pipeline/PipelineOrchestrator.js';

async function testEvidenceValidationSuite() {
  console.log('--- STARTING AURUM EVIDENCE VALIDATION & PIPELINE TEST SUITE ---');

  // 1. Test EvidenceEngine Collection under Normal Conditions
  const engine = new EvidenceEngine();
  const traceId = `test_trace_${Date.now()}`;
  const evidence = await engine.collectEvidence(traceId);

  console.log('[Test 1] Collected EvidencePackage ID:', evidence.id);
  console.log('[Test 1] Evidence Coverage Score:', evidence.coverageScore, '%');
  console.log('[Test 1] Evidence Health:', evidence.health);
  console.log('[Test 1] Validation Flags:', evidence.validationFlags);
  console.log('[Test 1] Missing Evidence:', evidence.missingEvidence);

  if (evidence.coverageScore >= 60 && evidence.health !== 'DEGRADED') {
    console.log('✓ PASS: Evidence Engine built valid package with expected coverage score.');
  } else {
    console.error('✗ FAIL: Evidence Engine coverage below expected threshold.');
    process.exit(1);
  }

  // 2. Test Pipeline Execution
  const orchestrator = new PipelineOrchestrator();
  const summary = await orchestrator.runPipeline(traceId, true);

  console.log('[Test 2] Pipeline Decision:', summary.trader_view.decision);
  console.log('[Test 2] Permission State:', summary.trader_view.permission);
  console.log('[Test 2] Evidence Coverage in Summary:', summary.evidence_coverage);

  if (summary.evidence_coverage && summary.evidence_coverage.score >= 60) {
    console.log('✓ PASS: Pipeline Orchestrator attached evidence coverage to summary.');
  } else {
    console.error('✗ FAIL: Pipeline Orchestrator missing evidence coverage.');
    process.exit(1);
  }

  console.log('--- ALL EVIDENCE & PIPELINE SUITE TESTS PASSED ---');
  process.exit(0);
}

testEvidenceValidationSuite().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
