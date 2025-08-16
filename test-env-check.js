// 環境変数確認スクリプト
const API_BASE = 'http://localhost:3001';

async function checkEnvironment() {
  console.log('🔍 環境変数確認\n');

  // 1. ヘルスチェック
  console.log('1. ヘルスチェック');
  try {
    const response = await fetch(`${API_BASE}/health`);
    const result = await response.json();
    console.log('✅ ヘルスチェック:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }

  // 2. 環境変数確認エンドポイント（存在しない場合は作成）
  console.log('\n2. 環境変数確認');
  try {
    const response = await fetch(`${API_BASE}/api/debug/env`);
    const result = await response.json();
    console.log('✅ 環境変数:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('⚠️  環境変数確認エンドポイントがありません');
  }

  // 3. 直接環境変数を確認
  console.log('\n3. 直接環境変数確認');
  console.log('LLM_PROVIDER:', process.env.LLM_PROVIDER);
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '設定済み' : '未設定');
  console.log('SWITCHBOT_TOKEN:', process.env.SWITCHBOT_TOKEN ? '設定済み' : '未設定');
}

checkEnvironment().catch(console.error);
