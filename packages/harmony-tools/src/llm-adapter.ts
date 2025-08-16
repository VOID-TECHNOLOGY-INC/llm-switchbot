export interface LLMRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters?: any;
    };
  }>;
  temperature?: number;
  max_tokens?: number;
}

export interface LLMResponse {
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMAdapter {
  name: string;
  chat(request: LLMRequest): Promise<LLMResponse>;
}

// OpenAI API アダプター
export class OpenAIAdapter implements LLMAdapter {
  name = 'openai';
  
  constructor(
    private apiKey: string,
    private baseUrl: string = 'https://api.openai.com/v1',
    private model: string = 'gpt-4o-mini'
  ) {}

  async chat(request: LLMRequest): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        tools: request.tools,
        tool_choice: request.tools ? 'auto' : undefined,
        temperature: request.temperature || 0.7,
        max_tokens: request.max_tokens || 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as any;
      throw new Error(`OpenAI API Error: ${response.status} - ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json() as any;
    const choice = data.choices[0];

    return {
      content: choice.message.content || '',
      tool_calls: choice.message.tool_calls?.map((call: any) => ({
        id: call.id,
        type: call.type,
        function: {
          name: call.function.name,
          arguments: call.function.arguments,
        },
      })),
      usage: data.usage as any,
    };
  }
}

// gpt-oss アダプター（将来の実装用）
export class GPTOSSAdapter implements LLMAdapter {
  name = 'gpt-oss';
  
  constructor(
    private baseUrl: string = 'http://localhost:8000',
    private model: string = 'gpt-oss-20b'
  ) {}

  async chat(request: LLMRequest): Promise<LLMResponse> {
    // TODO: gpt-oss APIの実装
    // harmony formatでのtool calling実装
    throw new Error('gpt-oss adapter not implemented yet');
  }
}

// LLMファクトリー
export class LLMFactory {
  static create(provider: string, config: any): LLMAdapter {
    switch (provider.toLowerCase()) {
      case 'openai':
        return new OpenAIAdapter(
          config.apiKey,
          config.baseUrl,
          config.model
        );
      case 'gpt-oss':
        return new GPTOSSAdapter(
          config.baseUrl,
          config.model
        );
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
}
