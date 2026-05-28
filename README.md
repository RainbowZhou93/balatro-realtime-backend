## Project Status

🚧 Currently in active development

Current focus:

- Blind / stage progression system
- Stateful game lifecycle evolution
- Boss Blind mechanics
- Realtime game state management

---

# balatro-realtime-backend

## Introduction

A realtime backend system for a Balatro-like card game, built with Node.js, TypeScript, NestJS and WebSocket.

This project is not only a game logic practice, but also a long-term backend engineering project.

This project is inspired by Balatro, but focuses primarily on backend architecture and realtime game state management rather than recreating the original game entirely.

The goal is to gradually implement core backend capabilities through a complete card game server, including:

- state management
- cache layering
- persistence
- recovery
- testing
- extensibility

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
- GitHub Actions
- Redis (planned)
- MySQL (planned)
- Docker / Docker Compose (planned)

---

## Backend Architecture

Current structure (Phase 2):

- WebSocket Gateway (entry point)
- Game Service (orchestration layer)
- Poker Service (card rules and scoring logic)
- State-driven game lifecycle management
- In-memory per-player runtime state
- Player state management
- Blind / Ante / Round state management
- Blind score configuration
- Basic Blind progression and settlement flow

Current state structure:

```
- GameState

  - playerState
    - hand
    - deck
    - plays/discards
    - hand size
    - total score

  - blindState
    - round
    - ante
    - blindType
    - targetScore
    - currentBlindScore

  - gameStatus
```

Future improvements:

- Redis for state persistence
- MySQL for long-term storage
- Distributed session handling
- Boss Blind special rules
- Skip Blind reward system
- Shop and modifier system

The system is evolving from a single-game lifecycle into a staged game engine with Blind-based progression.

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

- Phase 1: Single game flow
- Phase 2: Blind / stage system
- Phase 3: Persistence and cache
- Phase 4: Engineering and deployment
- Phase 5: Effect / modifier system
- Phase 6: Shop and reward system
- Phase 7: Special cards
- Phase 8: AI / Go / extension

---

## Current Features

- WebSocket realtime game flow
- Server-side deck state management
- Hand evaluation system
- Play / discard / draw mechanics
- Scoring calculation
- Round settlement
- Game lifecycle management
- Blind progression system
- Blind win / lose settlement
- Stateful runtime management
- Unit testing with Jest
- CI automation with GitHub Actions

---

## Current Progress

### Phase 1 - Single game flow

✔ Card type judgment implementation
✔ Unit test for hand evaluation
✔ Initialize NestJS structure
✔ Migrate hand evaluator to module
✔ Add WebSocket gateway
✔ Implement deck generation (52 cards)
✔ Implement shuffle algorithm (Fisher-Yates)
✔ Implement card dealing logic
✔ Introduce server-side deck state management
✔ Implement play / discard / draw flow
✔ Add scoring calculation
✔ Add round settlement logic
✔ Add game over state management
✔ Refactor and extend unit tests

### Phase 2 - Blind / stage system

✔ Refactor GameState into playerState and blindState
✔ Add Blind score configuration
✔ Add round / ante / blindType state
✔ Add currentBlindScore and targetScore tracking
✔ Implement Blind settlement flow
✔ Advance to next Blind after clearing current Blind
✔ Reset game state after failure
✔ Update unit tests for Blind progression

---

## How to Run

### 1. Run the server

```bash
npm install

# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

### 2. Test with Postman

Connect to:

```text
ws://localhost:8088
```

### startGame

```json
{
  "event": "startGame",
  "data": {}
}
```

### selectCards

```json
{
  "event": "selectCards",
  "data": {
    "selectedCards": ["9C", "8D"],
    "action": "play"
  }
}
```

Response includes:

- Updated hand
- Current score
- Total score
- Remaining plays/discards
- Settlement result
- Game over state

### 3. Run tests

```bash
npm test
```

---

## Blog Series

This repository evolves alongside a long-term blog series documenting the full backend implementation process.

Architecture, game state management and engineering structure are continuously refactored and expanded as the project grows.

Each article corresponds to a specific implementation stage and commit history.

---

### Released Articles
🔗 Full Blog Series -> [CSDN](https://blog.csdn.net/weixin_43239068/category_13163951.html)


#### Core Series

1. Project Planning and Hand Evaluation.  
   从0到1实现 Balatro 游戏后端（1）：项目规划与牌型判断实现

2. NestJS Setup and Project Structure Design  
   从0到1实现 Balatro 游戏后端（2）：NestJS框架搭建与项目结构设计

3. Shuffling, Dealing and Server-side Deck State Management  
   从0到1实现Balatro游戏后端（3）：洗牌、发牌与服务端牌堆状态管理

4. Player Hand Operations and State Flow Design  
   从0到1实现Balatro游戏后端（4）：玩家手牌操作（出牌 / 弃牌 / 补牌）与状态流转设计

#### Advanced Topics

1. Custom NestJS WebSocket Adapter for Message Interception  
   Balatro后端进阶（1）：自定义NestJS WebSocket Adapter实现消息拦截

2. CI Automation with GitHub Actions  
   Balatro后端进阶（2）：基于GitHub Actions的CI自动化验证实现

---

### Upcoming Articles

5. Scoring Calculation and Single-game Settlement Flow
6. Blind Stage State Design and Round Progression
7. Boss Blind and Special Rules
8. Skip Blind Reward System
9. Multi-stage Lifecycle Management

(Updating...)
