'use client';

import React, { useState } from 'react';
import { AutomationWorkflow, AutomationRule } from '@llm-switchbot/shared';
import clsx from 'clsx';

interface WorkflowCreatorProps {
  onWorkflowSaved?: (rule: AutomationRule) => void;
}

export function WorkflowCreator({ onWorkflowSaved }: WorkflowCreatorProps) {
  const [naturalLanguage, setNaturalLanguage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [workflow, setWorkflow] = useState<AutomationWorkflow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!naturalLanguage.trim()) {
      setError('ワークフローの内容を入力してください');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/workflow/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          naturalLanguage: naturalLanguage,
          userId: 'default-user'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ワークフローの解析に失敗しました');
      }

      setWorkflow(data.workflow);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'エラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!workflow) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/workflow/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workflow }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ワークフローの保存に失敗しました');
      }

      onWorkflowSaved?.(data.rule);
      setWorkflow(null);
      setNaturalLanguage('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'エラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setWorkflow(null);
    setNaturalLanguage('');
    setError(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        🤖 自動化ワークフロー作成
      </h2>

      {/* 自然言語入力 */}
      <div className="mb-6">
        <label htmlFor="workflow-input" className="block text-sm font-medium text-gray-700 mb-2">
          どのような自動化をしたいか教えてください
        </label>
        <textarea
          id="workflow-input"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="例：朝6時くらいに部屋が暑かったらエアコンをつけておいてください"
          value={naturalLanguage}
          onChange={(e) => setNaturalLanguage(e.target.value)}
          disabled={isProcessing}
        />
        
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleParse}
            disabled={isProcessing || !naturalLanguage.trim()}
            className={clsx(
              'px-4 py-2 rounded-md font-medium transition-colors',
              {
                'bg-blue-600 text-white hover:bg-blue-700': !isProcessing && naturalLanguage.trim(),
                'bg-gray-300 text-gray-500 cursor-not-allowed': isProcessing || !naturalLanguage.trim()
              }
            )}
          >
            {isProcessing ? '解析中...' : '📝 ワークフローを解析'}
          </button>
          
          {workflow && (
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              🔄 リセット
            </button>
          )}
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="text-red-400">⚠️</div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">エラー</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* 解析結果表示 */}
      {workflow && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="text-lg font-medium text-green-800 mb-3">
            ✅ ワークフロー解析結果
          </h3>
          
          <div className="space-y-4">
            {/* ルール情報 */}
            <div>
              <h4 className="font-medium text-gray-900">📋 ルール名</h4>
              <p className="text-gray-700">{workflow.parsedRule.name}</p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900">📝 説明</h4>
              <p className="text-gray-700">{workflow.parsedRule.description}</p>
            </div>

            {/* 条件 */}
            {workflow.parsedRule.conditions.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900">🔍 実行条件</h4>
                <ul className="mt-2 space-y-1">
                  {workflow.parsedRule.conditions.map((condition, index) => (
                    <li key={index} className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded">
                      <span className="font-medium">{getConditionTypeLabel(condition.type)}:</span>{' '}
                      {getConditionDescription(condition)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* アクション */}
            {workflow.parsedRule.actions.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900">⚡ 実行アクション</h4>
                <ul className="mt-2 space-y-1">
                  {workflow.parsedRule.actions.map((action, index) => (
                    <li key={index} className="text-sm text-gray-600 bg-blue-100 px-3 py-2 rounded">
                      <span className="font-medium">{getActionTypeLabel(action.type)}:</span>{' '}
                      {getActionDescription(action)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* スケジュール */}
            {workflow.parsedRule.schedule && (
              <div>
                <h4 className="font-medium text-gray-900">⏰ スケジュール</h4>
                <p className="text-sm text-gray-600 bg-yellow-100 px-3 py-2 rounded">
                  {getScheduleDescription(workflow.parsedRule.schedule)}
                </p>
              </div>
            )}

            {/* 信頼度 */}
            <div>
              <h4 className="font-medium text-gray-900">📊 解析信頼度</h4>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${workflow.confidence * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600">
                  {(workflow.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* 提案 */}
            {workflow.suggestedModifications && workflow.suggestedModifications.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900">💡 改善提案</h4>
                <ul className="mt-2 space-y-1">
                  {workflow.suggestedModifications.map((suggestion, index) => (
                    <li key={index} className="text-sm text-orange-700 bg-orange-100 px-3 py-2 rounded">
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? '保存中...' : '💾 ワークフローを保存'}
            </button>
          </div>
        </div>
      )}

      {/* 使用例 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h3 className="text-sm font-medium text-gray-900 mb-2">💡 使用例</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• 「朝6時くらいに部屋が暑かったらエアコンをつけておいてください」</p>
          <p>• 「夜8時になったら照明を暗くしてください」</p>
          <p>• 「湿度が70%を超えたら除湿機をオンにしてください」</p>
          <p>• 「寒い日の朝にエアコンを暖房でつけてください」</p>
        </div>
      </div>
    </div>
  );
}

// ヘルパー関数
function getConditionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    time: '時刻',
    temperature: '温度',
    humidity: '湿度',
    device_state: 'デバイス状態',
    scene: 'シーン'
  };
  return labels[type] || type;
}

function getConditionDescription(condition: any): string {
  const { type, operator, value, tolerance } = condition;
  
  switch (type) {
    case 'time':
      if (operator === 'equals') return `${value}頃`;
      if (operator === 'greater_than') return `${value}以降`;
      if (operator === 'less_than') return `${value}以前`;
      if (operator === 'between' && Array.isArray(value)) return `${value[0]}～${value[1]}`;
      break;
    case 'temperature':
      const tempUnit = '°C';
      if (operator === 'greater_than') return `${value}${tempUnit}より暑い時`;
      if (operator === 'less_than') return `${value}${tempUnit}より寒い時`;
      if (operator === 'equals') return `${value}${tempUnit}の時${tolerance ? ` (±${tolerance}${tempUnit})` : ''}`;
      break;
    case 'humidity':
      if (operator === 'greater_than') return `${value}%より湿度が高い時`;
      if (operator === 'less_than') return `${value}%より湿度が低い時`;
      if (operator === 'equals') return `湿度${value}%の時${tolerance ? ` (±${tolerance}%)` : ''}`;
      break;
  }
  
  return `${operator} ${value}`;
}

function getActionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    device_control: 'デバイス操作',
    scene_execution: 'シーン実行',
    notification: '通知'
  };
  return labels[type] || type;
}

function getActionDescription(action: any): string {
  const { type, command, deviceId, message, sceneId } = action;
  
  switch (type) {
    case 'device_control':
      let deviceName = 'デバイス';
      if (deviceId === '02-202212241621-96856893') deviceName = 'エアコン';
      if (deviceId === 'F66854E650BE') deviceName = '温湿度計';
      
      let commandName = command;
      if (command === 'turnOn') commandName = 'オン';
      if (command === 'turnOff') commandName = 'オフ';
      
      return `${deviceName}を${commandName}`;
    case 'scene_execution':
      return `シーン「${sceneId}」を実行`;
    case 'notification':
      return `通知: ${message}`;
  }
  
  return `${type}`;
}

function getScheduleDescription(schedule: any): string {
  const { type, time, days, interval } = schedule;
  
  switch (type) {
    case 'daily':
      return `毎日 ${time || ''}`;
    case 'weekly':
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      const dayList = days?.map((d: number) => dayNames[d]).join('、') || '';
      return `毎週 ${dayList} ${time || ''}`;
    case 'interval':
      return `${interval}分間隔`;
    case 'once':
      return `一回のみ ${time || ''}`;
  }
  
  return type;
}
