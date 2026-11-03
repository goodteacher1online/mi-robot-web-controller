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

### 1. 🎮 주행 컨트롤러 (Drive Controller & Voice Assistant)
- **120Hz 고주사율 터치 조이스틱**: 지수 파워 커브($v = \text{sign}(u) \cdot |u|^{1.6}$)가 적용되어 저속에서는 초미세 주행, 고속에서는 강력한 기동 제공.
- **🐢 미세 저속 모드 (Micro-Creep Mode)**: 원클릭 토글로 최대 속도를 35%로 압축하여 1mm 단위의 정밀 기어가기 주행 지원.
- **🎙️ 한국어 음성 명령 비서 (Web Speech API)**: "전진", "후진", "좌회전", "우회전", "멈춰", "경적", "학교종" 등 실시간 한국어 음성 제어 및 TTS 피드백.
- **방향 패드 (D-Pad) & 햅틱 피드백**: 스마트폰 진동 모터(`navigator.vibrate`) 연동 촉각 반응.
- **화면 꺼짐 방지 (Screen Wake Lock)**: 주행 중 스마트폰 화면 꺼짐을 방지하여 연결 끊김 원천 차단.

### 2. ⚖️ 자가 밸런싱 & HD 오실로스코프 (Self-Balancing & IMU)
- **듀얼 트레이스 HD 오실로스코프**: 캔버스 Retina HD 스케일링으로 피치(Pitch) 및 롤(Roll) 각도를 실시간 곡선으로 시각화.
- **실시간 안정성 모니터**: 평형 상태를 '안정 균형', '자세 복원 중', '기울어짐 경고'로 3단계 자동 판정.
- **PID 제어 파라미터 튜닝**: 각도 P/D 게인, 속도 P/I 게인 실시간 원격 변경 및 로봇 플래시 영구 저장.
- **수평 0점 캘리브레이션**: 원클릭으로 자이로 수평 영점 리셋 패킷 전송.

### 3. 🎹 3옥타브 36건반 고음질 피아노 & 주크박스 (36-Key Piano & Jukebox)
- **전 음역대 3옥타브 선택기**: 3옥타브(C3~B3), 4옥타브(C4~B4 기본), 5옥타브(C5~B5) 원클릭 전환으로 APK 36개 고음질 음원 전곡 연주.
- **수학적 건반 완벽 정렬**: 모든 모바일 기기에서 100% 한 치의 오차 없이 정렬되는 백분율 그리드.
- **다채로운 동요 주크박스**: 학교종이 땡땡땡, 비행기, 나비야, 작은 별 자동 연주 및 건반 하이라이트 애니메이션.
- **서스테인 페달 (Sustain)**: 부드럽고 풍부한 잔향 사운드 토글.

### 4. 🧠 지도학습 패턴 분류기 (CreateAI ML Studio)
- **티처블 머신 스타일 대화형 AI**: 사용자 정의 클래스 자유 추가, 롤링 윈도우 특징 수집, 거리 가중 k-NN 모델 실시간 생성.
- **💾 모델 파일 내보내기 & 📂 불러오기**: 학습된 AI 모델을 `.json` 파일로 저장하거나 불러와 학교 수업 및 프로젝트에 활용.
- **LocalStorage 자동 영구 보존**: 새로고침해도 수집한 학습 데이터와 모델이 안전하게 보존.
- **로봇 동작 자동 연동**: AI 분류 신뢰도가 80% 이상일 때 긴급 정지, 혼, 멜로디, 수평 캘리브레이션 자동 트리거.

### 5. 👁️ AI 비전 모션 제어 (Vision AI Hand & Pose Tracking)
- **✋ 핸드 제스처 모드**: 손바닥 중심점을 실시간 추적하여 직관적 원격 주행.
- **🧍 상체 포즈 모드**: 머리와 척추 기울임, 상체 숙임 각도를 계산하는 고급 스켈레톤 트래커 탑재.
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
