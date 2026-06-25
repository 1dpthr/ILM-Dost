// Ollama AI Integration for Local AI Models

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

interface OllamaConfig {
  baseUrl: string;
  model: string;
  systemPrompt: string;
}

class OllamaClient {
  private config: OllamaConfig;

  constructor(config?: Partial<OllamaConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || 'http://localhost:11434',
      model: config?.model || 'llama3.2',
      systemPrompt: config?.systemPrompt || this.getDefaultSystemPrompt(),
    };
  }

  private getDefaultSystemPrompt(): string {
    return `You are an AI learning assistant for "Ilm Dost" (Knowledge Friend), an educational platform.

Your role:
- Help students with study recommendations and academic questions
- Explain complex concepts in simple terms
- Create personalized study plans based on student data
- Provide encouragement and motivation
- Answer subject-specific questions (Math, Science, English, etc.)

Guidelines:
- Be encouraging and supportive
- Provide clear, concise explanations
- Use examples when explaining concepts
- Tailor responses to student's level
- Keep responses under 200 words unless asked for details
- Use bullet points for lists
- Be patient and never judgmental

Student context will be provided in the conversation.`;
  }

  async chat(userMessage: string, conversationHistory?: OllamaMessage[]): Promise<string> {
    try {
      const messages: OllamaMessage[] = [
        { role: 'system', content: this.config.systemPrompt },
        ...(conversationHistory || []),
        { role: 'user', content: userMessage },
      ];

      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();
      return data.message.content;
    } catch (error) {
      console.error('Ollama chat error:', error);
      throw error;
    }
  }

  async *chatStream(userMessage: string, conversationHistory?: OllamaMessage[]): AsyncGenerator<string> {
    try {
      const messages: OllamaMessage[] = [
        { role: 'system', content: this.config.systemPrompt },
        ...(conversationHistory || []),
        { role: 'user', content: userMessage },
      ];

      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.message?.content) {
                yield data.message.content;
              }
            } catch (e) {
              console.error('Error parsing stream line:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Ollama stream error:', error);
      throw error;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error('Error listing models:', error);
      return [];
    }
  }

  setModel(model: string) {
    this.config.model = model;
  }

  getModel(): string {
    return this.config.model;
  }
}

// Singleton instance
export const ollamaClient = new OllamaClient();

// Export for custom configurations
export { OllamaClient, type OllamaMessage, type OllamaConfig };
