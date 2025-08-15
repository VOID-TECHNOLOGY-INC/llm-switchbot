import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ChatInterface } from '@/components/ChatInterface'
import { ChatMessage } from '@llm-switchbot/shared'

// モックデータ
const mockMessages: ChatMessage[] = [
  {
    role: 'user',
    content: 'エアコンをつけて'
  },
  {
    role: 'assistant',
    content: 'エアコンをオンにしました。現在の設定温度は25°Cです。',
    toolCalls: [
      {
        id: 'call-1',
        type: 'function',
        function: {
          name: 'send_command',
          arguments: JSON.stringify({
            deviceId: 'aircon-1',
            command: 'turnOn',
            parameter: { temperature: 25 }
          })
        }
      }
    ]
  }
];

describe('ChatInterface', () => {
  const mockOnSendMessage = jest.fn();
  const mockProps = {
    messages: mockMessages,
    onSendMessage: mockOnSendMessage,
    isLoading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render chat messages', () => {
    render(<ChatInterface {...mockProps} />);
    
    expect(screen.getByText('エアコンをつけて')).toBeInTheDocument();
    expect(screen.getByText('エアコンをオンにしました。現在の設定温度は25°Cです。')).toBeInTheDocument();
  });

  it('should show message input', () => {
    render(<ChatInterface {...mockProps} />);
    
    const input = screen.getByPlaceholderText('デバイスを操作するメッセージを入力...');
    expect(input).toBeInTheDocument();
  });

  it('should send message when form is submitted', async () => {
    render(<ChatInterface {...mockProps} />);
    
    const input = screen.getByPlaceholderText('デバイスを操作するメッセージを入力...');
    const sendButton = screen.getByRole('button', { name: /送信/i });
    
    fireEvent.change(input, { target: { value: 'テストメッセージ' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalledWith('テストメッセージ');
    });
  });

  it('should clear input after sending message', async () => {
    render(<ChatInterface {...mockProps} />);
    
    const input = screen.getByPlaceholderText('デバイスを操作するメッセージを入力...') as HTMLInputElement;
    const sendButton = screen.getByRole('button', { name: /送信/i });
    
    fireEvent.change(input, { target: { value: 'テストメッセージ' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('should disable input and button while loading', () => {
    render(<ChatInterface {...mockProps} isLoading={true} />);
    
    const input = screen.getByPlaceholderText('デバイスを操作するメッセージを入力...');
    const sendButton = screen.getByRole('button', { name: /送信/i });
    
    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });

  it('should show loading indicator when isLoading is true', () => {
    render(<ChatInterface {...mockProps} isLoading={true} />);
    
    expect(screen.getByText('考え中...')).toBeInTheDocument();
  });

  it('should send message on Enter key press', async () => {
    render(<ChatInterface {...mockProps} />);
    
    const input = screen.getByPlaceholderText('デバイスを操作するメッセージを入力...');
    
    fireEvent.change(input, { target: { value: 'エンターキーテスト' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalledWith('エンターキーテスト');
    });
  });

  it('should not send empty messages', async () => {
    render(<ChatInterface {...mockProps} />);
    
    const sendButton = screen.getByRole('button', { name: /送信/i });
    
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });
  });
});
