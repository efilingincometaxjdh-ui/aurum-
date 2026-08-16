import { IAgent } from './IAgent.js';
import { Agent01Research } from './Agent01Research.js';
import { Agent02Technical } from './Agent02Technical.js';
import { Agent03Macro } from './Agent03Macro.js';
import { Agent04Decision } from './Agent04Decision.js';
import { Agent05Permission } from './Agent05Permission.js';
import { Agent06Alert } from './Agent06Alert.js';
import { logger } from '../utils/logger.js';

export class AgentRegistry {
  private agents = new Map<string, IAgent>();

  constructor() {
    this.register(new Agent01Research());
    this.register(new Agent02Technical());
    this.register(new Agent03Macro());
    this.register(new Agent04Decision());
    this.register(new Agent05Permission());
    this.register(new Agent06Alert());
  }

  public register(agent: IAgent) {
    this.agents.set(agent.id, agent);
    logger.info(`Registered agent: ${agent.id} (${agent.name} v${agent.version})`, 'AgentRegistry');
  }

  public get<T extends IAgent>(agentId: string): T {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with id '${agentId}' not found in registry.`);
    }
    return agent as T;
  }

  public listAgents(): Array<{ id: string; name: string; version: string }> {
    return Array.from(this.agents.values()).map(a => ({
      id: a.id,
      name: a.name,
      version: a.version
    }));
  }
}

export const agentRegistry = new AgentRegistry();
