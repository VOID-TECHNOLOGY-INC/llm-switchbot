import { 
  harmonyToolsSchema, 
  validateToolCall, 
  createToolResponse,
  HARMONY_TOOLS 
} from '../schema';

describe('Harmony Tools Schema', () => {
  describe('harmonyToolsSchema', () => {
    it('should contain required tool definitions', () => {
      expect(harmonyToolsSchema).toBeDefined();
      expect(harmonyToolsSchema.tools).toBeInstanceOf(Array);
      expect(harmonyToolsSchema.tools.length).toBeGreaterThan(0);
      
      // 必須ツールの存在確認
      const toolNames = harmonyToolsSchema.tools.map(tool => tool.function.name);
      expect(toolNames).toContain('get_devices');
      expect(toolNames).toContain('get_device_status');
      expect(toolNames).toContain('send_command');
      expect(toolNames).toContain('get_scenes');
      expect(toolNames).toContain('execute_scene');
    });

    it('should have valid JSON schema for each tool', () => {
      harmonyToolsSchema.tools.forEach(tool => {
        expect(tool.type).toBe('function');
        expect(tool.function.name).toBeDefined();
        expect(tool.function.description).toBeDefined();
        
        if (tool.function.parameters) {
          expect(tool.function.parameters.type).toBe('object');
          expect(tool.function.parameters.properties).toBeDefined();
        }
      });
    });
  });

  describe('get_devices tool', () => {
    const getDevicesTool = harmonyToolsSchema.tools.find(
      tool => tool.function.name === 'get_devices'
    );

    it('should be defined correctly', () => {
      expect(getDevicesTool).toBeDefined();
      expect(getDevicesTool?.function.description).toContain('SwitchBot');
      expect(getDevicesTool?.function.description).toContain('デバイス一覧');
    });

    it('should have no required parameters', () => {
      expect(getDevicesTool?.function.parameters).toBeUndefined();
    });
  });

  describe('send_command tool', () => {
    const sendCommandTool = harmonyToolsSchema.tools.find(
      tool => tool.function.name === 'send_command'
    );

    it('should be defined correctly', () => {
      expect(sendCommandTool).toBeDefined();
      expect(sendCommandTool?.function.description).toContain('コマンド');
      expect(sendCommandTool?.function.description).toContain('デバイス');
    });

    it('should have required parameters', () => {
      const params = sendCommandTool?.function.parameters;
      expect(params?.properties).toHaveProperty('deviceId');
      expect(params?.properties).toHaveProperty('command');
      expect(params?.required).toContain('deviceId');
      expect(params?.required).toContain('command');
    });

    it('should have optional parameter field', () => {
      const params = sendCommandTool?.function.parameters;
      expect(params?.properties).toHaveProperty('parameter');
      expect(params?.required).not.toContain('parameter');
    });
  });

  describe('validateToolCall', () => {
    it('should validate correct tool calls', () => {
      const validCall = {
        name: 'get_devices',
        arguments: {}
      };
      
      const result = validateToolCall(validCall);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate tool calls with parameters', () => {
      const validCall = {
        name: 'send_command',
        arguments: {
          deviceId: 'device-123',
          command: 'turnOn',
          parameter: { temperature: 25 }
        }
      };
      
      const result = validateToolCall(validCall);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid tool names', () => {
      const invalidCall = {
        name: 'invalid_tool',
        arguments: {}
      };
      
      const result = validateToolCall(invalidCall);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unknown tool: invalid_tool');
    });

    it('should reject missing required parameters', () => {
      const invalidCall = {
        name: 'send_command',
        arguments: {
          command: 'turnOn'
          // deviceId missing
        }
      };
      
      const result = validateToolCall(invalidCall);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('deviceId'))).toBe(true);
    });

    it('should reject invalid parameter types', () => {
      const invalidCall = {
        name: 'send_command',
        arguments: {
          deviceId: 123, // should be string
          command: 'turnOn'
        }
      };
      
      const result = validateToolCall(invalidCall);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('deviceId'))).toBe(true);
    });
  });

  describe('createToolResponse', () => {
    it('should create success response', () => {
      const response = createToolResponse(
        'get_devices',
        { success: true, data: [] },
        'success'
      );
      
      expect(response.tool_name).toBe('get_devices');
      expect(response.status).toBe('success');
      expect(response.result).toEqual({ success: true, data: [] });
      expect(response.timestamp).toBeDefined();
    });

    it('should create error response', () => {
      const response = createToolResponse(
        'send_command',
        null,
        'error',
        'Device not found'
      );
      
      expect(response.tool_name).toBe('send_command');
      expect(response.status).toBe('error');
      expect(response.error_message).toBe('Device not found');
      expect(response.result).toBeNull();
    });

    it('should include execution time', () => {
      const response = createToolResponse(
        'get_devices',
        { data: [] },
        'success',
        undefined,
        150
      );
      
      expect(response.execution_time_ms).toBe(150);
    });
  });

  describe('HARMONY_TOOLS constant', () => {
    it('should provide easy access to tool names', () => {
      expect(HARMONY_TOOLS.GET_DEVICES).toBe('get_devices');
      expect(HARMONY_TOOLS.SEND_COMMAND).toBe('send_command');
      expect(HARMONY_TOOLS.GET_SCENES).toBe('get_scenes');
      expect(HARMONY_TOOLS.EXECUTE_SCENE).toBe('execute_scene');
    });
  });
});
