import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DeviceCard } from '@/components/DeviceCard'
import { Device } from '@llm-switchbot/shared'

// モックデバイスデータ
const mockDevice: Device = {
  id: 'device-1',
  type: 'Bot',
  name: 'リビング スイッチ',
  room: 'リビング',
  capabilities: ['turnOn', 'turnOff', 'press'],
  lastStatus: {
    power: 'off',
    battery: 85
  },
  updatedAt: new Date('2023-12-01T10:00:00Z')
}

const mockSensorDevice: Device = {
  id: 'sensor-1', 
  type: 'WoIOSensor',
  name: 'リビング センサー',
  room: 'リビング',
  capabilities: ['getStatus'],
  lastStatus: {
    temperature: 25.5,
    humidity: 60,
    lightLevel: 750
  },
  updatedAt: new Date('2023-12-01T10:05:00Z')
}

describe('DeviceCard', () => {
  const mockOnCommand = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render device information', () => {
    render(<DeviceCard device={mockDevice} onCommand={mockOnCommand} />)
    
    expect(screen.getByText('リビング スイッチ')).toBeInTheDocument()
    expect(screen.getByText('Bot')).toBeInTheDocument()
    expect(screen.getByText('リビング')).toBeInTheDocument()
  })

  it('should show device status', () => {
    render(<DeviceCard device={mockDevice} onCommand={mockOnCommand} />)
    
    expect(screen.getByText('OFF')).toBeInTheDocument()
    expect(screen.getByText('バッテリー: 85%')).toBeInTheDocument()
  })

  it('should render action buttons for controllable devices', () => {
    render(<DeviceCard device={mockDevice} onCommand={mockOnCommand} />)
    
    expect(screen.getByRole('button', { name: /オン/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /オフ/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /プレス/i })).toBeInTheDocument()
  })

  it('should call onCommand when action button is clicked', async () => {
    render(<DeviceCard device={mockDevice} onCommand={mockOnCommand} />)
    
    const onButton = screen.getByRole('button', { name: /オン/i })
    fireEvent.click(onButton)
    
    await waitFor(() => {
      expect(mockOnCommand).toHaveBeenCalledWith(mockDevice.id, 'turnOn')
    })
  })

  it('should show sensor data for sensor devices', () => {
    render(<DeviceCard device={mockSensorDevice} onCommand={mockOnCommand} />)
    
    expect(screen.getByText('25.5°C')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('750 lux')).toBeInTheDocument()
  })

  it('should not show action buttons for sensor-only devices', () => {
    render(<DeviceCard device={mockSensorDevice} onCommand={mockOnCommand} />)
    
    expect(screen.queryByRole('button', { name: /オン/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /オフ/i })).not.toBeInTheDocument()
  })

  it('should show last updated time', () => {
    render(<DeviceCard device={mockDevice} onCommand={mockOnCommand} />)
    
    // 相対時間の表示をチェック（実装依存）
    expect(screen.getByText(/更新:/)).toBeInTheDocument()
  })

  it('should disable buttons when isLoading is true', () => {
    render(<DeviceCard device={mockDevice} onCommand={mockOnCommand} isLoading={true} />)
    
    const onButton = screen.getByRole('button', { name: /オン/i })
    const offButton = screen.getByRole('button', { name: /オフ/i })
    
    expect(onButton).toBeDisabled()
    expect(offButton).toBeDisabled()
  })

  it('should show loading indicator on specific button when loading', () => {
    render(
      <DeviceCard 
        device={mockDevice} 
        onCommand={mockOnCommand} 
        isLoading={true}
        loadingCommand="turnOn"
      />
    )
    
    const onButton = screen.getByRole('button', { name: /オン/i })
    
    // ローディングスピナーまたはテキストの確認
    expect(onButton).toContainElement(screen.getByTestId('loading-spinner') || screen.getByText(/実行中/i))
  })

  it('should show connection status indicator', () => {
    const offlineDevice = { ...mockDevice, lastStatus: { ...mockDevice.lastStatus, online: false } }
    render(<DeviceCard device={offlineDevice} onCommand={mockOnCommand} />)
    
    // オフライン状態の表示確認（実装依存）
    expect(screen.getByText(/オフライン/i) || screen.getByTestId('offline-indicator')).toBeInTheDocument()
  })
})
