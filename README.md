# Porto Luce — Ocean & Visual Fidelity Remaster

브라우저에서 감상하고 만질 수 있는 지중해 해안 마을. Vite, TypeScript, Three.js로 구현한 실제 3D 디오라마입니다. 건물·지형·소품·텍스처는 프로젝트에서 절차적으로 생성하며 실행 중 외부 에셋이나 폰트 서버를 사용하지 않습니다.

![Porto Luce — 실제 브라우저 렌더링](docs/images/porto-luce.jpg)

## 실행

Node.js 20.19+ 또는 22.12+가 필요합니다.

```sh
npm ci
npm run dev
```

기본 주소는 `http://localhost:5173`입니다.

```sh
npm run build
npm run preview
```

`dist/`를 정적 웹 호스팅에 배포할 수 있습니다. 별도 서버, API 키, 계정이 필요하지 않습니다.

## 조작

| 입력 | 동작 |
| --- | --- |
| 바다 위 커서 이동 | 이동 속도에 따른 작은 잔물결 |
| 바다 왼쪽 클릭 / 드래그 | 강한 파동 / 경로를 따라 물 휘젓기 |
| 육지 왼쪽 드래그 | 관성이 있는 시점 회전 |
| 오른쪽 또는 Shift 드래그 | 위치에 관계없이 시점 회전 |
| 휠 | 확대·축소 |
| 한 손가락 | 바다 상호작용, 육지 시점 회전 |
| 두 손가락 | 시점 회전·핀치 확대 |
| 등대 / 보트 클릭 | 등대 켜기·끄기 / 보트의 느린 이동 전환 |
| 상단 초기화 버튼 / R | 기본 카메라 구도 복원 |

상단 설정 버튼으로 패널을 접고 펼칩니다. 모바일에서는 장면을 먼저 보여주기 위해 패널을 접습니다. 도움말 버튼에서 조작법을 확인할 수 있습니다.

## 구현

- 불규칙한 해안선과 연속적인 고도, 풍화된 석회암 절벽, 돌길·계단·항구
- 13채의 서로 다른 주택, 종탑, 등대, 입체 기와, 아치형 문·창, 셔터, 난간·발코니, 카페, 옥상 퍼골라
- 화분·꽃·덩굴·나무·빨랫줄·가로등·밧줄·부표·곡면 보트·날아다니는 갈매기
- 실제 모래톱·수중 암석·깊어지는 해저와 공유 수심 필드, 해저 표면의 움직이는 Caustics
- 8개 방향성 Gerstner 파도의 수평·수직 변위, 별도의 미세 법선, 화면 미분을 이용한 먼 잔물결의 앨리어싱 완화
- 수면 뒤의 실제 장면·깊이를 렌더링한 굴절, Beer–Lambert 흡수 근사, 깊이별 산란색, 각도에 따른 Fresnel 투과·반사
- 평면 반사 카메라와 수중/수상 클리핑, 실제 태양 방향·법선과 연결된 GGX 하이라이트, 불규칙한 해안 포말
- 고정 시간 간격의 연속 높이·속도 필드: 여러 충격의 전파·중첩·감쇠와 육지 경계 반사
- CPU 피킹과 GPU가 동일한 필드를 표본화; 자연 파도 정의에서 GLSL 생성, 동기 GPU 읽기 없이 입력 좌표 계산
- 6개 광학 프로파일과 직접 색상 선택, 4개 시간대의 태양·달·하늘 그라데이션·환경광 전환
- 부드러운 설정 전환, 야간 창문·가로등, 클릭으로 제어하는 등대와 보트
- 두께와 겹침이 있는 곡면 기와, 벽면의 Patina·Bump·Roughness, 섬세한 식생 실루엣, 새 수면에 맞춰 떠 있는 보트
- 정적 배칭과 그림자 플래그 보존, 수면 선행 렌더링으로 중복 해저 셰이딩 방지, 활동 영역 밖 물결 조회 생략
- High의 GTAO·1024² 반사·384² 수면 필드·DPR 최대 1.5; Balanced의 512² 반사·256² 필드·DPR 최대 1.15
- 품질 전환 시 높이·속도를 보간해 보존하고 타깃을 해제·재할당; Resize 시 굴절 타깃과 반사 투영 즉시 갱신
- Automatic은 모바일과 지속적인 실제 프레임 저하에 대응해 Balanced로 전환

## 코드 구성

```text
src/
  main.ts                  초기화, 프레임 루프, 품질·화면 크기 관리
  interaction.ts           레이캐스팅, 수면 입력, 카메라, 터치
  ui.ts / style.css        설정 패널과 반응형 UI
  world/
    terrain.ts             해안 지형, 절벽, 길
    village.ts             건축, 식생, 생활 소품, 보트와 등대
    geometry.ts            모델링 도구, 정적 배칭
    materials.ts           로컬 텍스처와 PBR 재질
    water.ts               수면 렌더링과 반사·굴절 타깃 수명 관리
    waterShader.ts         광학·미세 법선·포말 GLSL
    oceanWaves.ts          CPU/GPU 공유 파도 스펙트럼
    oceanProfiles.ts       광학 프로파일과 이전 이름 호환
    rippleField.ts         연속 높이·속도 솔버와 GPU 높이·기울기 텍스처
    bathymetry.ts          공유 수심 필드
    seabed.ts              실제 해저와 표면 Caustics
    coastShape.ts          지형·해저가 공유하는 해안선
    sky.ts                 대기·수평선 그라데이션
    surfaceProbe.ts        선택적 실제 GPU/CPU 높이 검증
    lighting.ts            시간대별 실제 조명
    postprocessing.ts      GTAO와 출력 변환
```

## 검증과 한계

검증 기록과 실제 화면은 `QA.md`를 확인하세요. `npm test`는 수면 전파·감쇠·연속 입력·품질 전환·프레임 정지 후 안정성을 검사합니다. WebGL2, 하드웨어 가속, 부동소수점 렌더 타깃 지원이 필요합니다.

자연 파도는 Gerstner 근사이며, 상호작용 솔버는 GPU 읽기 지연 없이 정확하게 피킹하기 위해 CPU에서 고정 간격으로 계산합니다. 높이·기울기 텍스처와 광학 렌더링은 GPU가 처리합니다. GPU Ping-pong 유체 솔버나 완전한 Navier–Stokes 모델은 사용하지 않습니다. 상호작용 영역은 마을 중심 128×128m로 제한됩니다.

굴절은 깊이 타깃을 이용한 화면 공간 근사입니다. 가림 경계·화면 가장자리에서 완전한 광선 추적과 차이가 있습니다. Caustics는 해저에 투영한 절차적 광학 근사입니다. 평면 반사는 High에서 2프레임, Balanced에서 4프레임 간격으로 갱신합니다. 건물 내부는 모델링하지 않았습니다.

60FPS는 장치·해상도에 따라 달라집니다. 모바일 레이아웃은 브라우저 뷰포트에서 확인했으며, 실제 iOS/Android 기기의 멀티터치·GPU 성능은 별도 확인이 필요합니다. 수 시간 단위의 메모리 안정성 검증은 수행하지 않았습니다.

외부 미술 에셋을 사용하지 않았습니다. npm 의존성의 라이선스는 각 패키지에 포함되어 있습니다.

## 프로파일과 재현 가능한 장면

Opaline Lagoon, Crystal Turquoise, Sapphire Coast, Emerald Dream, Pearlescent Dusk, Moonlit Azure는 색뿐 아니라 흡수·투명도·거칠기·파도 강도·하이라이트를 제어합니다. 프리셋과 시간은 독립적으로 변경되며 부드럽게 전환됩니다.

기존 이름은 Mediterranean → Crystal Turquoise, Azure → Sapphire Coast, Emerald → Emerald Dream, Sunset → Pearlescent Dusk, Midnight → Moonlit Azure로 호환됩니다.

예시: `/?sea=Sapphire%20Coast&time=Noon`, `/?sea=Pearlescent%20Dusk&time=Golden%20Hour`. 기본 장면은 Opaline Lagoon / Morning입니다.

기여자용 `?qa=1`은 실제 컴파일된 GPU 높이를 8개 위치에서 읽어 피킹용 CPU 높이와 비교합니다. 일반 실행에서는 이 읽기 작업을 수행하지 않습니다. 결과·FPS·리소스 수·타깃 크기는 `#world`의 `data-diagnostics`에 기록됩니다. `?waterDebug=1..6`은 각각 광학 깊이, 굴절 원본, 그림자, 수심 필드, 유효 해저, 평면 반사를 표시합니다.
