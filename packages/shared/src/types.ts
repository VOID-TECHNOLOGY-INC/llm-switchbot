// SwitchBot Device Types
export interface Device {
  id: string;
  type: string;
  name: string;
  room?: string;
  capabilities: string[];
  lastStatus?: any;
  updatedAt: Date;
}

export interface SwitchBotDevice {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  enableCloudService: boolean;
  hubDeviceId: string;
}

export interface DeviceStatus {
  deviceId: string;
  deviceType: string;
  hubDeviceId: string;
  [key: string]: any; // デバイス固有のステータス情報
}

// Scene Types
export interface Scene {
  id: string;
  name: string;
  actions: any[];
  createdAt: Date;
}

export interface SwitchBotScene {
  sceneId: string;
  sceneName: string;
}

// Event Types
export interface Event {
  id: string;
  deviceId: string;
  deviceType: string;
  eventType: string;
  payload: any;
  receivedAt: Date;
}

// User Settings
export interface UserSetting {
  id: string;
  targetIlluminance?: number;
  sleepSchedule?: {
    start: string;
    end: string;
  };
  presence?: boolean;
}

// API Request/Response Types
export interface ChatRequest {
  messages: ChatMessage[];
  toolsAllowed: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatResponse {
  reply: string;
  toolCalls?: ToolCall[];
}

export interface CommandRequest {
  deviceId: string;
  command: string;
  parameter?: any;
  commandType?: string;
}

export interface CommandResponse {
  requestId: string;
  statusCode: number;
  message: string;
}

// SwitchBot API Response Types
export interface SwitchBotApiResponse<T = any> {
  statusCode: number;
  message: string;
  body?: T;
}

export interface DevicesResponse {
  deviceList: SwitchBotDevice[];
  infraredRemoteList: any[];
}

// Webhook Types
export interface WebhookEvent {
  deviceType: string;
  eventType: string;
  payload: any;
}

// Error Types
export interface ApiError {
  statusCode: number;
  message: string;
  details?: any;
}
