# LowPoly Cultivar

GLB 모델을 [gltfpack](https://github.com/zeux/meshoptimizer) 프리셋으로 줄이고, **4각도 스프라이트**로 원본과 비슷한 품종을 고른 뒤 비교·배치 처리하는 로컬 웹 도구입니다.

## Features

- **단일 모델 워크플로** — GLB 업로드 → 지오메트리 프리셋 일괄 생성 → 3D 그리드 비교 → Re-cultivate / Fine-tune
- **스프라이트 유사도** — 뷰어와 동일한 Three.js 캡처(0°·90°·180°·270°)로 픽셀 차이 계산, 품종별 유사·주의·차이 판정
- **여러 모델 자동 처리** — 폴더 업로드 후 지오메트리 2-pass + 텍스처 최적화, 결과를 `output/<timestamp>/`에 저장
- **원본 vs 결과 비교** — 배치 완료 후 브라우저에서 나란히 3D 확인

## Tech Stack

- **Frontend:** React, Vite, Three.js, React Three Fiber
- **Backend:** Node.js, Express
- **Tools:** gltfpack, Playwright (배치 스프라이트 비교)

## Prerequisites

- Node.js 20+
- [gltfpack](https://github.com/zeux/meshoptimizer) in `PATH` (또는 `GLTFPACK_PATH` 환경 변수)

## Setup

```bash
npm install
npx playwright install chromium
```

## Development

```bash
npm run dev
```

- Client: Vite (프록시로 API 연결)
- Server: `http://localhost:3001`

## Production build

```bash
npm run build
npm start
```

## Batch CLI

```bash
npm run batch -- --in <folder-with-glb-files>
```

출력: `output/<YYYY-MM-DD_HHMMSS>/` (처리된 `.glb`만 저장)

## Project structure

```
server/          Express API, gltfpack runner, batch pipeline, sprite compare
src/             React UI, 3D viewers, sprite compare (browser)
scripts/         Build helpers, sprite compare smoke test
output/          Batch results (gitignored)
data/            Upload workspaces (gitignored)
```

## Pipeline (batch, per file)

1. Geometry presets → sprite compare → lowest triangles among similar/caution
2. Re-cultivate from selection → sprite compare again
3. Texture presets → smallest file among sprite-acceptable candidates

## License

MIT
