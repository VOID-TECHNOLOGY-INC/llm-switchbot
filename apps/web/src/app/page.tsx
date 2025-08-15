'use client'

import { useState } from 'react'
import { ChatInterface } from '@/components/ChatInterface'
import { DeviceCard } from '@/components/DeviceCard'
import { ChatMessage, Device } from '@llm-switchbot/shared'
import { HomeIcon, CpuChipIcon } from '@heroicons/react/24/outline'

// モックデータ（実際の実装では API から取得）
const mockDevices: Device[] = [
  {
    id: 'device-1',
    type: 'Bot',
    name: 'リビング スイッチ',
    room: 'リビング',
    capabilities: ['turnOn', 'turnOff', 'press'],
    lastStatus: {
      power: 'off',
      battery: 85,
      online: true
    },
    updatedAt: new Date('2023-12-01T10:00:00Z')
  },
  {
    id: 'sensor-1',
    type: 'WoIOSensor',
    name: 'リビング センサー',
    room: 'リビング',
    capabilities: ['getStatus'],
    lastStatus: {
      temperature: 25.5,
      humidity: 60,
      lightLevel: 750,
      online: true
    },
    updatedAt: new Date('2023-12-01T10:05:00Z')
  }
]

const initialMessages: ChatMessage[] = [
  {
    role: 'assistant',
    content: 'こんにちは！スマートホームの操作をお手伝いします。「エアコンをつけて」「照明を暗くして」などと話しかけてください。'
  }
]

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [devices] = useState<Device[]>(mockDevices)
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (message: string) => {
    // ユーザーメッセージを追加
    const userMessage: ChatMessage = {
      role: 'user',
      content: message
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // TODO: 実際のAPI呼び出しを実装
      // const response = await fetch('/api/chat', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ messages: [...messages, userMessage], toolsAllowed: true })
      // })
      // const data = await response.json()

      // モック応答
      await new Promise(resolve => setTimeout(resolve, 1500)) // 応答遅延をシミュレート
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: 'デモモードです。実際のデバイス操作はAPIサーバーが完成次第利用できます。',
        toolCalls: message.includes('つけて') || message.includes('オン') ? [
          {
            id: 'call-1',
            type: 'function',
            function: {
              name: 'send_command',
              arguments: JSON.stringify({
                deviceId: 'device-1',
                command: 'turnOn'
              })
            }
          }
        ] : undefined
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('チャット送信エラー:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'エラーが発生しました。もう一度お試しください。'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeviceCommand = async (deviceId: string, command: string, parameter?: any) => {
    console.log('デバイスコマンド:', { deviceId, command, parameter })
    
    try {
      // TODO: 実際のAPI呼び出しを実装
      // const response = await fetch('/api/switchbot/command', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ deviceId, command, parameter })
      // })
      // const result = await response.json()

      // モック実装
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 成功メッセージをチャットに追加
      const device = devices.find(d => d.id === deviceId)
      const message: ChatMessage = {
        role: 'assistant',
        content: `${device?.name}の${command}コマンドを実行しました。（デモモード）`
      }
      
      setMessages(prev => [...prev, message])
    } catch (error) {
      console.error('デバイスコマンドエラー:', error)
    }
  }

  return (
    <div className="h-screen max-h-screen flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <HomeIcon className="w-6 h-6 text-primary-500" />
            <h1 className="text-xl font-bold text-gray-900">RoomSense GPT</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CpuChipIcon className="w-4 h-4" />
            <span>AI-Powered Smart Home Control</span>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="flex-1 flex min-h-0">
        {/* サイドバー - デバイス一覧 */}
        <aside className="w-80 bg-white border-r p-4 overflow-y-auto scrollbar-thin">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">デバイス</h2>
          <div className="space-y-4">
            {devices.map(device => (
              <DeviceCard
                key={device.id}
                device={device}
                onCommand={handleDeviceCommand}
                isLoading={isLoading}
              />
            ))}
          </div>
        </aside>

        {/* メインエリア - チャット */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}
