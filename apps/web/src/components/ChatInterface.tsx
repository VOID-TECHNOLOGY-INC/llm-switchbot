'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChatMessage } from '@llm-switchbot/shared'
import { PaperAirplaneIcon, UserIcon, CpuChipIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface ChatInterfaceProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isLoading?: boolean
}

export function ChatInterface({ messages, onSendMessage, isLoading = false }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
              isLoading && 'bg-gray-100 cursor-not-allowed'
            )}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className={clsx(
              'px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors',
              (isLoading || !inputValue.trim()) && 'bg-gray-300 cursor-not-allowed hover:bg-gray-300'
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
