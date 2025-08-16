// OpenAI API接続テスト
const API_BASE = 'http://localhost:3001';

async function testOpenAIConnection() {
  console.log('🤖 OpenAI API接続テスト開始\n');

  // 1. チャットAPIでLLM機能をテスト
  console.log('1. チャットAPIでLLM機能テスト');
  const chatMessage = {
    messages: [
      {
        role: 'user',
        content: '玄関の照明をつけて'
      }
    ],
    toolsAllowed: true
  };

  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chatMessage)
    });
    
    const result = await response.json();
    console.log('✅ チャット応答:', JSON.stringify(result, null, 2));
    
    if (result.toolResults && result.toolResults.length > 0) {
      console.log('🎉 LLM機能が正常に動作しています！');
    } else {
      console.log('⚠️  LLM機能は動作していますが、ツール呼び出しがありません');
    }
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }

  // 2. デバイス一覧取得テスト
  console.log('\n2. デバイス一覧取得テスト');
  try {
    const response = await fetch(`${API_BASE}/api/switchbot/devices`);
    const result = await response.json();
    console.log('✅ デバイス一覧:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }

  // 3. デバイス操作テスト
  console.log('\n3. デバイス操作テスト');
  const deviceCommand = {
    deviceId: 'light_entrance',
    command: 'turnOn',
    parameters: {}
  };

  try {
    const response = await fetch(`${API_BASE}/api/switchbot/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deviceCommand)
    });
    
    const result = await response.json();
    console.log('✅ デバイス操作結果:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }
}

// メイン実行
async function main() {
  console.log('🚀 OpenAI API接続テスト\n');
  console.log('=' .repeat(50));

  await testOpenAIConnection();

  console.log('\n' + '=' .repeat(50));
  console.log('✅ テスト完了！');
}

main().catch(console.error);
