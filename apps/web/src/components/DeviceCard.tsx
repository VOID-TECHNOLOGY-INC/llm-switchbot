'use client'

import React from 'react'
import { Device } from '@llm-switchbot/shared'
import { 
  PowerIcon, 
  BoltIcon,
  ThermometerIcon,
  BeakerIcon,
  SunIcon,
  BatteryIcon,
  WifiIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface DeviceCardProps {
  device: Device
  onCommand: (deviceId: string, command: string, parameter?: any) => void
  isLoading?: boolean
  loadingCommand?: string
}

export function DeviceCard({ device, onCommand, isLoading = false, loadingCommand }: DeviceCardProps) {
  const { id, type, name, room, capabilities, lastStatus, updatedAt } = device

  const isOnline = lastStatus?.online !== false
  const isPowerDevice = capabilities.includes('turnOn') || capabilities.includes('turnOff')
  const isSensorDevice = type.includes('Sensor') || type.includes('Meter')

  const handleCommand = (command: string, parameter?: any) => {
    if (isLoading) return
    onCommand(id, command, parameter)
  }

  const formatLastUpdated = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return '今'
    if (minutes < 60) return `${minutes}分前`
    
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}時間前`
    
    const days = Math.floor(hours / 24)
    return `${days}日前`
  }

  const renderSensorData = () => {
    if (!isSensorDevice || !lastStatus) return null

    return (
      <div className="grid grid-cols-2 gap-2 text-xs">
        {lastStatus.temperature !== undefined && (
          <div className="flex items-center gap-1 text-blue-600">
            <ThermometerIcon className="w-3 h-3" />
            <span>{lastStatus.temperature}°C</span>
          </div>
        )}
        {lastStatus.humidity !== undefined && (
          <div className="flex items-center gap-1 text-green-600">
            <BeakerIcon className="w-3 h-3" />
            <span>{lastStatus.humidity}%</span>
          </div>
        )}
        {lastStatus.lightLevel !== undefined && (
          <div className="flex items-center gap-1 text-yellow-600">
            <SunIcon className="w-3 h-3" />
            <span>{lastStatus.lightLevel} lux</span>
          </div>
        )}
        {lastStatus.co2 !== undefined && (
          <div className="flex items-center gap-1 text-gray-600">
            <BeakerIcon className="w-3 h-3" />
            <span>{lastStatus.co2} ppm</span>
          </div>
        )}
      </div>
    )
  }

  const renderActionButtons = () => {
    if (isSensorDevice || !isPowerDevice) return null

    return (
      <div className="flex gap-2 mt-3">
        {capabilities.includes('turnOn') && (
          <button
            onClick={() => handleCommand('turnOn')}
            disabled={isLoading}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded-md transition-colors',
              'bg-green-500 text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1',
              isLoading && 'bg-gray-300 cursor-not-allowed hover:bg-gray-300'
            )}
          >
            {isLoading && loadingCommand === 'turnOn' ? (
              <div data-testid="loading-spinner" className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <PowerIcon className="w-3 h-3" />
            )}
            <span>オン</span>
          </button>
        )}
        
        {capabilities.includes('turnOff') && (
          <button
            onClick={() => handleCommand('turnOff')}
            disabled={isLoading}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded-md transition-colors',
              'bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1',
              isLoading && 'bg-gray-300 cursor-not-allowed hover:bg-gray-300'
            )}
          >
            {isLoading && loadingCommand === 'turnOff' ? (
              <div data-testid="loading-spinner" className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <PowerIcon className="w-3 h-3" />
            )}
            <span>オフ</span>
          </button>
        )}

        {capabilities.includes('press') && (
          <button
            onClick={() => handleCommand('press')}
            disabled={isLoading}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded-md transition-colors',
              'bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
              isLoading && 'bg-gray-300 cursor-not-allowed hover:bg-gray-300'
            )}
          >
            {isLoading && loadingCommand === 'press' ? (
              <div data-testid="loading-spinner" className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <BoltIcon className="w-3 h-3" />
            )}
            <span>プレス</span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={clsx(
      'bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow',
      !isOnline && 'opacity-60'
    )}>
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 text-sm">{name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">{type}</span>
            {room && (
              <>
                <span className="text-xs text-gray-300">•</span>
                <span className="text-xs text-gray-500">{room}</span>
              </>
            )}
          </div>
        </div>
        
        {/* 接続状態インジケーター */}
        <div className={clsx(
          'flex items-center gap-1',
          isOnline ? 'text-green-500' : 'text-red-500'
        )}>
          <WifiIcon className="w-4 h-4" />
          {!isOnline && (
            <span data-testid="offline-indicator" className="text-xs">オフライン</span>
          )}
        </div>
      </div>

      {/* ステータス表示 */}
      <div className="space-y-2">
        {/* 電源状態 */}
        {isPowerDevice && lastStatus?.power && (
          <div className="flex items-center gap-2">
            <PowerIcon className={clsx(
              'w-4 h-4',
              lastStatus.power === 'on' ? 'text-green-500' : 'text-gray-400'
            )} />
            <span className={clsx(
              'text-sm font-medium',
              lastStatus.power === 'on' ? 'text-green-600' : 'text-gray-500'
            )}>
              {lastStatus.power === 'on' ? 'ON' : 'OFF'}
            </span>
          </div>
        )}

        {/* センサーデータ */}
        {renderSensorData()}

        {/* バッテリー情報 */}
        {lastStatus?.battery !== undefined && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <BatteryIcon className="w-3 h-3" />
            <span>バッテリー: {lastStatus.battery}%</span>
          </div>
        )}

        {/* 最終更新時刻 */}
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <ClockIcon className="w-3 h-3" />
          <span>更新: {formatLastUpdated(updatedAt)}</span>
        </div>
      </div>

      {/* アクションボタン */}
      {renderActionButtons()}
    </div>
  )
}
