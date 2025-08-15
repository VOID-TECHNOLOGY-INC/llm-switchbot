# RoomSense GPT 🏠🤖

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white)](https://www.fastify.io/)
[![SwitchBot](https://img.shields.io/badge/SwitchBot-FF6B35?style=for-the-badge&logo=smart-home&logoColor=white)](https://www.switch-bot.com/)

**AI-Powered Smart Home Control System built with gpt-oss and SwitchBot Cloud API v1.1**

A natural language smart home control system developed for the [OpenAI Open Model Hackathon](https://openai.devpost.com/). Control your home devices through conversational AI with intelligent automation based on sensor data and contextual understanding.

## ✨ Features

🏠 **Natural Language Control** - Control lights, locks, appliances via conversation  
🤖 **gpt-oss Integration** - Powered by OpenAI's open-source models (20B/120B) with harmony tool calling  
📡 **Real-time Monitoring** - Live device status via SwitchBot webhooks  
🔄 **Smart Automation** - Context-aware suggestions and scene management  
⚡ **Flexible Deployment** - Local edge computing (16GB RAM) or cloud GPU scaling  
🛡️ **Production Security** - HMAC authentication, rate limiting, proper error handling

## 🎯 Use Cases

- **"暑いから涼しくして"** → Read temperature/humidity/CO2, optimize AC + fan operation
- **"外出モード"** → Lock doors, turn off lights, close curtains, schedule robot vacuum
- **"夜の読書モード"** → Suggest optimal lighting scenes with brightness control

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js Web   │    │   Fastify API    │    │   SwitchBot     │
│   Chat UI       │◄──►│   gpt-oss LLM    │◄──►│   Cloud API     │
│   Device Cards  │    │   Harmony Tools  │    │   Webhooks      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Tech Stack

- **Frontend**: Next.js (App Router), React 18, TypeScript
- **Backend**: Node.js 20 + Fastify, TypeScript  
- **LLM**: gpt-oss (20B default, 120B for cloud GPU)
- **Smart Home**: SwitchBot Cloud API v1.1 with HMAC-SHA256 authentication
- **Architecture**: TypeScript monorepo with pnpm workspaces

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm (install: `npm install -g pnpm`)
- SwitchBot account with API credentials
- gpt-oss runtime environment

### Installation

```bash
git clone https://github.com/VOID-TECHNOLOGY-INC/llm-switchbot.git
cd llm-switchbot
cp env.example .env
pnpm install
```

### Configuration

Edit `.env` with your credentials:

```env
# SwitchBot API Configuration
SWITCHBOT_TOKEN=your_switchbot_token_here
SWITCHBOT_SECRET=your_switchbot_secret_here
SWITCHBOT_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token_here

# LLM Configuration  
LLM_BASE_URL=http://localhost:8000
LLM_MODEL=gpt-oss-20b
LLM_API_KEY=optional_api_key_here
```

### Development

```bash
# Start API server
pnpm --filter api dev

# Start web frontend (in another terminal)
pnpm --filter web dev

# Run tests
pnpm test

# Build all packages
pnpm build
```

## 📁 Project Structure

```
llm-switchbot/
├── apps/
│   ├── api/                 # Fastify backend API
│   └── web/                 # Next.js frontend
├── packages/
│   ├── switchbot-adapter/   # SwitchBot API client
│   ├── harmony-tools/       # LLM tool definitions  
│   └── shared/              # Shared types & utilities
└── doc/
    ├── spec.md             # Technical specifications
    └── plan.md             # Implementation roadmap
```

## 🔧 API Endpoints

### SwitchBot Integration
- `GET /api/switchbot/devices` - List all devices
- `GET /api/switchbot/devices/:id/status` - Get device status  
- `POST /api/switchbot/command` - Send device command

### LLM Chat Interface
- `POST /api/chat` - Natural language processing with tool calls

### Webhooks
- `POST /api/webhooks/switchbot` - Receive device events

## 🤖 Harmony Tool Schema

```json
{
  "tools": [
    {
      "name": "get_devices",
      "description": "Get list of available SwitchBot devices"
    },
    {
      "name": "send_command", 
      "description": "Send command to device",
      "input_schema": {
        "properties": {
          "deviceId": {"type": "string"},
          "command": {"type": "string"},
          "parameter": {"type": ["string", "object", "null"]}
        }
      }
    }
  ]
}
```

## 🔒 Security Features

- **HMAC-SHA256 Authentication** for SwitchBot API
- **Rate Limiting** - 10,000 requests/day quota management
- **Webhook Verification** - Token validation and replay protection
- **Secrets Management** - Server-side credential protection
- **Safety Policies** - Two-factor confirmation for critical operations

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Test specific package
pnpm --filter switchbot-adapter test

# Run with coverage
pnpm test --coverage
```

## 📈 Deployment

### Local Edge Computing (16GB RAM)
```bash
# Build for production
pnpm build

# Start production servers
pnpm start
```

### Cloud GPU (80GB for 120B model)
Configure `LLM_MODEL=gpt-oss-120b` in production environment.

## 🛣️ Roadmap

- [x] SwitchBot API v1.1 integration with HMAC authentication
- [x] TypeScript monorepo with comprehensive testing
- [x] Harmony tool definitions for gpt-oss
- [ ] LLM chat orchestrator with tool dispatch
- [ ] Real-time webhook processing
- [ ] Next.js frontend with device management
- [ ] Scene learning and automation suggestions
- [ ] Home Assistant bridge (BLE/Cloud/Matter)

## 🏆 OpenAI Open Model Hackathon

This project is submitted to the [OpenAI Open Model Hackathon](https://openai.devpost.com/) featuring:

- **gpt-oss** open-source language models (20B/120B parameters)
- **harmony** tool calling format for structured LLM interactions
- **Production-ready** smart home automation with proper security

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📧 Contact

- GitHub: [@VOID-TECHNOLOGY-INC](https://github.com/VOID-TECHNOLOGY-INC)
- Project: [llm-switchbot](https://github.com/VOID-TECHNOLOGY-INC/llm-switchbot)

---

*Built with ❤️ for the OpenAI Open Model Hackathon using gpt-oss and SwitchBot*
