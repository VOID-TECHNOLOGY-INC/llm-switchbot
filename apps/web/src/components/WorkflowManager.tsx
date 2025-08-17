'use client';

import React, { useState, useEffect } from 'react';
import { AutomationRule, RuleExecution } from '@llm-switchbot/shared';
import clsx from 'clsx';

interface WorkflowManagerProps {
  onRuleUpdated?: () => void;
}

export function WorkflowManager({ onRuleUpdated }: WorkflowManagerProps) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [executionHistory, setExecutionHistory] = useState<RuleExecution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/workflow/rules');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ルールの取得に失敗しました');
      }

      setRules(data.rules || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/workflow/rules/${ruleId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ルールの切り替えに失敗しました');
      }

      await fetchRules();
      onRuleUpdated?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'エラーが発生しました');
    }
  };

  const handleExecuteRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/workflow/rules/${ruleId}/execute`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ルールの実行に失敗しました');
      }

      await fetchRules();
      if (selectedRule?.id === ruleId) {
        await fetchExecutionHistory(ruleId);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'エラーが発生しました');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('このルールを削除しますか？')) return;

    try {
      const response = await fetch(`/api/workflow/rules/${ruleId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ルールの削除に失敗しました');
      }

      await fetchRules();
      if (selectedRule?.id === ruleId) {
        setSelectedRule(null);
        setExecutionHistory([]);
      }
      onRuleUpdated?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'エラーが発生しました');
    }
  };

  const fetchExecutionHistory = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/workflow/rules/${ruleId}/history`);
      const data = await response.json();

      if (response.ok) {
        setExecutionHistory(data.history || []);
      }
    } catch (error) {
      console.error('実行履歴の取得に失敗:', error);
    }
  };

  const handleRuleSelect = async (rule: AutomationRule) => {
    setSelectedRule(rule);
    await fetchExecutionHistory(rule.id);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      success: 'bg-green-100 text-green-800',
      failure: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800'
    };
    
    const labels = {
      success: '成功',
      failure: '失敗',
      partial: '部分的'
    };

    return (
      <span className={clsx('px-2 py-1 text-xs font-medium rounded-full', badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800')}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          ⚙️ 自動化ルール管理
        </h2>
        <button
          onClick={fetchRules}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
        >
          🔄 更新
        </button>
      </div>

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

      {rules.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-4">🤖</div>
          <p>まだ自動化ルールがありません</p>
          <p className="text-sm">上記のワークフロー作成から始めてください</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ルール一覧 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">📋 ルール一覧</h3>
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={clsx(
                    'p-4 border rounded-lg cursor-pointer transition-colors',
                    {
                      'border-blue-300 bg-blue-50': selectedRule?.id === rule.id,
                      'border-gray-200 hover:border-gray-300': selectedRule?.id !== rule.id
                    }
                  )}
                  onClick={() => handleRuleSelect(rule)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{rule.name}</h4>
                    <div className="flex items-center space-x-2">
                      {rule.isEnabled ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          有効
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          無効
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>実行回数: {rule.executionCount}回</span>
                    {rule.lastExecuted && (
                      <span>最終実行: {formatDate(rule.lastExecuted)}</span>
                    )}
                  </div>
                  
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleRule(rule.id, !rule.isEnabled);
                      }}
                      className={clsx(
                        'px-3 py-1 text-xs rounded transition-colors',
                        {
                          'bg-red-100 text-red-700 hover:bg-red-200': rule.isEnabled,
                          'bg-green-100 text-green-700 hover:bg-green-200': !rule.isEnabled
                        }
                      )}
                    >
                      {rule.isEnabled ? '無効化' : '有効化'}
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExecuteRule(rule.id);
                      }}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      実行
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRule(rule.id);
                      }}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ルール詳細・実行履歴 */}
          <div>
            {selectedRule ? (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  📊 {selectedRule.name} - 実行履歴
                </h3>
                
                {executionHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-2xl mb-2">📈</div>
                    <p>実行履歴がありません</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {executionHistory.map((execution) => (
                      <div key={execution.id} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {formatDate(execution.executedAt)}
                          </span>
                          {getStatusBadge(execution.status)}
                        </div>
                        
                        {execution.results.length > 0 && (
                          <div className="text-xs text-gray-600">
                            <div className="font-medium mb-1">実行結果:</div>
                            {execution.results.map((result, index) => (
                              <div key={index} className="ml-2">
                                アクション{index + 1}: {result.status}
                                {result.error && (
                                  <span className="text-red-600"> - {result.error}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-2xl mb-2">👈</div>
                <p>ルールを選択してください</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
