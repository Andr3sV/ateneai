import dotenv from 'dotenv';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

if (!ELEVENLABS_API_KEY) {
  console.warn('⚠️  ELEVENLABS_API_KEY is not set. ElevenLabs features will not work.');
}

interface EvaluationCriteria {
  id?: string;
  name: string;
  conversation_goal_prompt: string;
  type?: string;
  use_knowledge_base?: boolean;
}

interface ElevenLabsAgentConfig {
  agent_id: string;
  name: string;
  conversation_config: {
    agent: {
      first_message: string;
      prompt: {
        prompt: string;
      };
    };
  };
  platform_settings?: {
    evaluation?: {
      criteria?: EvaluationCriteria[];
    };
  };
}

/**
 * Get agent details from ElevenLabs API
 */
export async function getElevenLabsAgent(agentId: string): Promise<ElevenLabsAgentConfig> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  const response = await fetch(`${ELEVENLABS_API_URL}/convai/agents/${agentId}`, {
    method: 'GET',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  return (await response.json()) as ElevenLabsAgentConfig;
}

/**
 * Update agent in ElevenLabs API
 */
export async function updateElevenLabsAgent(
  agentId: string,
  updates: {
    first_message?: string;
    prompt?: string;
    evaluation_criteria?: EvaluationCriteria[];
  }
): Promise<ElevenLabsAgentConfig> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  // Build the update payload according to ElevenLabs API structure
  const payload: any = {};

  // Update agent config (first_message and prompt)
  if (updates.first_message !== undefined || updates.prompt !== undefined) {
    payload.conversation_config = {
      agent: {}
    };

    if (updates.first_message !== undefined) {
      payload.conversation_config.agent.first_message = updates.first_message;
    }

    if (updates.prompt !== undefined) {
      payload.conversation_config.agent.prompt = {
        prompt: updates.prompt,
      };
    }
  }

  // Update evaluation criteria in platform_settings
  if (updates.evaluation_criteria !== undefined) {
    payload.platform_settings = {
      evaluation: {
        criteria: updates.evaluation_criteria
      }
    };
  }

  const response = await fetch(`${ELEVENLABS_API_URL}/convai/agents/${agentId}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  return (await response.json()) as ElevenLabsAgentConfig;
}

