# Advanced Usage

This document covers specialized features of the **Armcloud RTC SDK**.

## 1. Network Performance Monitoring

The SDK provides real-time diagnostics via two main callbacks: `onNetworkQuality` and `onRunInformation`.

```typescript
const engine = new ArmcloudEngine({
  // ...
  callbacks: {
    // General quality grade (1-6)
    onNetworkQuality: (uplink, downlink) => {
      console.log(`Quality Grade: Up=${uplink}, Down=${downlink}`);
    },

    // Raw performance metrics
    onRunInformation: (stats) => {
      const { videoStats } = stats;
      console.log(`RTT: ${videoStats.rtt}ms`);
      console.log(`Video Loss: ${videoStats.videoLossRate * 100}%`);
      console.log(`FPS: ${videoStats.decoderOutputFrameRate}`);
    }
  }
});
```

## 2. Remote ADB Commands

You can execute shell commands directly on the cloud device using ADB.

```typescript
// Execute a command
engine.executeAdbCommand("pm list packages");

// Capture the result
callbacks: {
  onAdbOutput: ({ isSuccess, content }) => {
    if (isSuccess) {
      console.log("Package List:", content);
    }
  }
}
```

## 3. Group Control (Multi-Device)

Control multiple cloud phones simultaneously from a single master instance.

```typescript
// Join a room with multiple devices
engine.start(true, ["DEV_001", "DEV_002", "DEV_003"]);

// Toggle synchronous control
engine.toggleGroupControlSync(true);

// Send specific text to all devices
engine.sendGroupInputString(["DEV_001", "DEV_002"], ["Hello 1", "Hello 2"]);
```

## 4. GPS Location Spoofing

Set a virtual latitude and longitude for the cloud device.

```typescript
// Set location to Ho Chi Minh City
engine.setGPS(106.6297, 10.8231);
```

## 5. Camera Injection

Inject your local webcam stream into the cloud device's virtual camera.

```typescript
import { MediaType } from "./dist/index.es.js";

// Enable injection
await engine.startMediaStream(MediaType.VIDEO);

// Stop injection
await engine.stopMediaStream(MediaType.VIDEO);
```

## 6. Remote Screenshots

Capture the cloud screen and save it locally as a Blob or on the cloud server.

```typescript
// Local capture
const blob = await engine.saveScreenShotToLocal();

// Server-side capture
engine.saveScreenShotToRemote();
```

---

## Progress Event Codes

The `onProgress` callback reports the following connection milestones:

| Code | Milestone |
|---|---|
| `101` | WebSocket connection established |
| `201` | WebRTC Offer/Answer handshake successful |
| `301` | WebRTC Media connection established |
| `310` | First video frame rendered successfully |
