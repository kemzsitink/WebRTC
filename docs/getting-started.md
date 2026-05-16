# Getting Started

This guide covers the installation and basic setup for the **Armcloud RTC SDK**.

## System Requirements

| Requirement | Minimum Version |
|---|---|
| Node.js | >= 16 |
| Browser | Chrome 70+, Safari 14+, Firefox 80+, Edge 80+ |
| WebRTC | Must support `RTCPeerConnection` and `DataChannel` |

## Installation

This is an internal SDK. Build it from the source to get the distribution files:

```bash
# Clone the repository
git clone <repository-url> Armcloud-WebRTC
cd Armcloud-WebRTC

# Install dependencies and build
npm install
npm run build
```

The `dist/` folder will contain:
- `dist/index.es.js`: ES Module for modern bundlers (Vite, Webpack).
- `dist/index.cjs.js`: CommonJS for Node.js or older environments.
- `dist/types/`: TypeScript type definitions.

## Compatibility Check

Check for WebRTC support before starting the engine:

```typescript
import { ArmcloudEngine } from "./dist/index.es.js";

if (ArmcloudEngine.isSupported()) {
  console.log("WebRTC is supported ✓");
} else {
  console.error("WebRTC is not supported on this browser ✗");
}
```

## Basic Integration

### 1. HTML Container

Prepare a container for the cloud phone view:

```html
<div id="cloud-phone-view" style="width: 360px; height: 640px;"></div>
```

### 2. SDK Initialization

Initialize the engine with your credentials and device info.

```typescript
import { ArmcloudEngine } from "./dist/index.es.js";

const engine = new ArmcloudEngine({
  token: "YOUR_SERVER_TOKEN",           // Required: Server-side auth token
  baseUrl: "https://api.example.com",   // Required: Backend API domain
  viewId: "cloud-phone-view",           // Required: ID of the HTML container

  deviceInfo: {
    padCode: "AC22030020000",            // Required: Unique device/room ID
    userId: "xxxx-xxxx-xxxx-xxx",        // Required: Unique user ID from your system
    
    videoStream: {                       // Optional: Custom stream quality
        resolution: 12,                  // Default 12 (540x960)
        frameRate: 2,                    // Default 2 (25fps)
        bitrate: 3                       // Default 3 (2Mbps)
    },
    
    autoRecoveryTime: 300,               // Optional: Idle timeout in seconds (Default: 300)
    mediaType: 3,                        // Optional: 1: Audio, 2: Video, 3: Both (Default: 2)
    rotateType: 0,                       // Optional: 0: Portrait, 1: Landscape (Default: 0)
    keyboard: "pad",                     // Optional: "local" or "pad" (Default: "pad")
    saveCloudClipboard: true,            // Optional: Toggle cloud clipboard sync (Default: true)
  },

  callbacks: {
    onInit: (result) => {
      if (result.code === 0) {
        console.log("SDK Initialized successfully");
        engine.start(); // Begin connection
      } else {
        console.error("Initialization failed:", result.msg);
      }
    },
    onConnectSuccess: () => {
      console.log("Connected to Cloud Phone");
    },
    onConnectFail: (error) => {
      console.error("Connection failed:", error.msg);
    }
  }
});
```

### 3. Cleanup

Always stop the engine to release hardware and network resources:

```typescript
await engine.stop();
```

---

## Next Steps

- [API Reference](./api-reference.md): Detailed documentation of methods and events.
- [Advanced Usage](./advanced-usage.md): Multi-control, ADB, and monitoring.
- [Architecture](./architecture.md): Deep dive into the internal SDK structure.
