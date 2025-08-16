#!/usr/bin/env node

// SwitchBot API 接続テスト
const crypto = require('crypto');
const fs = require('fs');

// .envファイルから環境変数を読み込み
let SWITCHBOT_TOKEN, SWITCHBOT_SECRET;
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
  }
} catch (error) {
  console.error('❌ .envファイルの読み込みに失敗しました');
}

if (!SWITCHBOT_TOKEN || !SWITCHBOT_SECRET) {
  console.error('❌ SWITCHBOT_TOKEN または SWITCHBOT_SECRET が設定されていません');
  console.log('📝 .envファイルを確認してください');
  process.exit(1);
}

// SwitchBot API署名生成
function generateSignature(token, secret) {
  const timestamp = Date.now();
  const nonce = crypto.randomUUID();
  const stringToSign = token + timestamp + nonce;
  const signature = crypto.createHmac('sha256', secret).update(stringToSign).digest('base64');
  
  return {
    'Authorization': token,
    'Content-Type': 'application/json',
    'charset': 'utf8',
    't': timestamp.toString(),
    'sign': signature,
    'nonce': nonce
  };
}

// デバイス一覧取得テスト
async function testSwitchBotAPI() {
  console.log('🔄 SwitchBot API接続テスト開始...\n');
  
  try {
    const headers = generateSignature(SWITCHBOT_TOKEN, SWITCHBOT_SECRET);
    
    console.log('📡 デバイス一覧を取得中...');
    const response = await fetch('https://api.switch-bot.com/v1.1/devices', {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ SwitchBot API接続成功!\n');
    console.log('📊 取得したデバイス情報:');
    console.log(JSON.stringify(data, null, 2));
    
    // 温湿度計デバイスの特定
    const devices = data.body?.deviceList || [];
    const meters = devices.filter(device => 
      device.deviceType === 'Meter' || 
      device.deviceType === 'MeterPlus' ||
      device.deviceType === 'WoIOSensor'
    );
    
    if (meters.length > 0) {
      console.log('\n🌡️ 検出された温湿度計:');
      meters.forEach((meter, index) => {
        console.log(`${index + 1}. ${meter.deviceName} (${meter.deviceType}) - ID: ${meter.deviceId}`);
      });
      
      // 最初の温湿度計の状態取得
      await testDeviceStatus(meters[0].deviceId);
    } else {
      console.log('\n⚠️ 温湿度計が見つかりませんでした');
      console.log('💡 SwitchBot Hubが同一ネットワークに接続されていることを確認してください');
    }
    
  } catch (error) {
    console.error('❌ API接続エラー:', error.message);
    
    if (error.message.includes('401')) {
      console.log('🔑 認証エラー: SWITCHBOT_TOKEN / SWITCHBOT_SECRET を確認してください');
    } else if (error.message.includes('429')) {
      console.log('⏳ レート制限: しばらく待ってから再試行してください');
    } else if (error.message.includes('NetworkError')) {
      console.log('🌐 ネットワークエラー: インターネット接続を確認してください');
    }
  }
}

// デバイス状態取得テスト
async function testDeviceStatus(deviceId) {
  try {
    console.log(`\n🔍 デバイス状態取得中... (ID: ${deviceId})`);
    
    const headers = generateSignature(SWITCHBOT_TOKEN, SWITCHBOT_SECRET);
    const response = await fetch(`https://api.switch-bot.com/v1.1/devices/${deviceId}/status`, {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const statusData = await response.json();
    console.log('📈 デバイス状態:');
    console.log(JSON.stringify(statusData, null, 2));
    
    // 温湿度データの表示
    const body = statusData.body;
    if (body) {
      console.log('\n🌡️ 現在の環境データ:');
      if (body.temperature !== undefined) console.log(`   温度: ${body.temperature}°C`);
      if (body.humidity !== undefined) console.log(`   湿度: ${body.humidity}%`);
      if (body.battery !== undefined) console.log(`   バッテリー: ${body.battery}%`);
    }
    
  } catch (error) {
    console.error('❌ デバイス状態取得エラー:', error.message);
  }
}

// テスト実行
testSwitchBotAPI().then(() => {
  console.log('\n✨ テスト完了');
}).catch(error => {
  console.error('❌ テスト失敗:', error);
  process.exit(1);
});
