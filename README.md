# Armcloud RTC SDK

A high-performance WebRTC SDK for connecting and controlling **Cloud Phone / Cloud Gaming** instances. Supports Volcengine, P2P, and Tencent Cloud Gaming engines.

## Quick Installation

This is an internal SDK. Build from source:

```bash
npm install
npm run build
```

## Basic Example

```typescript
import { ArmcloudEngine } from "./dist/index.es.js";

const engine = new ArmcloudEngine({
  token: "YOUR_TOKEN",
  baseUrl: "https://api.example.com",
  viewId: "cloud-phone-view",
  deviceInfo: {
    padCode: "AC22030020000",
    userId: "user-unique-id",
    videoStream: { resolution: 12, frameRate: 2, bitrate: 3 },
    mediaType: 3,
    keyboard: "pad"
  },
  callbacks: {
    onInit: (res) => { if (res.code === 0) engine.start(); },
    onConnectSuccess: () => console.log("Connected!")
  }
});
```

## Documentation

Full documentation is available in the [`docs/`](./docs) folder:

- [🚀 Getting Started](./docs/getting-started.md): Installation and first connection.
- [📚 API Reference](./docs/api-reference.md): Classes, methods, and events.
- [🛠 Advanced Usage](./docs/advanced-usage.md): ADB, Group Control, and Performance Monitoring.
- [🏗 Architecture](./docs/architecture.md): Internal design and project structure.

## Features

- **Multi-Engine**: Seamlessly switches between Volcengine (CustomRtc), Native P2P, and Tencent (TcgRtc).
- **Control**: Full touch, keyboard, and ADB command support.
- **Diagnostics**: Real-time network quality and stream performance reporting.
- **Advanced**: GPS spoofing, clipboard sync, and camera injection.
