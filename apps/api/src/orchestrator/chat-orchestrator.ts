import { SwitchBotClient } from '@llm-switchbot/switchbot-adapter';
import { 
  harmonyToolsSchema, 
  validateToolCall, 
  createToolResponse,
  HARMONY_TOOLS,
  type HarmonyToolsSchema,
  type ToolResponse,
  LLMFactory,
  LLMAdapter,
  LLMRequest
} from '@llm-switchbot/harmony-tools';

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls?: ToolCall[];
}

export interface ChatResponse {
  role: 'assistant';
  content: string;
  tool_calls?: ToolCall[];
}

export interface ChatProcessResult {
  response: ChatResponse;
  toolResults: ToolResponse[];
}

/**
 * チャット処理とツール呼び出しを統合管理するオーケストレーター
 */
export class ChatOrchestrator {
  private switchBotClient: SwitchBotClient;
  private llmAdapter: LLMAdapter | null = null;

  constructor(switchBotClient: SwitchBotClient, llmAdapter?: LLMAdapter) {
    this.switchBotClient = switchBotClient;
    this.llmAdapter = llmAdapter || null;
  }

  /**
   * 利用可能なツールスキーマを取得
   */
  getToolsSchema(): HarmonyToolsSchema {
    return harmonyToolsSchema;
  }

  /**
   * 単一のツール呼び出しを処理
   */
  async processToolCall(toolCall: ToolCall): Promise<ToolResponse> {
    const startTime = Date.now();
    
    try {
      // 引数のパース
      let parsedArgs: any;
      try {
        parsedArgs = JSON.parse(toolCall.function.arguments);
      } catch (error) {
        return createToolResponse(
          toolCall.function.name,
          null,
          'error',
          `Invalid JSON arguments: ${error instanceof Error ? error.message : 'Unknown error'}`,
          Date.now() - startTime
        );
      }

      // ツール呼び出しの妥当性検証
      const validation = validateToolCall({
        name: toolCall.function.name,
        arguments: parsedArgs
      });

      if (!validation.isValid) {
        return createToolResponse(
          toolCall.function.name,
          null,
          'error',
          validation.errors.join(', '),
          Date.now() - startTime
        );
      }

      // ツール実行
      const result = await this.executeToolCall(toolCall.function.name, parsedArgs);
      
      return createToolResponse(
        toolCall.function.name,
        result,
        'success',
        undefined,
        Date.now() - startTime
      );

    } catch (error) {
      return createToolResponse(
        toolCall.function.name,
        null,
        'error',
        error instanceof Error ? error.message : 'Unknown error occurred',
        Date.now() - startTime
      );
    }
  }

  /**
   * 実際のツール実行
   */
  private async executeToolCall(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case HARMONY_TOOLS.GET_DEVICES:
        return await this.switchBotClient.getDevices();

      case HARMONY_TOOLS.GET_DEVICE_STATUS:
        return await this.switchBotClient.getDeviceStatus(args.deviceId);

      case HARMONY_TOOLS.SEND_COMMAND:
        return await this.switchBotClient.sendCommand(
          args.deviceId,
          args.command,
          args.parameter
        );

      case HARMONY_TOOLS.GET_SCENES:
        return await this.switchBotClient.getScenes();

      case HARMONY_TOOLS.EXECUTE_SCENE:
        return await this.switchBotClient.executeScene(args.sceneId);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * チャットメッセージを処理し、必要に応じてツール呼び出しを実行
   */
  async processChat(
    messages: ChatMessage[], 
    enableTools: boolean = false
  ): Promise<ChatProcessResult> {
    const toolResults: ToolResponse[] = [];

    // LLMアダプターが利用可能な場合は実際のLLMを使用
    if (this.llmAdapter) {
      try {
        const llmRequest: LLMRequest = {
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          tools: enableTools ? harmonyToolsSchema.tools : undefined,
          temperature: 0.7,
          max_tokens: 1000
        };

        const llmResponse = await this.llmAdapter.chat(llmRequest);
        
        // ツール呼び出しの処理
        if (llmResponse.tool_calls && llmResponse.tool_calls.length > 0) {
          for (const toolCall of llmResponse.tool_calls) {
            const toolResult = await this.processToolCall(toolCall);
            toolResults.push(toolResult);
          }
        }

        const response: ChatResponse = {
          role: 'assistant',
          content: llmResponse.content,
          tool_calls: llmResponse.tool_calls
        };

        return {
          response,
          toolResults
        };

      } catch (error) {
        console.error('LLM処理エラー:', error);
        // フォールバック: デモモード
        return this.processChatDemo(messages, enableTools);
      }
    }

    // LLMアダプターが利用できない場合はデモモード
    return this.processChatDemo(messages, enableTools);
  }

  /**
   * デモモードでのチャット処理
   */
  private async processChatDemo(
    messages: ChatMessage[], 
    enableTools: boolean = false
  ): Promise<ChatProcessResult> {
    const toolResults: ToolResponse[] = [];

    if (enableTools && this.shouldUseTool(messages)) {
      const lastMessage = messages[messages.length - 1];
      const toolCall = this.generateMockToolCall(lastMessage.content);
      
      if (toolCall) {
        const toolResult = await this.processToolCall(toolCall);
        toolResults.push(toolResult);
      }
    }

    const response: ChatResponse = {
      role: 'assistant',
      content: this.generateMockResponse(messages, toolResults)
    };

    return {
      response,
      toolResults
    };
  }

  /**
   * ツールを使用すべきかどうかを判定（デモ用の簡単な実装）
   */
  private shouldUseTool(messages: ChatMessage[]): boolean {
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage.content.toLowerCase();
    
    return content.includes('デバイス') || 
           content.includes('一覧') || 
           content.includes('状態') ||
           content.includes('つけて') ||
           content.includes('消して') ||
           content.includes('シーン');
  }

  /**
   * モックツール呼び出しを生成（デモ用）
   */
  private generateMockToolCall(content: string): ToolCall | null {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('デバイス') || lowerContent.includes('一覧')) {
      return {
        id: `call-${Date.now()}`,
        type: 'function',
        function: {
          name: 'get_devices',
          arguments: '{}'
        }
      };
    }
    
    if (lowerContent.includes('つけて') || lowerContent.includes('オン')) {
      return {
        id: `call-${Date.now()}`,
        type: 'function',
        function: {
          name: 'send_command',
          arguments: JSON.stringify({
            deviceId: 'demo-device-1',
            command: 'turnOn'
          })
        }
      };
    }

    return null;
  }

  /**
   * モック応答を生成（デモ用）
   */
  private generateMockResponse(messages: ChatMessage[], toolResults: ToolResponse[]): string {
    if (toolResults.length === 0) {
      return 'デモモードです。「デバイス一覧を教えて」「エアコンをつけて」などと話しかけてツール機能をお試しください。';
    }

    const lastResult = toolResults[toolResults.length - 1];
    
    if (lastResult.tool_name === 'get_devices') {
      if (lastResult.status === 'success') {
        const deviceCount = lastResult.result?.body?.deviceList?.length || 0;
        return `デバイス一覧を取得しました。現在${deviceCount}個のデバイスが利用可能です。`;
      } else {
        return `デバイス一覧の取得中にエラーが発生しました: ${lastResult.error_message}`;
      }
    }
    
    if (lastResult.tool_name === 'send_command') {
      if (lastResult.status === 'success') {
        return 'デバイスコマンドを実行しました。操作が完了しています。';
      } else {
        return `デバイス操作中にエラーが発生しました: ${lastResult.error_message}`;
      }
    }

    return `${lastResult.tool_name}を実行しました。ステータス: ${lastResult.status}`;
  }
}
