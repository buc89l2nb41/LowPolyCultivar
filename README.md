# LowPoly Cultivar

- **무엇인가:** GLB 모델을 [gltfpack](https://github.com/zeux/meshoptimizer) 프리셋 여러 개로 한꺼번에 줄이고, 4각도 스프라이트 비교로 원본과 비슷한 것 중 가장 가벼운 결과를 자동으로 고르는 로컬 웹 도구입니다.
- **왜 만들었나:** PromptAssetForge에서 Trellis로 만든 메시가 GrowRoll에 넣기에는 너무 무거웠고, gltfpack으로 많이 줄이면 텍스처가 깨지는 경우가 있어서 "얼마나 줄여도 되는지"를 사람 눈 대신 수치로 고르게 했습니다.
- **어떻게 확인하나:** 동작 영상 [YouTube](https://www.youtube.com/watch?v=5jGktxpn7FM) · 직접 실행은 아래 [설치](#설치)와 [실행](#실행)을 따르면 됩니다.

에셋 흐름: [PromptAssetForge](https://github.com/buc89l2nb41/PromptAssetForge)(텍스트 → 이미지 → Trellis GLB) → **LowPoly Cultivar**(면 수·텍스처 줄이기) → [GrowRoll](https://github.com/buc89l2nb41/GrowRoll)(게임에 사용)

### 실측 예시 (2026-11-25, `npm run batch` 1회)

GrowRoll용 생성 에셋 `tree.glb` 한 개를 자동 처리한 결과입니다. 유사도 점수는 4각도(0°·90°·180°·270°) 스프라이트의 픽셀 차이(MAE, 0~1)로, **낮을수록 원본과 비슷합니다** (0.028 미만 "유사", 0.055 미만 "주의").

| 항목 | 원본 | 자동 선택 결과 |
|------|------|----------------|
| 면(삼각형) 수 | 17,559 | 5,715 (약 33%) |
| 파일 크기 | 2,593,948 B | 92,948 B (약 3.6%) |
| 지오메트리 유사도 (원본 대비) | — | 0.0457 ("주의" 구간) |
| 텍스처 단계 유사도 (지오메트리 결과 대비, 128px) | — | 0.0347 |

- 1차: 59개 프리셋 중 `si 0.33 · sa · se 0.1 · cc` 선택 (5,794면, 0.0451)
- 2차(Re-cultivate): `si 0.6 · se 0.02 · vp 12` 선택 (5,715면, 0.0457)
- 3차(텍스처): 허용 범위 후보 중 가장 작은 `tex-128` 선택
- 처리 시간: 48초 (1파일)

**한계:** 유사도는 정해진 4각도 정지 화면의 픽셀 차이만 보므로, 위·아래에서 보이는 깨짐이나 애니메이션 중 문제는 잡지 못합니다. "주의" 구간 결과는 3D 비교 화면에서 사람이 한 번 확인하는 것을 전제로 합니다.

---

## 설치

### 사전 준비 (공통)

| 항목 | 설명 |
|------|------|
| [Node.js 20+](https://nodejs.org/) | LTS 권장. `node -v` 로 20 이상인지 확인 |
| Git | 저장소 clone / pull 용 |
| WebGL 브라우저 | Chrome, Edge 등 (실행 후 3D 뷰어용) |

터미널을 프로젝트 폴더에서 연 뒤 아래 중 **자동 설치**를 먼저 시도하세요.

---

### 자동 설치 (권장)

**처음 받을 때:**

```bash
git clone https://github.com/buc89l2nb41/LowPolyCultivar.git
cd LowPolyCultivar
npm run setup
```

**이미 clone 해둔 폴더에서 업데이트 후:**

```bash
git pull
npm run setup
```

Windows PowerShell에서는 프로젝트 루트에서 아래만 실행해도 됩니다 (`npm run setup` 과 동일).

```powershell
.\setup.ps1
```

macOS / Linux:

```bash
chmod +x setup.sh
./setup.sh
```

#### `npm run setup` 이 자동으로 하는 일

| 순서 | 작업 |
|------|------|
| 1 | Node.js 20+ 버전 확인 |
| 2 | `npm install` — npm 패키지 설치 |
| 3 | **gltfpack** 다운로드 → 프로젝트 안 `tools/gltfpack/` |
| 4 | **Playwright Chromium** 설치 — **여러 모델 자동 처리** 기능용 |

**단일 GLB만** 업로드·비교할 때는 Playwright가 필요 없습니다:

```bash
npm run setup:minimal
```

이미 `npm install` 을 했다면:

```bash
npm run setup -- --skip-npm
```

설치가 끝나면 [실행](#실행) 절로 이동하세요.

---

### 수동 설치 (자동 설치가 실패할 때)

`npm run setup` 이 오류로 중단되거나, 회사망·프록시 등으로 자동 다운로드가 안 될 때 아래를 **순서대로** 진행하세요.

#### 1. 저장소 받기

```bash
git clone https://github.com/buc89l2nb41/LowPolyCultivar.git
cd LowPolyCultivar
```

이미 폴더가 있으면:

```bash
cd LowPolyCultivar
git pull
```

#### 2. Node.js 확인

```bash
node -v
```

`v20.x` 이상이어야 합니다. 낮으면 [nodejs.org](https://nodejs.org/)에서 LTS를 설치한 뒤 터미널을 다시 엽니다.

#### 3. npm 패키지 설치

```bash
npm install
```

`node_modules/` 폴더가 생기면 성공입니다.  
오류가 나면 인터넷 연결, npm 버전(`npm -v`), 디스크 공간을 확인하세요.

#### 4. gltfpack 설치 (프로젝트 폴더 안)

gltfpack은 GLB 최적화에 **항상** 필요합니다. **프로젝트 루트 기준** 아래 경로에 넣습니다.

```
LowPolyCultivar/
  tools/
    gltfpack/
      gltfpack.exe    ← Windows
      gltfpack        ← macOS / Linux
```

**4-1. 릴리스 페이지에서 받기**

1. [meshoptimizer Releases](https://github.com/zeux/meshoptimizer/releases/tag/v1.0) 를 연다.
2. OS에 맞는 zip을 받는다.
   - Windows: `gltfpack-windows.zip`
   - macOS (Apple Silicon): `gltfpack-macos.zip`
   - macOS (Intel): `gltfpack-macos-intel.zip`
   - Linux: `gltfpack-ubuntu.zip`
3. zip을 풀어 실행 파일을 찾는다.
4. 프로젝트 안에 폴더를 만든다.

   **Windows (PowerShell):**

   ```powershell
   New-Item -ItemType Directory -Force -Path tools\gltfpack
   Copy-Item "다운로드한\경로\gltfpack.exe" tools\gltfpack\gltfpack.exe
   ```

   **macOS / Linux:**

   ```bash
   mkdir -p tools/gltfpack
   cp /다운로드/경로/gltfpack tools/gltfpack/gltfpack
   chmod +x tools/gltfpack/gltfpack
   ```

**4-2. 동작 확인**

```bash
# Windows
tools\gltfpack\gltfpack.exe -h

# macOS / Linux
tools/gltfpack/gltfpack -h
```

도움말이 출력되면 성공입니다.

**4-3. 다른 경로에 둔 경우 (선택)**

실행 파일을 `tools/gltfpack/` 밖에 두었다면 환경 변수로 지정할 수 있습니다.

Windows (PowerShell, 현재 세션만):

```powershell
$env:GLTFPACK_PATH = "C:\경로\gltfpack.exe"
```

macOS / Linux:

```bash
export GLTFPACK_PATH="/경로/gltfpack"
```

#### 5. Playwright Chromium 설치 (여러 모델 자동 처리를 쓸 때만)

웹 UI에서 **「여러 모델 자동 처리」** 또는 터미널의 `npm run batch` 를 쓸 때만 필요합니다.  
**GLB 하나씩** 업로드·3D 비교·스프라이트 분석만 한다면 **이 단계는 건너뛰어도 됩니다.**

```bash
npx playwright install chromium
```

처음 실행 시 Chromium 바이너리를 받습니다. 시간이 조금 걸릴 수 있습니다.

#### 6. 설치 확인

개발 서버를 잠깐 띄운 뒤 API로 gltfpack 경로를 확인합니다.

**터미널 1:**

```bash
npm run dev
```

**터미널 2 (또는 브라우저):**

```bash
curl http://localhost:3001/api/health
```

응답 JSON의 `gltfpack` 값이 **실제 존재하는 경로** (예: `.../tools/gltfpack/gltfpack.exe`) 인지 확인합니다.

---

## 실행

설치가 끝난 뒤, 프로젝트 폴더에서:

### 개발 모드 (일반 사용)

```bash
npm run dev
```

| 항목 | 주소 |
|------|------|
| **웹 UI (여기로 접속)** | http://localhost:5173 |
| API 서버 | http://localhost:3001 |

브라우저에서 **http://localhost:5173** 을 엽니다.  
GLB를 업로드하고 Generate All, 3D 비교, 스프라이트 분석 등을 사용할 수 있습니다.

종료: 터미널에서 `Ctrl+C`

### 프로덕션 빌드 후 실행

배포·상시 실행용:

```bash
npm run build
npm start
```

`npm start` 는 API 서버(`http://localhost:3001`)만 띄웁니다.  
프론트는 `dist/` 에 빌드되며, 개발 중에는 `npm run dev` 가 더 편합니다.

### 여러 GLB 자동 처리 (CLI)

폴더 안의 `.glb` 파일을 한꺼번에 처리합니다. **Playwright Chromium 설치가 필요합니다.**

```bash
npm run batch -- --in <glb-파일이-있는-폴더>
```

결과는 `output/<YYYY-MM-DD_HHMMSS>/` 에 저장됩니다.

---

## 필요한 프로그램 요약

| 프로그램 | 용도 | 자동 설치 | 수동 |
|----------|------|-----------|------|
| Node.js 20+ | 서버 실행 | ✗ ([nodejs.org](https://nodejs.org/)) | 동일 |
| gltfpack | GLB 최적화 | ✓ `tools/gltfpack/` | [4단계](#4-gltfpack-설치-프로젝트-폴더-안) |
| Playwright Chromium | 여러 모델 자동 처리 | ✓ (`npm run setup`) | [5단계](#5-playwright-chromium-설치-여러-모델-자동-처리를-쓸-때만) |
| WebGL 브라우저 | 3D 뷰어 | ✗ | Chrome / Edge 등 |

gltfpack 경로 우선순위: `GLTFPACK_PATH` → `tools/gltfpack/` → (Windows) `d:\gltfpack\gltfpack.exe` → 시스템 `PATH`

---

## Features

- **단일 모델 워크플로** — GLB 업로드 → 지오메트리 프리셋 일괄 생성 → 3D 그리드 비교 → Re-cultivate / Fine-tune
- **스프라이트 유사도** — 뷰어와 동일한 Three.js 캡처(0°·90°·180°·270°)로 픽셀 차이 계산, 품종별 유사·주의·차이 판정
- **여러 모델 자동 처리** — 폴더 업로드 후 지오메트리 2-pass + 텍스처 최적화, 결과를 `output/<timestamp>/`에 저장
- **원본 vs 결과 비교** — 자동 처리 완료 후 브라우저에서 나란히 3D 확인

## Tech Stack

- **Frontend:** React, Vite, Three.js, React Three Fiber
- **Backend:** Node.js, Express

## Project structure

```
server/          Express API, gltfpack runner, batch pipeline, sprite compare
src/             React UI, 3D viewers, sprite compare (browser)
scripts/         setup.mjs, build helpers
tools/           gltfpack 바이너리 (setup 또는 수동 설치, gitignored)
output/          자동 처리 결과 (gitignored)
data/            업로드 워크스페이스 (gitignored)
```

## Pipeline (여러 모델 자동 처리, 파일당)

1. Geometry presets → sprite compare → lowest triangles among similar/caution
2. Re-cultivate from selection → sprite compare again
3. Texture presets → smallest file among sprite-acceptable candidates

## License

MIT
