#!/usr/bin/env node

// OpenAI API + SwitchBot統合テスト
const fs = require('fs');

// .envファイルから環境変数を読み込み
let SWITCHBOT_TOKEN, SWITCHBOT_SECRET, OPENAI_API_KEY;
try {
  const envContent = fs.readFileSync('.env', 'utf8');
  const envLines = envContent.split('\n');
  for (const line of envLines) {
    if (line.startsWith('SWITCHBOT_TOKEN=')) {
      SWITCHBOT_TOKEN = line.split('=')[1];
    }
    if (line.startsWith('SWITCHBOT_SECRET=')) {
      SWITCHBOT_SECRET = line.split('=')[1];
    }
    if (line.startsWith('OPENAI_API_KEY=')) {
      OPENAI_API_KEY = line.split('=')[1];
    }
  }
} catch (error) {
  console.error('❌ .envファイルの読み込みに失敗しました');
}

if (!SWITCHBOT_TOKEN || !SWITCHBOT_SECRET) {
  console.error('❌ SwitchBot認証情報が設定されていません');
  process.exit(1);
}

if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
  console.log('⚠️ OpenAI APIキーが設定されていません。デモモードでテストします。');
}

// 1. SwitchBot APIテスト
async function testSwitchBotAPI() {
  console.log('🔄 SwitchBot API接続テスト...\n');
  
  try {
    const crypto = require('crypto');
    const timestamp = Date.now();
    const nonce = crypto.randomUUID();
    const stringToSign = SWITCHBOT_TOKEN + timestamp + nonce;
    const signature = crypto.createHmac('sha256', SWITCHBOT_SECRET).update(stringToSign).digest('base64');
    
    const headers = {
      'Authorization': SWITCHBOT_TOKEN,
      'Content-Type': 'application/json',
      'charset': 'utf8',
      't': timestamp.toString(),
      'sign': signature,
      'nonce': nonce
    };

    const response = await fetch('https://api.switch-bot.com/v1.1/devices', {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ SwitchBot API接続成功!');
    console.log(`📊 デバイス数: ${data.body?.deviceList?.length || 0}`);
    
    return data;
    
  } catch (error) {
    console.error('❌ SwitchBot API接続エラー:', error.message);
    return null;
  }
}

// 2. OpenAI APIテスト（APIキーが設定されている場合）
async function testOpenAIAPI() {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
    console.log('⏭️ OpenAI APIキー未設定のためスキップ');
    return null;
  }

  console.log('\n🔄 OpenAI API接続テスト...\n');
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたはSwitchBotスマートホームアシスタントです。温湿度計のデータを確認し、ユーザーに分かりやすく説明してください。'
          },
          {
            role: 'user',
            content: '現在の室温と湿度を教えてください。'
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API Error: ${response.status} - ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('✅ OpenAI API接続成功!');
    console.log('🤖 AI応答:', data.choices[0].message.content);
    
    return data;
    
  } catch (error) {
    console.error('❌ OpenAI API接続エラー:', error.message);
    return null;
  }
}

// 3. 統合テスト（チャットAPI経由）
async function testChatAPI() {
  console.log('\n🔄 チャットAPI統合テスト...\n');
  
  try {
    const response = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'デバイス一覧を教えてください'
          }
        ],
        enableTools: true
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ チャットAPI接続成功!');
    console.log('🤖 応答:', data.response.content);
    
    if (data.toolResults && data.toolResults.length > 0) {
      console.log('🔧 ツール実行結果:', data.toolResults[0].status);
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ チャットAPI接続エラー:', error.message);
    return null;
  }
}

// メイン実行
async function main() {
  console.log('🚀 SwitchBot + OpenAI統合テスト開始\n');
  
  // 1. SwitchBot APIテスト
  const switchBotData = await testSwitchBotAPI();
  
  // 2. OpenAI APIテスト
  const openAIData = await testOpenAIAPI();
  
  // 3. チャットAPI統合テスト
  const chatData = await testChatAPI();
  
  console.log('\n📋 テスト結果サマリー:');
  console.log(`   SwitchBot API: ${switchBotData ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`   OpenAI API: ${openAIData ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`   チャットAPI: ${chatData ? '✅ 成功' : '❌ 失敗'}`);
  
  if (switchBotData && chatData) {
    console.log('\n🎉 基本的な統合が動作しています！');
    console.log('💡 次のステップ:');
    console.log('   1. OpenAI APIキーを設定してAI機能を有効化');
    console.log('   2. フロントエンドUIでチャットインターフェースをテスト');
    console.log('   3. gpt-ossランタイム準備（Day 5）');
  } else {
    console.log('\n⚠️ 一部の機能でエラーが発生しています');
    console.log('💡 確認事項:');
    console.log('   1. SwitchBot認証情報の設定');
    console.log('   2. APIサーバーの起動状況');
    console.log('   3. ネットワーク接続');
  }
}

main().catch(console.error);
