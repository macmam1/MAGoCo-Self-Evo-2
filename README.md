# MAGoCo
## Self-Evolving AI Agent Platform

**MRH-DevLoop • v0.1.0**

---

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Version](https://img.shields.io/badge/Version-0.1.0-blue.svg)](CHANGELOG.md)
[![Test Coverage](https://img.shields.io/badge/Tests-552%20Passing-brightgreen.svg)](packages/test)

---

## 📖 Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Quick Start](#quick-start)
- [Detailed Installation](#detailed-installation)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Screenshots](#screenshots)
- [Security & Compliance](#security--compliance)
- [FAQ](#faq)

---

## 🏢 Overview
**MAGoCo** (Multi-Agent Generative Cooperative) is an enterprise-grade platform for autonomous AI agents. Built from the ground up for security, scalability, and self-improvement, it enables organizations to deploy, manage, and collaborate with AI agents across desktop and cloud environments.

> **Note:** MAGoCo is proprietary software. All rights reserved.

---

## ⚡ Key Features

### 🔧 Agent Core & Intelligence
| Phase | Feature | Description |
|-------|---------|-------------|
| 3 | **Core Engine** | TypeScript-based capability system with event bus and provider abstraction |
| 4 | **Computer Use** | Full browser automation (click, type, scroll, drag, extraction) via Playwright |
| 5 | **Workflow Engine** | DAG-based task orchestration, triggers, and sub-workflow serialization |
| 6 | **Auto-Generation** | Automated agent and pipeline creation with team/milestone/SOP capabilities |
| 7 | **Knowledge Base** | Vector store, RAG pipeline, and hybrid search for context retrieval |
| 8 | **Self-Evolution** | Agents that reflect, mine patterns, optimize prompts, and auto-skill-gen |

### 🔒 Security & Collaboration
| Phase | Feature | Description |
|-------|---------|-------------|
| 10 | **Auth System** | JWT, TOTP 2FA, encrypted secret store, and rate limiting |
| 11 | **Collaboration** | Multi-tenant workspaces, RBAC, team management, and audit logs |

### 📊 Operations & Integration
| Phase | Feature | Description |
|-------|---------|-------------|
| 9 | **Integrations** | MCP Client, OAuth 2.0, storage backends (S3/MinIO), custom connectors |
| 12 | **Analytics** | Usage/cost tracking, performance metrics, tracing, error tracking, alerting, quotas |
| 13 | **Marketplace** | Plugin/skill discovery, download, rating, and one-click installation |
| 14 | **Deployment** | Desktop (Tauri), cloud profiles (HF/ModelScope), backup & migration |

---

## 🚀 Quick Start

### Desktop (Windows/macOS/Linux)
```bash
# Download from Releases (coming soon)
wget https://github.com/mrh000mrh/MAGoCo-Self-Evo/releases/download/v0.1.0/magoco-desktop-installer.tar.gz
tar -xzf magoco-desktop-installer.tar.gz
./magoco-cli
```

### Server (Docker)
```bash
docker run -p 3000:3000 magoco/server:0.1.0
```

---

## 📥 Detailed Installation

### Desktop Application

#### Windows
1.  **Download:** Run the `.exe` installer from [Releases](https://github.com/mrh000mrh/MAGoCo-Self-Evo/releases)
2.  **Install:** Follow the wizard
3.  **Launch:** `Start Menu → MAGoCo`

#### macOS
1.  **Download:** Run the `.dmg` installer
2.  **Install:** Drag `.app` to `Applications`
3.  **Launch:** `Applications → MAGoCo`

#### Linux (Ubuntu/Debian)
```bash
sudo apt install -y libgtk-3-0 libwebkit2gtk-4.0-37
wget https://github.com/mrh000mrh/MAGoCo-Self-Evo/releases/download/v0.1.0/magoco-linux.deb
sudo dpkg -i magoco-linux.deb
```

### Server Deployment

#### Hugging Face Space
```yaml
# .env.yaml
variables:
  - HF_TOKEN
  - MODELSCOPE_TOKEN
build:
  script: pnpm install && pnpm run build
```

#### ModelScope Studio
```yaml
# .env.yaml
variables:
  - MODELSCOPE_TOKEN
  - HF_TOKEN
build:
  script: pnpm install && pnpm run build
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Interface                      │
│  (Desktop App / Web UI / CLI / MCP Clients)             │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      Capability Core                    │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ │
│  │  Browser  │ │  Workflow │ │  Knowledge│ │  Security │ │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ │
│  │   Agents  │ │ Analytics │ │ Marketplace │ │  Backup │ │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [API Reference](docs/api.md) | Full HTTP & gRPC endpoints |
| [Architecture](docs/architecture.md) | System design & patterns |
| [Security](docs/security.md) | Security model & compliance |
| [Deployment](docs/deployment.md) | Cloud & on-prem setup |

---

## 📸 Screenshots

> **Note:** The UI is currently in development. Screenshots will be updated upon public release.

### Desktop Interface
![Dashboard Preview](assets/images/dashboard-preview.png)

### CLI Mode
```bash
$ magoco --version
0.1.0

$ magoco agent create
? Agent name: Assistant
? Agent type: Assistant
? Profile: default

✓ Created agent 'Assistant' (ID: ag-1234)
```

### Configuration Editor
*(To be added in v0.2.0)*

---

## 🔐 Security & Compliance

### Authentication
- **JWT:** Stateless token-based auth with refresh rotation
- **2FA:** TOTP-based time-one-time-password
- **Secret Store:** AES-256 encrypted credential storage

### Authorization
- **RBAC:** Role-Based Access Control
- **Workspaces:** Multi-tenant isolation
- **Audit:** Immutable operation logging

### Compliance
- **Data Residency:** Configurable storage locations
- **Rate Limiting:** Per-user and per-workspace quotas
- **Encryption:** All data at rest and in transit

---

## ❓ FAQ

**Q: Is MAGoCo open source?**  
A: No, MAGoCo is proprietary software. Source code is available for audit only under NDA.

**Q: Can I self-host?**  
A: Yes, Docker and on-prem deployment is fully supported.

**Q: What AI models are supported?**  
A: Any model compatible with the OpenAI API format.

**Q: How do I integrate with existing tools?**  
A: Use the MCP Client or Custom Connector APIs.

---

## 📞 Support

- **Email:** support@mrhdevloop.com
- **Documentation:** https://docs.magoco.dev
- **Issue Tracker:** https://github.com/mrh000mrh/MAGoCo-Self-Evo/issues

---

## 📄 License

**Copyright © 2026 MRH-DevLoop. All Rights Reserved.**

See [LICENSE](LICENSE) for full terms.
