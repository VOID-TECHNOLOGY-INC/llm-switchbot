import { WorkflowParserService } from '../services/workflow-parser';

describe('WorkflowParserService', () => {
  let workflowParser: WorkflowParserService;

  beforeEach(() => {
    workflowParser = new WorkflowParserService();
  });

  describe('parseWorkflow', () => {
    it('should parse air conditioner automation', async () => {
      const naturalLanguage = '朝6時くらいに部屋が暑かったらエアコンをつけておいてください';
      const userId = 'test-user';

      const workflow = await workflowParser.parseWorkflow(naturalLanguage, userId);

      expect(workflow.naturalLanguage).toBe(naturalLanguage);
      expect(workflow.parsedRule.userId).toBe(userId);
      expect(workflow.parsedRule.isEnabled).toBe(true);
      expect(workflow.parsedRule.conditions).toHaveLength(1); // 温度条件のみ（時刻はscheduleとして処理）
      expect(workflow.parsedRule.actions).toHaveLength(1); // エアコンON
      expect(workflow.parsedRule.schedule).toBeDefined();
      expect(workflow.confidence).toBeGreaterThan(0.5);
    });

    it('should parse time-based conditions', async () => {
      const naturalLanguage = '夜8時になったら照明を暗くしてください';
      const userId = 'test-user';

      const workflow = await workflowParser.parseWorkflow(naturalLanguage, userId);

      expect(workflow.parsedRule.schedule?.time).toBe('20:00');
      expect(workflow.parsedRule.actions).toHaveLength(1);
      expect(workflow.parsedRule.actions[0].command).toBe('turnOff');
      expect(workflow.parsedRule.conditions).toHaveLength(0); // 時刻条件はscheduleとして処理されるため
    });

    it('should handle temperature conditions', async () => {
      const naturalLanguage = '温度が28度以上になったらエアコンをつけて';
      const userId = 'test-user';

      const workflow = await workflowParser.parseWorkflow(naturalLanguage, userId);

      const tempCondition = workflow.parsedRule.conditions.find(c => c.type === 'temperature');
      expect(tempCondition).toBeDefined();
      expect(tempCondition?.operator).toBe('greater_than');
      expect(tempCondition?.value).toBe(28);
      expect(tempCondition?.deviceId).toBe('F66854E650BE'); // 温湿度計
    });

    it('should suggest improvements for incomplete workflows', async () => {
      const naturalLanguage = 'エアコンをつけて';
      const userId = 'test-user';

      const workflow = await workflowParser.parseWorkflow(naturalLanguage, userId);

      expect(workflow.suggestedModifications).toBeDefined();
      expect(workflow.suggestedModifications!.length).toBeGreaterThan(0);
      expect(workflow.confidence).toBeLessThan(0.8);
    });

    it('should generate appropriate rule names', async () => {
      const naturalLanguage = '寒い時にエアコンをつけてください';
      const userId = 'test-user';

      const workflow = await workflowParser.parseWorkflow(naturalLanguage, userId);

      expect(workflow.parsedRule.name).toContain('エアコン');
    });
  });
});
