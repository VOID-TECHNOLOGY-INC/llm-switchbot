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

// Automation Proposal Types
export interface AutomationEvent {
  eventType: 'deviceStateChange' | 'sensorData' | 'userAction' | 'unknown';
  deviceType: string;
  deviceId: string;
  state: any;
  timestamp: string;
  context?: {
    time?: string;
    location?: string;
    [key: string]: any;
  };
}

export interface AutomationSuggestion {
  type: 'lighting' | 'climate' | 'security' | 'comfort' | 'energy';
  description: string;
  confidence: number;
  actions: AutomationAction[];
  reasoning?: string;
}

export interface AutomationAction {
  deviceId: string;
  command: string;
  parameters: Record<string, any>;
}

export interface AutomationProposal {
  suggestions: AutomationSuggestion[];
  confidence: number;
  context: AutomationContext;
}

export interface AutomationContext {
  time: string;
  location: string;
  recentEvents: string[];
  availableDevices: string[];
  sensorData?: Record<string, any>;
}

export interface ProposalValidation {
  isValid: boolean;
  reason: string;
  issues?: string[];
}

// Automation Workflow Types
export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  schedule?: RuleSchedule;
  createdAt: string;
  updatedAt: string;
  userId: string;
  lastExecuted?: string;
  executionCount: number;
}

export interface RuleCondition {
  type: 'time' | 'temperature' | 'humidity' | 'device_state' | 'scene';
  operator: 'equals' | 'greater_than' | 'less_than' | 'between' | 'contains';
  value: any;
  deviceId?: string;
  tolerance?: number; // 許容誤差（例：温度±1度）
}

export interface RuleAction {
  type: 'device_control' | 'scene_execution' | 'notification';
  deviceId?: string;
  command?: string;
  parameters?: any;
  sceneId?: string;
  message?: string;
  delay?: number; // 遅延実行（秒）
}

export interface RuleSchedule {
  type: 'once' | 'daily' | 'weekly' | 'interval';
  time?: string; // HH:MM format
  days?: number[]; // 0=Sunday, 1=Monday, etc.
  interval?: number; // minutes for interval type
  timezone?: string;
}

export interface RuleExecution {
  id: string;
  ruleId: string;
  executedAt: string;
  status: 'success' | 'failure' | 'partial';
  results: RuleActionResult[];
  conditions: RuleConditionResult[];
}

export interface RuleActionResult {
  actionIndex: number;
  status: 'success' | 'failure' | 'skipped';
  result?: any;
  error?: string;
  executedAt: string;
}

export interface RuleConditionResult {
  conditionIndex: number;
  matched: boolean;
  actualValue: any;
  expectedValue: any;
  evaluatedAt: string;
}

export interface AutomationWorkflow {
  naturalLanguage: string;
  parsedRule: AutomationRule;
  confidence: number;
  suggestedModifications?: string[];
}

// Scene Learning Types
export interface OperationRecord {
  deviceId: string;
  command: string;
  parameters: Record<string, any>;
  timestamp: string;
  userId: string;
}

export interface OperationPattern {
  deviceId: string;
  command: string;
  parameters: Record<string, any>;
  frequency: number;
  lastUsed: string;
  timeRanges?: TimeRange[];
}

export interface TimeRange {
  start: string; // HH:MM format
  end: string;   // HH:MM format
  frequency: number;
}

export interface SequentialPattern {
  operations: OperationRecord[];
  frequency: number;
  timeWindow: number; // minutes
  confidence: number;
}

export interface TimeBasedPattern {
  timeRange: TimeRange;
  operations: OperationRecord[];
  frequency: number;
  confidence: number;
}

export interface SceneCandidate {
  name: string;
  operations: AutomationAction[];
  confidence: number;
  frequency: number;
  patternType: 'sequential' | 'time_based' | 'frequent';
  reasoning?: string;
}

export interface LearnedScene {
  id: string;
  name: string;
  operations: AutomationAction[];
  confidence: number;
  isAutoGenerated: boolean;
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
}

export interface SceneSuggestion {
  type: 'learned_scene' | 'recommended_scene';
  sceneId?: string;
  name: string;
  description: string;
  confidence: number;
  actions: AutomationAction[];
  reasoning?: string;
}

export interface SceneLearningContext {
  time: string;
  location: string;
  recentEvents: string[];
  availableDevices: string[];
  userPreferences?: Record<string, any>;
}
