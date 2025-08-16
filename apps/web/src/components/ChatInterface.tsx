'use client'

import React, { useState, useRef, useEffect } from 'react'
import { PaperAirplaneIcon, UserIcon, CpuChipIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { ChatMessage } from '../app/page'

interface ChatInterfaceProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isLoading?: boolean
}

export function ChatInterface({ messages, onSendMessage, isLoading = false }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedMessage = inputValue.trim()
    if (!trimmedMessage || isLoading) return
    
    onSendMessage(trimmedMessage)
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* チャット履歴エリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={clsx(
              'flex gap-3',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                  <CpuChipIcon className="w-5 h-5 text-white" />
                </div>
              </div>
            )}
            
            <div
              className={clsx(
                'max-w-xs lg:max-w-md px-4 py-2 rounded-lg',
                message.role === 'user'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-gray-900 border'
              )}
            >
              <p className="text-sm">{message.content}</p>
              
              {/* ツールコールの表示 */}
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mt-2 text-xs opacity-75">
                  <div className="flex items-center gap-1">
                    <CpuChipIcon className="w-3 h-3" />
                    <span>デバイス操作を実行しました</span>
                  </div>
                </div>
              )}

              {/* ツール結果の表示 */}
              {message.toolResults && message.toolResults.length > 0 && (
                <div className="mt-3 text-sm">
                  {message.toolResults.map((result: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-3 rounded border">
                      {result.tool_name === 'get_devices' && result.result?.body && (
                        <div>
                          <h4 className="font-semibold mb-2">📱 デバイス一覧</h4>
                          
                          {/* 物理デバイス */}
                          {result.result.body.deviceList && result.result.body.deviceList.length > 0 && (
                            <div className="mb-3">
                              <h5 className="font-medium text-gray-700 mb-1">🔌 物理デバイス</h5>
                              <ul className="space-y-1">
                                {result.result.body.deviceList.map((device: any) => (
                                  <li key={device.deviceId} className="text-sm">
                                    • {device.deviceName} ({device.deviceType})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* 赤外線リモート */}
                          {result.result.body.infraredRemoteList && result.result.body.infraredRemoteList.length > 0 && (
                            <div>
                              <h5 className="font-medium text-gray-700 mb-1">📺 赤外線リモート</h5>
                              <ul className="space-y-1">
                                {result.result.body.infraredRemoteList.map((remote: any) => (
                                  <li key={remote.deviceId} className="text-sm">
                                    • {remote.deviceName} ({remote.remoteType})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {result.tool_name === 'get_device_status' && result.result?.body && (
                        <div>
                          <h4 className="font-semibold mb-2">📊 デバイス状態</h4>
                          
                          {/* 温湿度計の場合 */}
                          {result.result.body.deviceType === 'MeterPlus' && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="text-red-500">🌡️</span>
                                  <span className="font-medium">温度:</span>
                                  <span className="font-bold text-red-600">{result.result.body.temperature}°C</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-500">💧</span>
                                  <span className="font-medium">湿度:</span>
                                  <span className="font-bold text-blue-600">{result.result.body.humidity}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-green-500">🔋</span>
                                  <span className="font-medium">バッテリー:</span>
                                  <span className="font-bold text-green-600">{result.result.body.battery}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">📱</span>
                                  <span className="font-medium">バージョン:</span>
                                  <span className="text-gray-600">{result.result.body.version}</span>
                                </div>
                              </div>
                              
                              {/* 快適度の評価 */}
                              <div className="mt-3 pt-3 border-t border-blue-200">
                                <div className="text-sm">
                                  <span className="font-medium text-gray-700">💭 快適度: </span>
                                  {(() => {
                                    const temp = result.result.body.temperature;
                                    const humidity = result.result.body.humidity;
                                    
                                    if (temp >= 20 && temp <= 25 && humidity >= 40 && humidity <= 60) {
                                      return <span className="text-green-600 font-bold">とても快適</span>;
                                    } else if (temp >= 18 && temp <= 28 && humidity >= 30 && humidity <= 70) {
                                      return <span className="text-yellow-600 font-bold">まあまあ快適</span>;
                                    } else {
                                      return <span className="text-red-600 font-bold">少し不快</span>;
                                    }
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* その他のデバイスの場合 */}
                          {result.result.body.deviceType !== 'MeterPlus' && (
                            <div className="bg-gray-50 p-3 rounded border">
                              <div className="text-sm space-y-1">
                                <p><span className="font-medium">デバイス:</span> {result.result.body.deviceType}</p>
                                {result.result.body.battery !== undefined && (
                                  <p><span className="font-medium">バッテリー:</span> {result.result.body.battery}%</p>
                                )}
                                {result.result.body.version && (
                                  <p><span className="font-medium">バージョン:</span> {result.result.body.version}</p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* 詳細JSON（展開可能） */}
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                              詳細データを表示
                            </summary>
                            <pre className="text-xs bg-white p-2 rounded border overflow-auto mt-1">
                              {JSON.stringify(result.result, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}

                      {result.tool_name === 'send_command' && (
                        <div>
                          <h4 className="font-semibold mb-2">⚡ コマンド実行結果</h4>
                          <p className="text-sm">
                            {result.status === 'success' ? '✅ 成功' : '❌ 失敗'}
                          </p>
                          {result.result && (
                            <pre className="text-xs bg-white p-2 rounded border mt-2 overflow-auto">
                              {JSON.stringify(result.result, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
              </div>
            )}
          </div>
        ))}
        
        {/* ローディング表示 */}
        {isLoading && (
          <div className="flex justify-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <CpuChipIcon className="w-5 h-5 text-white animate-pulse" />
              </div>
            </div>
            <div className="bg-white text-gray-900 border px-4 py-2 rounded-lg">
              <p className="text-sm text-gray-500">考え中...</p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* メッセージ入力エリア */}
      <div className="border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="デバイスを操作するメッセージを入力..."
            disabled={isLoading}
            className={clsx(
              'flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              'bg-white text-gray-900 placeholder-gray-500 shadow-sm',
              'hover:border-gray-400 focus:shadow-md transition-all duration-200',
              isLoading && 'bg-gray-100 text-gray-500 cursor-not-allowed'
            )}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className={clsx(
              'px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm',
              'active:bg-blue-800 transform active:scale-95',
              (isLoading || !inputValue.trim()) && 'bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300 transform-none'
            )}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <PaperAirplaneIcon className="w-5 h-5" />
            )}
            <span className="sr-only">送信</span>
          </button>
        </form>
      </div>
    </div>
  )
}
