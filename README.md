# balatro-realtime-backend

## Introduction

A realtime backend implementation of a Balatro-like card game, built with Node.js, TypeScript, NestJS and WebSocket.

This project is not only a game logic practice, but also a long-term backend engineering project.
The goal is to gradually implement core backend capabilities through a complete card game server, including state management, cache layering, persistence, recovery, testing and extensibility.

本项目用于从 0 到 1 实现一个 Balatro 风格的游戏后端，并逐步进行工程化改造。  
项目不仅仅是算法练习，也不是简单的游戏复刻，而是希望通过完整实现一个卡牌游戏后端，逐步实践后端工程中常见的核心能力，例如：

- 状态机设计
- WebSocket 实时通信
- Redis 缓存分层
- MySQL 持久化
- 游戏状态恢复
- Docker 部署
- 单元测试
- 可扩展的规则系统

---

## Tech Stack

- Node.js v22
- TypeScript 5.x
- NestJS
- WebSocket
- Jest
- Redis
- MySQL
- Docker / Docker Compose

---

## Project Goals

- Implement a realtime game backend
- Practice backend architecture design
- Build a state-driven game engine
- Support cache + persistence layering
- Support recovery after restart
- Keep the project extensible
- Record the whole process as a blog series

---

## Roadmap

Phase 1 - Single game flow  
Phase 2 - Blind / stage system  
Phase 3 - Persistence and cache  
Phase 4 - Engineering and deployment  
Phase 5 - Effect / modifier system  
Phase 6 - Shop and reward system  
Phase 7 - Special cards  
Phase 8 - AI / Go / extension

---

## Current Progress

Phase 1 - Single game flow

✔ Card type judgment implementation  
✔ Unit test for hand evaluation

---

## How to Run

```bash
npm i

//-g global
npm install -g typescript
npm install -g ts-node

ts-node src/games/hand/handEvaluator.ts
```
---

## Blog Series
This project is developed together with a blog series:
1. Project planning and card type judgment 
   从0到1实现 Balatro 游戏后端（1）：项目规划与牌型判断实现s

(Updating...)