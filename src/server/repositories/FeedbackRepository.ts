import { ExecutionFeedbackV1 } from '../contracts/v1.js';

export interface ExecutorEvent {
  timestamp: string;
  correlation_id: string; // matches decision_id
  event_type: string;
  details: string;
  metadata?: any;
}

class FeedbackRepository {
  private feedbacks: Map<string, ExecutionFeedbackV1> = new Map();
  private events: ExecutorEvent[] = [];

  /**
   * Store execution feedback from Executor
   */
  public saveFeedback(feedback: ExecutionFeedbackV1) {
    this.feedbacks.set(feedback.decision_id, {
      ...feedback,
      timestamp: feedback.timestamp || new Date().toISOString()
    });
  }

  /**
   * Retrieve all feedback reports
   */
  public getFeedbacks(): ExecutionFeedbackV1[] {
    return Array.from(this.feedbacks.values()).sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });
  }

  /**
   * Retrieve feedback by decision ID
   */
  public getFeedbackByDecisionId(decisionId: string): ExecutionFeedbackV1 | undefined {
    return this.feedbacks.get(decisionId);
  }

  /**
   * Record standard Executor event with timestamp & correlation ID (Task 11)
   */
  public recordEvent(eventType: string, correlationId: string, details: string, metadata?: any) {
    const event: ExecutorEvent = {
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      event_type: eventType,
      details,
      metadata
    };
    this.events.push(event);
    console.log(`[EXECUTOR_EVENT] [${event.timestamp}] [${correlationId}] ${eventType}: ${details}`);
  }

  /**
   * Retrieve all recorded events
   */
  public getEvents(correlationId?: string): ExecutorEvent[] {
    if (correlationId) {
      return this.events.filter(e => e.correlation_id === correlationId);
    }
    return this.events;
  }

  public clear() {
    this.feedbacks.clear();
    this.events = [];
  }
}

export const feedbackRepository = new FeedbackRepository();
