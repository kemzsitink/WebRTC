# Armcloud RTC SDK

SDK hỗ trợ kết nối và điều khiển Cloud Phone/Cloud Gaming qua WebRTC với 3 Engine chính: Volcengine (CustomRtc), P2P (WebRtc), và Tencent (TcgRtc).

## Tính năng mới (v1.5.9+)

### 1. Giám sát & Chẩn đoán (Monitoring)
Hệ thống đã chuẩn hóa dữ liệu trả về qua các callback để Frontend dễ dàng hiển thị trạng thái mạng.

#### `onNetworkQuality`
Trả về chất lượng mạng (Uplink/Downlink) theo thang điểm từ 1-6.
- 1: Tuyệt vời
- 2: Tốt
- 3: Bình thường
- 4: Kém
- 5: Rất kém
- 6: Mất kết nối

```typescript
rtc.onNetworkQuality = (uplink, downlink) => {
  console.log(`Chất lượng mạng: Up=${uplink}, Down=${downlink}`);
};
```

#### `onRunInformation`
Trả về thông số chi tiết về luồng Media (RTT, Loss Rate, Bitrate, Resolution...).

```typescript
rtc.onRunInformation = (stats) => {
  const { videoStats, audioStats } = stats;
  console.log(`Video RTT: ${videoStats.rtt}ms, Loss: ${videoStats.videoLossRate * 100}%`);
};
```

### 2. Xử lý lỗi & Tự động kết nối lại
- Engine `WebRtc` (P2P) hiện đã hỗ trợ tự động khởi tạo lại ICE (ICE Restart) khi phát hiện mất kết nối transient.
- Callback `onConnectionStateChanged` cung cấp trạng thái kết nối chuẩn hóa cho cả 3 Engine.

```typescript
rtc.onConnectionStateChanged = ({ state, msg }) => {
  // state: 0-Connecting, 1-Disconnected, 2-Connecting, 3-Connected, 4-Reconnecting, 5-Reconnected, 6-Failed
  console.log(`Trạng thái kết nối: ${state} (${msg})`);
};
```

### 3. Tối ưu hóa độ trễ
- Tích hợp `iceCandidatePoolSize` để giảm thời gian thiết lập kết nối WebRTC.
- Sử dụng `playoutDelayHint: 0` để giảm thiểu độ trễ Jitter Buffer trong trình duyệt (Chrome).
- Cơ chế ABR tự động điều chỉnh Bitrate dựa trên RTT và Loss Rate.

## Cài đặt & Sử dụng

Xem chi tiết trong mã nguồn `src/index.ts` và các ví dụ kiểm thử trong `test/`.
