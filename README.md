# 🤖 Mi Robot Web Studio Pro (샤오미 로봇 웹 스튜디오)

> **최신 안드로이드 14/15 및 모든 기기에서 별도 앱 설치 없이 웹 브라우저로 즐기는 샤오미 로봇 컨트롤러**  
> 공식 32-bit APK 설치 불가 문제를 해결하고, 자가 밸런싱(PID), 36건반 피아노 연주, 센서 패턴 AI 학습, 카메라 비전 모션 제어까지 탑재된 차세대 Web Bluetooth PWA 스튜디오입니다.

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-brightgreen?logo=github)](https://goodteacher1online.github.io/mi-robot-web-controller/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-blue?logo=pwa)](https://goodteacher1online.github.io/mi-robot-web-controller/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Security: 100% Client--Side](https://img.shields.io/badge/Security-100%25%20Local%20Sandbox-success)](#-보안성-및-개인정보-보호)

---

## 🚀 바로 실행하기 (Live Service)

스마트폰, 태블릿, PC 브라우저에서 아래 주소를 터치하면 즉시 실행됩니다:

### 🔗 **[https://goodteacher1online.github.io/mi-robot-web-controller/](https://goodteacher1online.github.io/mi-robot-web-controller/)**

<p align="center">
  <img src="./qrcode.png" alt="QR Code" width="180">
  <br>
  <em>스마트폰 카메라로 위 QR 코드를 스캔하면 바로 연결됩니다.</em>
</p>

---

## 📱 스마트폰에서 일반 앱처럼 설치하는 방법 (PWA)

본 프로젝트는 프로그레시브 웹 앱(PWA) 표준을 준수하여, 브라우저 주소창이나 메뉴바 없이 **일반 플레이스토어 앱과 동일한 전체화면 단독 앱**으로 설치할 수 있습니다.

### 🤖 안드로이드 (크롬 / 삼성 인터넷)
1. 스마트폰에서 [서비스 주소](https://goodteacher1online.github.io/mi-robot-web-controller/)에 접속합니다.
2. 브라우저 우측 상단 메뉴(**`⋮`**) 터치 ➡️ **[앱 설치]** 또는 **[홈 화면에 추가]** 선택.
3. 스마트폰 홈 화면에 생성된 **`Mi Robot Studio`** 아이콘을 눌러 실행합니다.

### 🍎 아이폰 / 아이패드 (Safari)
1. Safari 브라우저에서 서비스 주소로 접속합니다.
2. 하단 중앙의 **공유 버튼(`[↑]`)** 터치 ➡️ **[홈 화면에 추가]** 선택.

> [!NOTE]
> **야외 100% 오프라인 작동**: 최초 1회 접속 후에는 서비스 워커가 36개 고음질 음원과 모든 코드를 기기에 자동 캐싱하므로, **데이터 연결이 없는 야외나 공원에서도 완벽하게 작동**합니다.

---

## 🎮 5대 핵심 스튜디오 기능

### 1. 🎮 주행 컨트롤러 (Drive Controller)
- **120Hz 고주사율 터치 조이스틱**: 레이아웃 스래싱(Reflow) 없는 0ms 반응성 가상 조이스틱.
- **방향 패드 (D-Pad)**: 직관적인 전진/후진/좌회전/우회전 버튼 모드.
- **키보드 & 게임패드 지원**: PC 연결 시 <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 및 <kbd>Space</kbd>(긴급 정지), 블루투스 게임패드 스틱 연동.
- **실시간 주행 HUD**: 속도율, 조작축 벡터, 현재 입력 소스(터치/키보드/패드) 실시간 표시.

### 2. ⚖️ 자가 밸런싱 & 오실로스코프 (Self-Balancing & IMU)
- **실시간 IMU 자이로 HUD**: 6축 센서의 기울기(Pitch), 좌우각(Roll) 실시간 각도 게이지.
- **PID 제어 파라미터 튜닝**: 각도 P/D 게인, 속도 P/I 게인 실시간 원격 변경 및 로봇 플래시 영구 저장.
- **수평 0점 캘리브레이션**: 원클릭으로 자이로 수평 영점 리셋 패킷 전송.

### 3. 🎹 36건반 고음질 피아노 (36-Key Piano Synthesizer)
- **공식 APK 오리지널 음원**: 샤오미 공식 앱 내부에서 추출한 3옥타브 36개 고음질 피아노 WAV 내장.
- **로봇 본체 스피커 연주**: 건반 터치 시 스마트폰 스피커뿐만 아니라 로봇 내부 스피커로 동시 사운드 패킷 전송.
- **Web Audio API 신디사이저 폴백**: 오프라인 또는 특수 환경에서도 끊김 없는 폴리포닉 사운드 보장.

### 4. 🧠 센서 패턴 머신러닝 (Edge AI Pattern Classifier)
- **MakeCode CreateAI / Teachable Machine 스타일**: 센서 데이터를 롤링 윈도우로 실시간 수집.
- **특징 벡터 추출**: 평균 각도, 최대 진폭, 표준편차 분산 등 6차원 특징 벡터 추출.
- **거리 가중 k-NN 알고리즘**: $w = \frac{1}{d + \epsilon}$ 기반 가중치 분류로 로봇의 '정상 안정', '전방 기울임', '충격/넘어짐' 상태를 자동 판별.

### 5. 👁️ AI 비전 모션 제어 (Vision AI Hand Tracking)
- **스마트폰/PC 카메라 손동작 인식**: 손의 중심 좌표를 추적하여 손동작 방향으로 로봇 원격 주행.
- **초저지연 160x120 분석 파이프라인**: 1080p 전체 해상도 대신 저부하 분석 캔버스를 사용하여 모바일 CPU/배터리 소모 98% 절감.
- **자동 절전/프라이버시 보호**: 비전 탭을 벗어나거나 화면이 꺼지면 카메라 스트림 하드웨어를 즉각 해제.

---

## 🛠️ 하드웨어 통신 프로토콜 명세 (Reverse Engineered)

본 스튜디오는 샤오미 공식 펌웨어의 **Nordic UART Service (NUS)** 프로토콜을 100% 준수합니다:

- **Service UUID**: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- **RX Characteristic (Write)**: `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
- **TX Characteristic (Notify)**: `6e400003-b5a3-f393-e0a9-e50e24dcca9e`

### 20-Byte 패킷 프레임 규격
```
[0x55] [CMD_GRP] [CMD_TYPE] [SUB_CMD] [DATA 0..13] [XOR_CHECKSUM] [0xAA]
  |                                                      |          |
Header (0x55)                                         18-byte XOR  Tail (0xAA)
```

| 기능 | 주요 패킷 구조 | 비고 |
| :--- | :--- | :--- |
| **핸드셰이크** | `0x55 0x01 0x01 0x00 ... 0xAA` | 최초 연결 시 인증 및 텔레메트리 구독 |
| **주행 제어** | `0x55 0x02 0x02 0x00 [X] 0x00 [Y] 0x00 ... 0xAA` | X/Y (0..255, 중립=128) |
| **음악 연주** | `0x55 0x02 0x02 0x02 [음계ID 1..36] ... 0xAA` | 로봇 내장 스피커 사운드 |
| **볼륨 조절** | `0x55 0x02 0x03 0x00 [볼륨 0..15] ... 0xAA` | 스피커 출력 레벨 제어 |
| **0점 캘리브레이션** | `0x55 0x06 0x00 0x00 [종류] [값] ... 0xAA` | 자이로 수평 영점 보정 |
| **PID 파라미터** | `0x55 0x03 0x00 0x03 [P] [D] 0x00 ... 0xAA` | 각도 밸런싱 게인 설정 |

---

## 🛡️ 보안성 및 안전성 (Security & Safety)

1. **외부 유출 0건 (Zero-Leakage Local Sandbox)**:
   - 외부 서버로 비디오 영상이나 제어 신호를 일절 전송하지 않으며, 모든 AI 연산이 브라우저 내부에서만 수행됩니다.
2. **비상 정지 및 통신 단절 Failsafe**:
   - 블루투스 연결이 끊어지면 내부 조작 축을 즉시 중립(`128`)으로 리셋하여 재연결 시 급발진을 차단합니다.
3. **GATT 동시성 큐 제어 (Bounded Queue)**:
   - Web Bluetooth의 `DOMException` 충돌을 방지하기 위해 모든 쓰기 명령을 직렬화 큐로 체이닝하고, 과도한 적체 시 이전 주행 패킷을 드롭하여 조작 지연을 방지합니다.

---

## 💻 로컬 개발 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/goodteacher1online/mi-robot-web-controller.git
cd mi-robot-web-controller

# 2. 로컬 파이썬 웹 서버 실행
python serve.py

# 3. 브라우저에서 http://localhost:8000 접속
```

---

## 📄 라이선스 (License)

본 프로젝트는 [MIT 라이선스](LICENSE)에 따라 자유롭게 사용 및 수정할 수 있습니다.
샤오미(Xiaomi) 로봇 관련 상표권은 해당 권리자에게 있습니다.
