---
name: standing_instructions
description: Persistent instructions that apply to every task in this project
type: feedback
---

## Standing Instructions

### 1. VPS Deployment Steps After Every Code Change
After completing any code change, always provide the exact VPS deployment steps to make things live. Include:
- `git pull origin main`
- Which apps need rebuilding (API, Web, Admin) based on what changed
- Any migration or prisma generate commands if schema changed
- PM2 restart commands for affected apps
- `pm2 save`
- Verification command (`curl http://localhost:4000/health` or `pm2 list`)

Format as a copy-paste ready block the user can give to Claude Code on the VPS.
