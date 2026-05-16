# API Reference

Detailed technical reference for the **Armcloud RTC SDK**.

---

## `ArmcloudEngine`

The main entry point for the SDK.

### Constructor
`new ArmcloudEngine(params: ArmcloudEngineParams)`

#### `ArmcloudEngineParams`
| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `token` | `string` | Yes | — | Auth token for API access. |
| `baseUrl` | `string` | Yes | — | Domain of the backend API. |
| `viewId` | `string` | Yes | — | ID of the DOM element where video is rendered. |
| `deviceInfo` | `ArmcloudDeviceInfo` | Yes | — | Device and stream configuration. |
| `callbacks` | `ArmcloudCallbacks` | Yes | — | Event listeners. |
| `uuid` | `string` | No | auto | Session identifier. |
| `retryCount` | `number` | No | `2` | WebSocket reconnect attempts. |
| `retryTime` | `number` | No | `2000` | Delay between reconnects (ms). |
| `isLog` | `boolean` | No | `true` | Toggle internal logging. |
| `isWsProxy` | `string` | No | `"false"` | Use `"true"` to enable WebSocket proxy. |
| `enableMicrophone`| `boolean` | No | `true` | Request microphone access on start. |
| `enableCamera` | `boolean` | No | `true` | Request camera access on start. |

#### `ArmcloudDeviceInfo`
| Property | Type | Required | Default | Description |
|---|---|---|---|---|
| `padCode` | `string` | Yes | — | Device unique identifier. |
| `userId` | `string` | Yes | — | Current user identifier. |
| `autoRecoveryTime`| `number` | No | `300` | Idle timeout before auto-disconnect (sec). |
| `mediaType` | `number` | No | `2` | `1`: Audio, `2`: Video, `3`: Both. |
| `rotateType` | `number` | No | `0` | `0`: Portrait, `1`: Landscape. |
| `keyboard` | `string` | No | `"pad"` | `"local"` or `"pad"`. |
| `saveCloudClipboard`| `boolean` | No | `true` | Sync clipboard with cloud phone. |
| `videoStream` | `object` | No | — | `{ resolution, frameRate, bitrate }` |

---

### Methods

#### Lifecycle
- `start(isGroupControl?: boolean, pads?: string[])`: Joins the room and starts streaming.
- `stop(): Promise<void>`: Disconnects and cleans up all listeners.
- `startPlay()`: Manually trigger video/audio playback (useful for autoplay bypass).

#### Interaction
- `triggerClickEvent(options: {x, y, width, height})`: Simulate a tap.
- `triggerPointerEvent(action: 0|1|2, options)`: Simulate touch moves (`0: Down, 1: Up, 2: Move`).
- `sendInputString(text: string)`: Type text directly into the cloud device.
- `sendInputClipper(text: string)`: Paste text into the cloud device's clipboard.
- `sendCommand(cmd: "home" | "back" | "recent")`: Simulate Android hardware buttons.

#### Media & Settings
- `setMicrophone(enabled: boolean)`: Toggle local microphone.
- `setCamera(enabled: boolean)`: Toggle local camera.
- `setPhoneRotation(type: 0 | 1)`: Force rotate the cloud device screen.
- `setStreamConfig(config: CustomDefinition)`: Update resolution/bitrate on the fly.

---

### Callbacks (`ArmcloudCallbacks`)

| Event | Payload | Description |
|---|---|---|
| `onInit` | `(result: InitResult)` | Triggered after token validation. |
| `onConnectSuccess` | `()` | WebRTC connection established. |
| `onConnectionStateChanged` | `(payload)` | State codes: `0: Connecting, 3: Connected, 6: Failed`. |
| `onNetworkQuality` | `(up, down)` | Network grades `1` (Great) to `6` (Disconnected). |
| `onRunInformation` | `(stats)` | Real-time RTT, loss rate, and bitrate info. |
| `onRenderedFirstFrame` | `(event)` | Video stream is visible to user. |
| `onOutputClipper` | `(data)` | Content copied from the cloud device. |
| `onErrorMessage` | `(error)` | Critical runtime errors. |

---

### Constants

#### Network Quality Levels
- `1`: Excellent (RTT < 100ms)
- `2`: Good (RTT < 200ms)
- `3`: Fair (RTT < 400ms)
- `4`: Poor (RTT < 800ms)
- `5`: Very Poor (RTT > 800ms)
- `6`: Disconnected

#### Stream Definitions
- **Resolution**: `12`: 540p, `15`: 720p, `17`: 1080p.
- **Frame Rate**: `1`: 20fps, `2`: 25fps, `3`: 30fps.
- **Bitrate**: `1`: 1Mbps, `3`: 2Mbps, `5`: 3Mbps.
