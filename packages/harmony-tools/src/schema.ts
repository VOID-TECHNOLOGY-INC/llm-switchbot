/**
 * Harmony ツール定義スキーマ（gpt-oss用）
 */

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
