# System Architecture

Overview of the internal architecture of **Armcloud RTC SDK v1.5.9**.

## Overview

The SDK uses a **Factory + Polymorphism** architecture to support 3 different WebRTC engines through a single unified API.

```
┌─────────────────────────────────────────────────────┐
│                   ArmcloudEngine                     │
│              (src/lib/pkg.ts — Facade)               │
│                                                      │
│   ┌──────────────────────────────────────────────┐   │
│   │              RtcFactory.create()              │   │
│   │         Polymorphic Engine Selection          │   │
│   └────────┬──────────┬───────────┬──────────────┘   │
│            │          │           │                   │
│            ▼          ▼           ▼                   │
│     ┌──────────┐ ┌─────────┐ ┌─────────┐            │
│     │CustomRtc │ │ WebRtc  │ │ TcgRtc  │            │
│     │(Volc=1)  │ │ (P2P=2) │ │(Tcg=3)  │            │
│     └────┬─────┘ └────┬────┘ └────┬────┘            │
│          │            │           │                   │
│          └────────────┼───────────┘                   │
│                       ▼                               │
│               ┌──────────────┐                        │
│               │   BaseRtc    │                        │
│               │  (Abstract)  │                        │
│               └──────────────┘                        │
└─────────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── index.ts                  # Entry point — Public API exports
└── lib/
    ├── pkg.ts                # ArmcloudEngine (Facade class)
    │
    ├── module/               # RTC Engine implementations
    │   ├── common/
    │   │   ├── BaseRtc.ts    # Abstract base class (shared logic)
    │   │   └── RtcFactory.ts # Factory pattern — selects engine by streamType
    │   ├── p2p/
    │   │   ├── WebRtc.ts     # P2P Engine (Native WebRTC)
    │   │   ├── WebGroupRtc.ts # Group Control for P2P
    │   │   └── VideoElement.ts # <video> element management
    │   ├── volc/
    │   │   ├── CustomRtc.ts  # Volcengine Engine
    │   │   └── CustomGroupRtc.ts # Group Control for Volcengine
    │   └── tcg/
    │       ├── TcgRtc.ts     # Tencent Cloud Gaming Engine
    │       ├── config/       # TCG configuration
    │       ├── core/         # TCG core logic
    │       └── module/       # TCG sub-modules
    │
    ├── services/
    │   └── InputService.ts   # IME / mobile input handling
    │
    ├── types/
    │   ├── index.ts          # All interface & type definitions
    │   ├── rtcInterface.ts   # IRtcInstance — standard engine interface
    │   ├── webrtcType.ts     # Enums: TouchType, MessageKey, MediaType...
    │   └── groupControlInterface.ts # IGroupControl interface
    │
    ├── constant/
    │   ├── index.ts          # Error codes, Progress codes, StreamType enum
    │   └── keyCodes.ts       # JS ↔ Android KeyCode mapping
    │
    ├── common/
    │   ├── metrics-reporter.ts # Metrics reporting (FirstFrame, etc.)
    │   ├── mixins.ts          # Mixin utilities
    │   ├── screenshotOverlay.ts # Screenshot overlay functionality
    │   └── shake.ts           # Shake effect
    │
    └── utils/
        ├── index.ts          # Utilities: isMobile, debounce, copyText...
        ├── crypto.ts         # AES decrypt, UUID generation
        └── logger.ts         # Centralized Logger class
```

## Initialization Flow

```
new ArmcloudEngine(params)
        │
        ├── 1. setupInitConfig(params)    → Create rtcOptions
        ├── 2. setupCallbacks(params)     → Bind callbacks
        ├── 3. Validate parameters        → Throw Error if missing
        │
        └── 4. applyToken(params)
                │
                ├── POST /rtc/open/room/applyToken
                │
                └── Response → streamType
                        │
                        ├── streamType=1 → RtcFactory.create(1,...) → CustomRtc (Volcengine)
                        ├── streamType=2 → RtcFactory.create(2,...) → WebRtc (P2P)
                        └── streamType=3 → RtcFactory.create(3,...) → TcgRtc (Tencent)
                                │
                                └── callbacks.onInit({ code: 0, ... })
```

## Design Patterns

| Pattern | Location | Purpose |
|---|---|---|
| **Facade** | `ArmcloudEngine` (pkg.ts) | Simple API hiding internal complexity |
| **Factory Method** | `RtcFactory.create()` | Creates correct engine based on `streamType` |
| **Template Method** | `BaseRtc` (abstract class) | Shared logic, subclasses override specifics |
| **Interface Segregation** | `IRtcInstance`, `IGroupControl` | Clear contracts for each module |
| **Service Pattern** | `InputService`, `MetricsReporter` | Separation of concerns |

## The 3 Engines

### 1. CustomRtc (Volcengine) — `streamType = 1`
- Uses Volcengine RTC SDK (`@volcengine/rtc`)
- Full support: audio/video, DataChannel, Group Control
- Automatic network quality monitoring (NetworkQuality)

### 2. WebRtc (P2P) — `streamType = 2`
- Pure WebRTC (Native `RTCPeerConnection`)
- Signaling via WebSocket
- Automatic ICE Restart on connection loss
- Optimizations: `iceCandidatePoolSize`, `playoutDelayHint: 0`

### 3. TcgRtc (Tencent) — `streamType = 3`
- Integrates Tencent Cloud Gaming SDK
- Supports Cloud Gaming use-cases

## Dependency Graph

```
armcloud-rtc
├── @volcengine/rtc   — Volcengine RTC SDK
├── axios             — HTTP client (applyToken)
├── clipboard-copy    — Copy text to clipboard
├── crypto-js         — AES encryption/decryption
└── webrtc-adapter    — Cross-browser WebRTC polyfill
```
