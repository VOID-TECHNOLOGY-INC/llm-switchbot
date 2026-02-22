'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChatInterface } from '@/components/ChatInterface'
import { DeviceCard } from '@/components/DeviceCard'
import { WorkflowCreator } from '@/components/WorkflowCreator'
import { WorkflowManager } from '@/components/WorkflowManager'
import { Device } from '@llm-switchbot/shared'
import { HomeIcon, CpuChipIcon, CogIcon } from '@heroicons/react/24/outline'

// ChatMessage型の定義
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  toolResults?: Array<{
    tool_name: string;
    status: string;
    result: any;
    timestamp: string;
    execution_time_ms?: number;
  }>;
}

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
  const [devices, setDevices] = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'chat' | 'workflow'>('chat')

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // デバイス一覧を取得する関数
  const fetchDevices = useCallback(async () => {
    try {
      setDevicesLoading(true)
      console.log('🔄 デバイス取得開始...')
      
      const response = await fetch(`${API_BASE_URL}/api/switchbot/devices`)
      console.log('📡 API レスポンス:', response.status, response.ok)
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📄 受信データ:', data)
      
      // SwitchBotのデバイス情報をDevice型に変換
      const convertedDevices: Device[] = []
      
      // 物理デバイス
      if (data.body?.deviceList) {
        console.log(`🔌 物理デバイス: ${data.body.deviceList.length}件`)
        data.body.deviceList.forEach((device: any) => {
          const convertedDevice = {
            id: device.deviceId,
            type: device.deviceType,
            name: device.deviceName,
            room: getDeviceRoom(device.deviceType, device.deviceName),
            capabilities: getDeviceCapabilities(device.deviceType),
            lastStatus: {
              online: true,
              deviceType: device.deviceType
            },
            updatedAt: new Date()
          }
          console.log('➕ 物理デバイス追加:', convertedDevice)
          convertedDevices.push(convertedDevice)
        })
      }
      
      // 赤外線リモート
      if (data.body?.infraredRemoteList) {
        console.log(`📺 リモートデバイス: ${data.body.infraredRemoteList.length}件`)
        data.body.infraredRemoteList.forEach((remote: any) => {
          const convertedRemote = {
            id: remote.deviceId,
            type: remote.remoteType,
            name: remote.deviceName,
            room: getRemoteRoom(remote.remoteType, remote.deviceName),
            capabilities: getRemoteCapabilities(remote.remoteType),
            lastStatus: {
              online: true,
              remoteType: remote.remoteType
            },
            updatedAt: new Date()
          }
          console.log('➕ リモートデバイス追加:', convertedRemote)
          convertedDevices.push(convertedRemote)
        })
      }
      
      console.log('✅ 変換完了:', convertedDevices.length, 'デバイス')
      setDevices(convertedDevices)
    } catch (error) {
      console.error('❌ デバイス取得エラー:', error)
      console.log('🔄 モックデバイスを使用')
      // エラー時はモックデバイスを表示
      setDevices(mockDevices)
    } finally {
      setDevicesLoading(false)
      console.log('🏁 fetchDevices 完了')
    }
  }, [API_BASE_URL])

  // デバイスタイプと名前に基づいて部屋を推定
  const getDeviceRoom = (deviceType: string, deviceName: string): string => {
    // デバイス名から部屋を推定
    const name = deviceName.toLowerCase();
    
    if (name.includes('リビング') || name.includes('living')) return 'リビング';
    if (name.includes('寝室') || name.includes('bedroom')) return '寝室';
    if (name.includes('キッチン') || name.includes('kitchen')) return 'キッチン';
    if (name.includes('玄関') || name.includes('entrance')) return '玄関';
    if (name.includes('洗面') || name.includes('bathroom')) return '洗面所';
    
    // デバイスタイプに基づくデフォルト部屋
    switch (deviceType) {
      case 'Hub Mini':
        return 'ホーム'; // ハブは中央管理的な位置
      case 'MeterPlus':
        return 'リビング'; // 温湿度計は通常リビングに設置
      case 'Bot':
        return 'リビング';
      default:
        return 'ホーム';
    }
  }

  // リモートタイプと名前に基づいて部屋を推定
  const getRemoteRoom = (remoteType: string, deviceName: string): string => {
    // デバイス名から部屋を推定
    const name = deviceName.toLowerCase();
    
    if (name.includes('リビング') || name.includes('living')) return 'リビング';
    if (name.includes('寝室') || name.includes('bedroom')) return '寝室';
    if (name.includes('キッチン') || name.includes('kitchen')) return 'キッチン';
    
    // リモートタイプに基づくデフォルト部屋
    switch (remoteType) {
      case 'Air Conditioner':
        return 'リビング'; // エアコンは通常リビングに
      case 'TV':
        return 'リビング'; // テレビは通常リビングに
      case 'Light':
        return 'リビング'; // 照明は通常リビングに
      default:
        return 'リビング';
    }
  }

  // デバイスタイプに応じた機能を返す
  const getDeviceCapabilities = (deviceType: string): string[] => {
    switch (deviceType) {
      case 'Hub Mini':
        return ['status']
      case 'MeterPlus':
        return ['getStatus', 'temperature', 'humidity']
      case 'Bot':
        return ['turnOn', 'turnOff', 'press']
      default:
        return ['getStatus']
    }
  }

  // リモートタイプに応じた機能を返す
  const getRemoteCapabilities = (remoteType: string): string[] => {
    switch (remoteType) {
      case 'Air Conditioner':
        return ['turnOn', 'turnOff', 'setTemperature', 'setMode']
      case 'TV':
        return ['turnOn', 'turnOff', 'volumeUp', 'volumeDown', 'channelUp', 'channelDown']
      case 'Light':
        return ['turnOn', 'turnOff', 'setBrightness']
      default:
        return ['turnOn', 'turnOff']
    }
  }

  // コンポーネントマウント時にデバイス一覧を取得し、SSE接続を開始
  useEffect(() => {
    fetchDevices()

    // SSE接続の設定
    console.log('🔌 SSE 接続開始...')
    const eventSource = new EventSource(`${API_BASE_URL}/api/events`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('📨 SSE メッセージ受信:', data)

        if (data.type === 'connection') {
          console.log('✅ SSE 接続確立:', data.clientId)
        } else if (data.type === 'webhook_event') {
          const { payload } = data
          console.log('🔔 Webhook イベント受信:', payload)

          // デバイス状態をローカルで更新（再取得は行わない）
          if (payload.deviceMac) {
             setDevices(prevDevices => prevDevices.map(device => {
               if (device.id === payload.deviceMac) {
                 // ペイロードから新しい状態をマージ
                 // 注意: ペイロードの構造はイベントタイプによって異なるため、
                 // 必要に応じてマッピングを行う
                 const newStatus = { ...device.lastStatus };
                 
                 // センサーデータや状態の更新
                 if (payload.temperature !== undefined) newStatus.temperature = payload.temperature;
                 if (payload.humidity !== undefined) newStatus.humidity = payload.humidity;
                 if (payload.power !== undefined) newStatus.power = payload.power;
                 if (payload.doorState !== undefined) newStatus.doorState = payload.doorState;
                 if (payload.detectionState !== undefined) newStatus.detectionState = payload.detectionState;

                 return {
                   ...device,
                   lastStatus: newStatus,
                   updatedAt: new Date()
                 };
               }
               return device;
             }));
          }
        }
      } catch (error) {
        console.error('❌ SSE メッセージパースエラー:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('❌ SSE 接続エラー:', error)
      eventSource.close()
    }

    return () => {
      console.log('🔌 SSE 接続終了')
      eventSource.close()
    }
  }, [API_BASE_URL, fetchDevices]) // fetchDevicesとAPI_BASE_URLを依存関係に追加

  const handleSendMessage = async (message: string) => {
    // ユーザーメッセージを追加
    const userMessage: ChatMessage = {
      role: 'user',
      content: message
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // 実際のAPI呼び出し
      const requestBody = { 
        messages: [...messages, userMessage], 
        enableTools: true 
      }
      console.log('📤 チャットリクエスト:', requestBody)
      
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      console.log('📡 チャットレスポンス:', response.status, response.ok)
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json()
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response.content || '',
        toolCalls: data.response.tool_calls?.map((tc: any) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments
          }
        })) || [],
        toolResults: data.toolResults || []
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
      // 実際のAPI呼び出し
      const response = await fetch(`${API_BASE_URL}/api/switchbot/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, command, parameter })
      })
      
      const result = await response.json()
      
      // 成功メッセージをチャットに追加
      const device = devices.find(d => d.id === deviceId)
      const message: ChatMessage = {
        role: 'assistant',
        content: response.ok 
          ? `✅ ${device?.name}の${command}コマンドを実行しました。`
          : `❌ ${device?.name}の${command}コマンドの実行に失敗しました。`,
        toolResults: response.ok ? [{
          tool_name: 'send_command',
          status: 'success',
          result: result,
          timestamp: new Date().toISOString()
        }] : undefined
      }
      
      setMessages(prev => [...prev, message])
    } catch (error) {
      console.error('デバイスコマンドエラー:', error)
      
      // エラーメッセージをチャットに追加
      const device = devices.find(d => d.id === deviceId)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `❌ ${device?.name}の${command}コマンドでエラーが発生しました。`
      }
      
      setMessages(prev => [...prev, errorMessage])
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">デバイス</h2>
            <div className="flex gap-2">
              <button
                onClick={fetchDevices}
                disabled={devicesLoading}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {devicesLoading ? '読込中...' : '更新'}
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {devicesLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : devices.length > 0 ? (
              devices.map(device => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onCommand={handleDeviceCommand}
                  isLoading={isLoading}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">デバイスが見つかりません</p>
                <button
                  onClick={fetchDevices}
                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  再試行
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* メインエリア - タブ切り替え */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* タブナビゲーション */}
          <div className="bg-white border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('chat')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'chat'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <CpuChipIcon className="h-5 w-5" />
                  <span>💬 AI チャット</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('workflow')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'workflow'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <CogIcon className="h-5 w-5" />
                  <span>🤖 自動化ワークフロー</span>
                </div>
              </button>
            </nav>
          </div>

          {/* タブコンテンツ */}
          <div className="flex-1 bg-gray-50">
            {activeTab === 'chat' ? (
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
              />
            ) : (
              <div className="p-6 space-y-6">
                <WorkflowCreator 
                  onWorkflowSaved={(rule) => {
                    console.log('ワークフロー保存:', rule);
                  }} 
                />
                <WorkflowManager 
                  onRuleUpdated={() => {
                    console.log('ルール更新');
                  }} 
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
