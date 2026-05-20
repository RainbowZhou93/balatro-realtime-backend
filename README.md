## Status

🚧 Currently in Phase 2: Blind / stage system


# balatro-realtime-backend

## Introduction

A realtime backend system for a Balatro-like card game, built with Node.js, TypeScript, NestJS and WebSocket.

This project is not only a game logic practice, but also a long-term backend engineering project.
This project is inspired by Balatro, but focuses primarily on backend architecture and realtime game state management rather than recreating the original game entirely.
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

- GameState
  - playerState: player hand, deck, plays/discards, hand size
  - blindState: round, ante, blind type, target score, current blind score
  - gameStatus: current game lifecycle status

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
- Unit testing with Jest
- Blind state management
- Blind score config
- Round / Ante / BlindType progression
- Win / lose settlement for Blind stages

---
## Current Progress

Phase 1 - Single game flow

✔ Card type judgment implementation  
✔ Unit test for hand evaluation  
✔ Initialize NestJS structure  
✔ Migrate hand evaluator to module  
✔ Add WebSocket gateway  
✔ Implement deck generation (52 cards)  
✔ Implement shuffle algorithm (Fisher-Yates)  
✔ Implement card dealing logic  
✔ Introduce server-side deck state management (per player)  
✔ Add unit tests for dealing logic
✔ Rename dealCards to startGame lifecycle
✔ Implement play / discard unified flow
✔ Add hand scoring calculation
✔ Add round settlement logic
✔ Add game over state management
✔ Add target score & win/lose settlement
✔ Refactor and extend unit tests

Phase 2 - Blind / stage system

✔ Refactor GameState into playerState and blindState  
✔ Add Blind score configuration  
✔ Add round / ante / blindType state  
✔ Add currentBlindScore and targetScore tracking  
✔ Implement basic Blind win / lose settlement  
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

- Open Postman and create a WebSocket request.
- Connect to: `ws://localhost:8088`.
- Send the following message: 

**startGame**
```json
{
    "event": "startGame",
    "data": {
       
    }
}
```

**selectCards**
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

Includes:

- Hand evaluation test cases
- Edge cases for invalid cards
- Dealing logic tests

```bash
npm test
```

---


## Blog Series
- This project is developed alongside a blog series documenting the full journey from building core game logic to backend architecture and engineering practices.
- Each article focuses on a specific stage of the backend system, from core logic to engineering practices.
- Each article corresponds to a specific implementation stage (tracked by commits in the repository).
- Articles will be published progressively on CSDN.


### Core Series

1. Project planning and card type judgment     
   从0到1实现 Balatro 游戏后端（1）：项目规划与牌型判断实现     
   🔗 (coming soon)

2. NestJS Setup and Project Structure Design  
   从0到1实现 Balatro 游戏后端（2）：NestJS框架搭建与项目结构设计     
   🔗 (coming soon)

3. Shuffling, Dealing, and Server-Side Deck State Management       
   从0到1实现Balatro游戏后端（3）：洗牌、发牌与服务端牌堆状态管理     
   🔗 (coming soon)

4. Player Hand Operations (Play / Discard / Draw) and State Flow Design       
   从0到1实现Balatro游戏后端（4）：玩家手牌操作（出牌 / 弃牌 / 补牌）与状态流转设计       
   🔗 (coming soon)

5. Scoring Calculation and Single-Game Settlement Flow      
   从0到1实现Balatro游戏后端（5）：得分计算与单局结算流程实现  
   🔗 (coming soon)

6. Blind Stage State Design and Round Progression     
   从0到1实现Balatro游戏后端（6）：Blind关卡状态设计与回合推进实现       
   🔗 (coming soon)     

### Advanced Topics

1. Custom NestJS WebSocket Adapter for Message Interception       
   Balatro后端进阶（1）：自定义NestJS WebSocket Adapter实现消息拦截     
   🔗 (coming soon)

2. CI Automation with GitHub Actions for NestJS Projects     
   Balatro后端进阶（2）：基于GitHub Actions的CI自动化     
   🔗 (coming soon)

(Updating...)