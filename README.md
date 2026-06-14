## Project Status

🚧 Currently in active development

Current focus:

- Reward settlement and money state design
- Economy system foundation
- Shop / reward / build-growth lifecycle
- Stateful game lifecycle evolution
- Realtime game state management

Completed recently:

- Blind / stage progression system
- Boss Blind mechanics
- Skip Blind and Tag reward system
- Blind reward settlement
- Player money state
- Basic economy rule configuration

---

# balatro-realtime-backend

## Introduction

A realtime backend system for a Balatro-like card game, built with Node.js, TypeScript, NestJS and WebSocket.

This project is not only a game logic practice, but also a long-term backend engineering project.

This project is inspired by Balatro, but focuses primarily on backend architecture, realtime game state management, and progressive system design rather than recreating the original game entirely.

The goal is to gradually implement core backend capabilities through a complete card game server, including:

- state management
- reward settlement
- economy system design
- cache layering
- persistence
- recovery
- testing
- extensibility

本项目用于从 0 到 1 实现一个 Balatro 风格的游戏后端，并逐步进行工程化改造。

项目不仅仅是算法练习，也不是简单的游戏复刻，而是希望通过完整实现一个卡牌游戏后端，逐步实践后端工程中常见的核心能力，例如：

- 状态机设计
- WebSocket 实时通信
- Blind 生命周期管理
- 奖励结算与经济系统
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

Current structure:

- WebSocket Gateway (entry point)
- Game Service (orchestration layer)
- Poker Service (card rules and scoring logic)
- State-driven game lifecycle management
- In-memory per-player runtime state
- Player state management
- Blind / Ante / Round state management
- Blind score and reward configuration
- Basic Blind progression and settlement flow
- Skip Blind decision flow
- Tag preview assignment and runtime tag handling
- Reward settlement and money state update
- Basic economy rule configuration

Current state structure:

```
- GameState
  - playerId

  - playerState
    - hand
    - deck
    - plays/discards
    - hand size
    - currentActionScore
    - money

  - blindState
    - round
    - ante
    - blindType
    - targetScore
    - currentBlindScore
    - currentAnteConfig
    - nextAnteConfig?

  - gameStatus

  - progress / settlement response
    - finalScore
    - targetScore
    - result
    - reward?
      - baseMoney
      - remainingHandBonusMoney
      - interestMoney
      - currentBlindRewardMoney
      - moneyAfterReward
```

Future improvements:

- Shop entry and shop lifecycle
- Buy / skip / reroll flow
- Joker and modifier system
- Voucher / Tag / Joker economy interaction
- Redis for state persistence
- MySQL for long-term storage
- Distributed session handling
- Expand Boss Blind and effect coverage
- Expand Tag types and effect coverage

The system is evolving from a single-game lifecycle into a staged game engine with Blind-based progression, reward settlement, and build-growth loops.

---

## Project Goals

- Implement a realtime game backend
- Practice backend architecture design
- Build a state-driven game engine
- Support reward settlement and economy growth
- Support cache + persistence layering
- Support recovery after restart
- Keep the project extensible
- Record the whole process as a blog series

---

## Roadmap

- Phase 1: Single game flow
- Phase 2: Blind / stage system
- Phase 3: Reward, shop and build-growth system
- Phase 4: Persistence and cache
- Phase 5: Engineering and deployment
- Phase 6: Effect / modifier system
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
- Skip Blind action flow
- Tag reward preview and assignment
- Basic Tag effect handling (Boss Tag, Juggle Tag)
- Blind reward settlement
- Player money state
- Reward detail response
- Basic interest calculation
- Basic economy rule configuration

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
✔ Add Boss Blind special rules  
✔ Add Skip Blind action handling   
✔ Add Tag reward preview to Blind state  
✔ Implement basic Tag runtime handling   
✔ Support representative Tag effects (Boss Tag, Juggle Tag)   

### Phase 3 - Reward, shop and build-growth system

🚧 In progress

✔ Add player money state  
✔ Add Blind base reward money configuration 
✔ Add economy rule configuration   
✔ Add reward detail structure   
✔ Add Blind reward settlement flow 
✔ Add remaining hand bonus reward  
✔ Add interest reward calculation  
✔ Update player money after Blind win 

Planned next:

- Shop entry flow 
- Shop buy / skip / reroll actions  
- Shop item generation  
- Joker / Tag / Voucher economy interaction  
- Build-growth lifecycle after Blind settlement 

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

### initGame

```json
{
  "event": "initGame",
  "data": {}
}
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


### skipBlind

```json
{
  "event": "skipBlind",
  "data": {
    "blindType": "small",
    "round": 1
  }
}
```

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

5. Scoring Calculation and Single-game Settlement Flow  
   从0到1实现Balatro游戏后端（5）：得分计算与单局结算流程实现

6. Blind Stage State Design and Lifecycle Progression   
   从0到1实现Balatro游戏后端（6）：Blind关卡状态设计与回合推进实现

7. Boss Blind Design and Special Rule Handling    
   从0到1实现Balatro游戏后端（7）：Boss Blind与特殊规则实现

8. Skip Blind and Tag Reward Mechanism Design   
   从0到1实现Balatro游戏后端（8）：跳过Blind与Tag奖励机制设计  

9. Blind Reward Settlement and Money State Design  
   从0到1实现Balatro游戏后端（9）：Blind奖励结算与金币状态设计 



#### Advanced Topics

1. Custom NestJS WebSocket Adapter for Message Interception  
   Balatro后端进阶（1）：自定义NestJS WebSocket Adapter实现消息拦截

2. CI Automation with GitHub Actions  
   Balatro后端进阶（2）：基于GitHub Actions的CI自动化验证实现

3. Why Mechanism Design Makes Code Harder   
   Balatro后端进阶（3）：为什么机制设计比写代码更难

---

### Upcoming Articles

10. Shop Entry and Economy Flow Design

(Updating...)
