// 自動化提案機能のテストスクリプト
const API_BASE = 'http://localhost:3001';

async function testAutomationProposal() {
  console.log('🤖 自動化提案機能のテスト開始\n');

  // 1. ドア開イベントの分析
  console.log('1. ドア開イベントの分析');
  const doorEvent = {
    eventType: 'deviceStateChange',
    deviceType: 'Lock',
    deviceId: 'lock-001',
    state: 'unlocked',
    timestamp: new Date().toISOString(),
    context: {
      time: '18:30',
      location: 'entrance'
    }
  };

  try {
    const response = await fetch(`${API_BASE}/api/automation/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doorEvent)
    });
    
    const result = await response.json();
    console.log('✅ ドア開イベント分析結果:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }

  // 2. 温度センサーイベントの分析
  console.log('\n2. 温度センサーイベントの分析');
  const tempEvent = {
    eventType: 'sensorData',
    deviceType: 'Meter',
    deviceId: 'meter-001',
    state: { temperature: 30, humidity: 70 },
    timestamp: new Date().toISOString(),
    context: {
      time: '14:00',
      location: 'living_room'
    }
  };

  try {
    const response = await fetch(`${API_BASE}/api/automation/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tempEvent)
    });
    
    const result = await response.json();
    console.log('✅ 温度センサー分析結果:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }

  // 3. コンテキストベース提案
  console.log('\n3. コンテキストベース提案');
  const context = {
    time: '19:30',
    location: 'entrance',
    recentEvents: ['door_unlock'],
    availableDevices: ['light_entrance', 'light_living']
  };

  try {
    const response = await fetch(`${API_BASE}/api/automation/propose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context)
    });
    
    const result = await response.json();
    console.log('✅ コンテキスト提案結果:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }
}

async function testSceneLearning() {
  console.log('\n🎯 シーン学習機能のテスト開始\n');

  // 1. 操作記録
  console.log('1. 操作記録');
  const operations = [
    {
      deviceId: 'light_entrance',
      command: 'turnOn',
      parameters: {},
      timestamp: new Date().toISOString(),
      userId: 'user-001'
    },
    {
      deviceId: 'light_living',
      command: 'turnOn',
      parameters: {},
      timestamp: new Date(Date.now() + 60000).toISOString(), // 1分後
      userId: 'user-001'
    }
  ];

  for (const operation of operations) {
    try {
      const response = await fetch(`${API_BASE}/api/scenes/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operation)
      });
      
      const result = await response.json();
      console.log(`✅ 操作記録 (${operation.deviceId}):`, result.message);
    } catch (error) {
      console.log('❌ エラー:', error.message);
    }
  }

  // 2. 操作パターン取得
  console.log('\n2. 操作パターン取得');
  try {
    const response = await fetch(`${API_BASE}/api/scenes/patterns`);
    const result = await response.json();
    console.log('✅ 操作パターン:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }

  // 3. シーン候補取得
  console.log('\n3. シーン候補取得');
  try {
    const response = await fetch(`${API_BASE}/api/scenes/candidates`);
    const result = await response.json();
    console.log('✅ シーン候補:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }

  // 4. シーン提案取得
  console.log('\n4. シーン提案取得');
  const sceneContext = {
    time: '18:30',
    location: 'entrance',
    recentEvents: ['door_unlock'],
    availableDevices: ['light_entrance', 'light_living']
  };

  try {
    const response = await fetch(`${API_BASE}/api/scenes/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sceneContext)
    });
    
    const result = await response.json();
    console.log('✅ シーン提案:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }
}

async function testChatAPI() {
  console.log('\n💬 チャットAPIのテスト開始\n');

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
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }
}

// メイン実行
async function main() {
  console.log('🚀 LLM-SwitchBot 動作確認テスト\n');
  console.log('=' .repeat(50));

  await testAutomationProposal();
  await testSceneLearning();
  await testChatAPI();

  console.log('\n' + '=' .repeat(50));
  console.log('✅ テスト完了！');
}

main().catch(console.error);
