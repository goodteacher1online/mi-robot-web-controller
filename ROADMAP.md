# Mi Robot Web Studio: 단계별 구현 및 검증 로드맵 (Step-by-Step)

## 📌 핵심 원칙: "점진적 구현 & 환경 진단(Capability Probe) & 무결점 검증"
1. **장치 및 브라우저 환경 자동 진단 (Device Capability Matrix)**
   - Web Bluetooth, Web Audio, WebGL, WebRTC, MediaDevices(카메라), Gamepad API, Wake Lock, Haptic 등의 가용 여부를 실행 시 즉시 진단.
   - 미지원 환경에서는 에러로 뻗지 않고 **[⚠️ 미지원 - 비활성화]** 뱃지를 달고 안전하게 Graceful Fallback.
2. **한 번에 한 모듈씩 독립 구현 및 테스트 후 다음 단계로 확장**

---

## 🗺️ 단계별 추진 계획

| 단계 | 모듈 명칭 | 핵심 구현 내용 | 환경 의존성 진단 (Capability) | 검증 기준 |
| :--- | :--- | :--- | :--- | :--- |
| **Step 1** | **환경 진단 코어 & 스마트 컨트롤러 강화** | - 기기 환경 진단기 (`DeviceCapabilityDetector`)<br>- 로봇 별칭(이름) 변경 & 로컬 저장<br>- 조이스틱/D-Pad/키보드/게임패드 연동 안정화 | `navigator.bluetooth`<br>`navigator.wakeLock`<br>`navigator.getGamepads` | 브라우저 진단 뱃지 정상 출력, 로봇 이름 저장/불러오기, 3개 입력원 정상 작동 |
| **Step 2** | **공식 자가 밸런싱 & 아날로그 센서 텔레메트리** | - 자이로/가속도 실시간 텔레메트리 파싱<br>- 2D 캔버스 실시간 오실로스코프 그래프<br>- 공식 자이로 0점 캘리브레이션 (`0x55 0x06...`)<br>- 공식 PID 파라미터 읽기/조절/저장 | `Canvas 2D Context`<br>로봇 BLE 수신 Characteristic (`6e400003`) | 텔레메트리 수치 차트 렌더링, 캘리브레이션/PID 패킷 전송 검증 |
| **Step 3** | **36음계 인터랙티브 피아노 신디사이저** | - 추출된 피아노 오디오(`piano1~36.wav`) 캐싱<br>- C4~B5 인터랙티브 건반 UI<br>- Web Audio API 폴백 신디사이저<br>- 멜로디 자동 연주 시퀀서 | `window.AudioContext`<br>HTMLAudioElement | 터치/키보드로 피아노 연주, 로봇 모터와 사운드 동시 출력 시 끊김 없음 검증 |
| **Step 4** | **센서 패턴 머신러닝 (CreateAI / Teachable Robot)** | - 자이로/센서 시계열 데이터 수집기 (클래스별 샘플링)<br>- 브라우저 내 경량 KNN / 규칙 기반 패턴 학습 엔진<br>- 실시간 패턴 추론 (안정/기울기/충격) & 로봇 자율 반응 | `requestAnimationFrame`<br>WebGL (TensorFlow.js 가속) | 3개 클래스 학습 후 90% 이상 상태 판별 및 로봇 자동 제어 검증 |
| **Step 5** | **AI 비전 제어 (Google MediaPipe Hands)** | - 웹캠 영상 입력 스트림<br>- MediaPipe Hands 손바닥/주먹/가리키기 제스처 분류<br>- 카메라 미지원 기기 시 탭 비활성화 처리 | `navigator.mediaDevices.getUserMedia`<br>WebGL 2.0 | 손짓만으로 전진/정지/회전 모터 구동 검증 |

---

## 🎯 즉시 진행할 작업: [Step 1]
1. `device-capability.js` 신규 작성: 실행 중인 스마트폰/태블릿/PC 환경의 8가지 하드웨어/API 기능 정밀 진단
2. 로봇 커스텀 이름(별칭) 변경 & 저장 모듈 구축
3. 미지원 기능 비활성화 UI 표시 처리
4. 완성 후 사용자 검증 진행
