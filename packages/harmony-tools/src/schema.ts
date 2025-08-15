/**
 * Harmony ツール定義スキーマ（gpt-oss用）
 */

// Harmony format tool definitions
export interface HarmonyTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters?: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface HarmonyToolsSchema {
  tools: HarmonyTool[];
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface ToolValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ToolResponse {
  tool_name: string;
  status: 'success' | 'error';
  result: any;
  error_message?: string;
  timestamp: string;
  execution_time_ms?: number;
}

export const HARMONY_TOOLS = {
  GET_DEVICES: 'get_devices',
  GET_DEVICE_STATUS: 'get_device_status',
  SEND_COMMAND: 'send_command',
  GET_SCENES: 'get_scenes',
  EXECUTE_SCENE: 'execute_scene'
} as const;

export const harmonyToolsSchema: HarmonyToolsSchema = {
  tools: [
    {
      type: 'function',
      function: {
        name: HARMONY_TOOLS.GET_DEVICES,
        description: 'SwitchBotデバイス一覧を取得します。利用可能な全てのデバイス（Bot、センサー、ハブなど）の情報を返します。'
      }
    },
    {
      type: 'function',
      function: {
        name: HARMONY_TOOLS.GET_DEVICE_STATUS,
        description: '指定されたSwitchBotデバイスの現在の状態を取得します。温度、湿度、電源状態、バッテリー残量などの情報を含みます。',
        parameters: {
          type: 'object',
          properties: {
            deviceId: {
              type: 'string',
              description: 'デバイスの一意識別子'
            }
          },
          required: ['deviceId']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: HARMONY_TOOLS.SEND_COMMAND,
        description: 'SwitchBotデバイスにコマンドを送信して操作を実行します。電源のオン/オフ、ボタンプレス、設定変更などが可能です。',
        parameters: {
          type: 'object',
          properties: {
            deviceId: {
              type: 'string',
              description: 'コマンドを送信するデバイスの一意識別子'
            },
            command: {
              type: 'string',
              description: '実行するコマンド（turnOn, turnOff, press, setMode など）'
            },
            parameter: {
              type: ['object', 'string', 'number', 'null'],
              description: 'コマンドの追加パラメータ（温度設定、モード指定など）'
            }
          },
          required: ['deviceId', 'command']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: HARMONY_TOOLS.GET_SCENES,
        description: 'SwitchBotアプリで作成されたシーン一覧を取得します。複数デバイスの連携操作が定義されています。',
      }
    },
    {
      type: 'function',
      function: {
        name: HARMONY_TOOLS.EXECUTE_SCENE,
        description: '指定されたシーンを実行します。シーンには複数のデバイス操作が含まれ、一括で実行されます。',
        parameters: {
          type: 'object',
          properties: {
            sceneId: {
              type: 'string',
              description: '実行するシーンの一意識別子'
            }
          },
          required: ['sceneId']
        }
      }
    }
  ]
};

/**
 * ツール呼び出しの妥当性を検証
 */
export function validateToolCall(toolCall: ToolCall): ToolValidationResult {
  const errors: string[] = [];
  
  // ツール名の検証
  const tool = harmonyToolsSchema.tools.find(t => t.function.name === toolCall.name);
  if (!tool) {
    errors.push(`Unknown tool: ${toolCall.name}`);
    return { isValid: false, errors };
  }
  
  // パラメータの検証
  if (tool.function.parameters) {
    const { properties, required = [] } = tool.function.parameters;
    
    // 必須パラメータの確認
    for (const requiredParam of required) {
      if (!(requiredParam in toolCall.arguments)) {
        errors.push(`Missing required parameter: ${requiredParam}`);
      }
    }
    
    // パラメータの型検証
    for (const [paramName, paramValue] of Object.entries(toolCall.arguments)) {
      if (properties[paramName]) {
        const expectedType = properties[paramName].type;
        const actualType = Array.isArray(paramValue) ? 'array' : typeof paramValue;
        
        if (Array.isArray(expectedType)) {
          // 複数の型が許可されている場合
          if (!expectedType.includes(actualType) && !(actualType === 'object' && paramValue === null && expectedType.includes('null'))) {
            errors.push(`Parameter ${paramName} has incorrect type. Expected: ${expectedType.join('|')}, got: ${actualType}`);
          }
        } else if (expectedType !== actualType) {
          // 単一の型の場合
          if (!(expectedType === 'null' && paramValue === null)) {
            errors.push(`Parameter ${paramName} has incorrect type. Expected: ${expectedType}, got: ${actualType}`);
          }
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * ツール実行結果のレスポンスを生成
 */
export function createToolResponse(
  toolName: string,
  result: any,
  status: 'success' | 'error',
  errorMessage?: string,
  executionTimeMs?: number
): ToolResponse {
  return {
    tool_name: toolName,
    status,
    result,
    error_message: errorMessage,
    timestamp: new Date().toISOString(),
    execution_time_ms: executionTimeMs
  };
}

// Legacy schema for backwards compatibility
export const SWITCHBOT_TOOLS_SCHEMA = {
  "tools": [
    {
      "name": "get_devices",
      "description": "Get list of available SwitchBot devices",
      "input_schema": {
        "type": "object",
        "properties": {},
        "additionalProperties": false
      }
    },
    {
      "name": "get_status",
      "description": "Get current status of a specific device",
      "input_schema": {
        "type": "object",
        "properties": {
          "deviceId": {
            "type": "string",
            "description": "The ID of the device to get status for"
          }
        },
        "required": ["deviceId"],
        "additionalProperties": false
      }
    },
    {
      "name": "send_command",
      "description": "Send a command to a device (turn on/off, press, set mode, etc.)",
      "input_schema": {
        "type": "object",
        "properties": {
          "deviceId": {
            "type": "string",
            "description": "The ID of the device to send command to"
          },
          "command": {
            "type": "string", 
            "description": "The command to send (e.g., 'turnOn', 'turnOff', 'press', 'setMode')"
          },
          "parameter": {
            "type": ["string", "object", "null"],
            "description": "Additional parameters for the command (optional)"
          },
          "commandType": {
            "type": ["string", "null"],
            "description": "Type of command (optional, defaults to 'command')"
          }
        },
        "required": ["deviceId", "command"],
        "additionalProperties": false
      }
    },
    {
      "name": "get_scenes",
      "description": "Get list of available scenes",
      "input_schema": {
        "type": "object",
        "properties": {},
        "additionalProperties": false
      }
    },
    {
      "name": "exec_scene",
      "description": "Execute a specific scene",
      "input_schema": {
        "type": "object",
        "properties": {
          "sceneId": {
            "type": "string",
            "description": "The ID of the scene to execute"
          }
        },
        "required": ["sceneId"],
        "additionalProperties": false
      }
    }
  ]
};

// TypeScript型定義
export interface HarmonyToolCall {
  name: string;
  arguments: any;
}

export interface GetDevicesArgs {
  // 引数なし
}

export interface GetStatusArgs {
  deviceId: string;
}

export interface SendCommandArgs {
  deviceId: string;
  command: string;
  parameter?: any;
  commandType?: string;
}

export interface GetScenesArgs {
  // 引数なし
}

export interface ExecSceneArgs {
  sceneId: string;
}

export type ToolArgs = 
  | GetDevicesArgs
  | GetStatusArgs 
  | SendCommandArgs
  | GetScenesArgs
  | ExecSceneArgs;
