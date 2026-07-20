# gltfpack LOD 실험 기록

PromptAssetForge에서 Trellis로 생성한 GLB(`~50,000면`)를 **gltfpack**으로 후처리하며 시도한 방법·결과·권장 워크플로를 정리한 문서입니다.

- **gltfpack 경로:** `d:\gltfpack\gltfpack.exe`
- **테스트 모델:** `output/models/growroll3941a2/test/acorn.glb` (49,884면, 3.27 MB)
- **기준 LOD:** `output/models_lowpoly/.../lod/acorn_lod1000.glb` (1,000면, 1.78 MB)

---

## 1. 배경

| 단계 | 도구 | 비고 |
|------|------|------|
| 3D 생성 | Trellis Gradio (8080) | decimation 최소 **10,000면** (Gradio 슬라이더 제한) |
| 후처리 LOD | gltfpack | 면 수 추가 감소, 텍스처 압축 |

Trellis만으로는 10,000면 이하 생성이 어렵고, 게임용 로우폴리·LOD는 **gltfpack 후처리**로 진행했습니다.

---

## 2. gltfpack 기본 사용법

```powershell
$gltfpack = "d:\gltfpack\gltfpack.exe"
$in  = "input.glb"
$out = "output.glb"

& $gltfpack -i $in -o $out -si 0.2 -cc
```

| 옵션 | 의미 |
|------|------|
| `-i` / `-o` | 입력·출력 경로 (`.glb`) |
| `-si R` | 삼각형 비율 (0~1). `0.2` = 약 20% 면 수 |
| `-cc` | meshopt 압축 |

---

## 3. 실험 1 — 원본(50k)에서 한 번에 LOD 내리기

**출력:** `output/models_lowpoly/growroll3941a2/test/lod/`

원본 `acorn.glb`(49,884면)에서 목표 면 수별로 `-si`만 계산해 단일 패스 실행.

| 목표 | 실제 면 | 옵션 |
|------|--------|------|
| 50,000 | 49,884 | 원본 복사 |
| 25,000 | 25,000 | `-si 0.501 -cc` |
| 10,000 | 9,998 | `-si 0.200 -cc` |
| 5,000 | 5,000 | `-si 0.100 -cc` |
| 2,500 | 2,498 | `-si 0.050 -sa -se 0.1 -cc` |
| 1,000 | 1,000 | `-si 0.020 -sa -se 0.1 -cc` |
| 500 | 498 | `-si 0.010 -sa -se 0.1 -cc` |
| 250 | **128** | `-si 0.005 -sa -sp -se 0.5 -cc` |
| 100 | **92** | 동일 |
| 50 | **48** | 동일 |

### 발견

1. **기본 옵션만** 쓰면 약 **2,700면** 아래로 잘 안 내려감.
2. **500~2,500면**은 `-sa -se 0.1` 필요.
3. **250면 이하**는 `-sa -sp -se 0.5` 없이는 목표에 도달 못함 → **텍스처 깨짐** (아래 5절).

---

## 4. 실험 2 — LOD 1000을 기준으로 다시 내리기

**출력:** `output/models_lowpoly/growroll3941a2/test/lod_from1000/`

이미 정리된 `acorn_lod1000.glb`를 입력으로 체인.

| 목표 | 실제 면 | 비고 |
|------|--------|------|
| 1,000 | 1,000 | 기준 복사 |
| 750 | 750 | |
| 500 | 500 | |
| 250 | **244** | 원본 기준 250→128보다 목표에 가까움 |
| 100 | **74** | |
| 50 | **50** | |

### 권장 워크플로 (1차)

```
Trellis (~50k) → gltfpack → LOD 1000 (기준)
                              ↓
                    gltfpack → 500 / 250 / 100 / 50
```

한 번에 50k에서 50면으로 내리는 것보다 **1000면 기준 2차 단순화**가 면 수·형태 모두 유리했습니다.

---

## 5. 실험 3 — 텍스처 깨짐 vs 메쉬 깨짐

### 증상

극저 LOD(50~100면)에서 **메쉬 형태보다 텍스처가 찢어진 것처럼** 보임 (UV 스크램블).

### 원인 옵션

| 옵션 | 역할 | 텍스처 영향 |
|------|------|------------|
| **`-sp`** | UV seam 무시하고 면 합침 | **깨짐의 주범** |
| **`-sa`** | 목표 면수까지 강제 단순화 | UV 왜곡 증가 |
| **`-se 0.5`** | 형태 오차 허용 크게 | UV 더 틀어짐 |

**깨진 예:** `-sa -sp -se 0.5` → `lod_uv_test/acorn_broken_sp_lod50.glb`

### UV 보존 모드

**`-sp` 제거**, `-se` 낮게:

```powershell
& $gltfpack -i lod1000.glb -o out.glb -si 0.25 -sa -se 0.1 -cc
```

| 목표 (lod1000 기준) | 실제 면 | 텍스처 |
|---------------------|--------|--------|
| 500 | 500 | 양호 |
| 250 | 244 | 양호 |
| 150 이하 | **~226에서 멈춤** | 양호 |

`-sp` 없이는 **약 226면**이 실질 바닥 (텍스처 유지 시).

---

## 6. 실험 4 — three.js editor: 버텍스 ≈ 삼각형

[three.js editor](https://threejs.org/editor/)에서 **vertices와 triangles 숫자가 비슷할수록** 텍스처 깨짐이 적다는 관찰.

### 측정 예 (파일별)

| 파일 | verts | tris | \|v−t\| | v/t | 텍스처 |
|------|-------|------|---------|-----|--------|
| `lod1000.glb` | 986 | 1,000 | 14 | 0.986 | 좋음 |
| `default_lod100.glb` | 952 | 968 | 16 | 0.983 | 좋음 |
| `broken_sp_lod50.glb` | 27 | 50 | 23 | 0.540 | 깨짐 |
| `sa_se01_lod100.glb` | 61 | 226 | 165 | 0.270 | 왜곡 |

### 스크립트

`scripts/gltfpack_lod_balanced.py`  
→ 여러 `-si`·프리셋 조합을 돌려 **\|vertices − triangles\|** 최소 결과 선택.

**출력:** `output/models_lowpoly/growroll3941a2/test/lod_balanced/`

| LOD | verts | tris | \|v−t\| |
|-----|-------|------|---------|
| 1000 | 986 | 1,000 | 14 |
| 750 | 853 | 850 | 3 |
| 500 | 851 | 848 | 3 |
| 400 | 815 | 804 | 11 |
| 350 | 782 | 762 | 20 |
| 300 | 780 | 760 | 20 |
| 250 | 754 | 720 | 34 |

**특징:** v/t ≈ 1.0 유지, 텍스처 양호. **약 720면**이 이 조건에서의 실질 하한.

---

## 7. 실험 5 — 파일 용량: 텍스처가 대부분

lod1000 분석:

| 항목 | 크기 |
|------|------|
| 텍스처 (내장 이미지 2장) | ~1.77 MB |
| 전체 GLB | ~1.78 MB |

면을 50까지 줄여도 **파일은 ~1.7MB 그대로** → 용량은 **텍스처** 문제.

### 텍스처 축소 옵션

| 옵션 | 의미 |
|------|------|
| `-tw` | WebP 변환 |
| `-tl N` | 최대 N px (예: 512, 256, 128) |
| `-ts R` | 해상도 비율 (0.5 = 50%) |
| `-tq N` | 품질 1~10 (낮을수록 작음) |

### 용량 테스트 (lod1000 기준)

| 설정 | 파일 크기 |
|------|----------|
| baseline `-cc` | 1,738 KB |
| `-tw -tl 512 -tq 6` | **~61 KB** |
| `-tw -tl 256 -tq 4` | **~26 KB** |

---

## 8. 실험 6 — compact LOD (저면수 + 작은 파일)

**스크립트:** `scripts/gltfpack_lod_compact.py`  
**출력:** `output/models_lowpoly/growroll3941a2/test/lod_compact/`

- **메쉬:** lod1000 → 500 → 250 → … 체인, `-sa -se`, **`-sp` 없음**
- **텍스처:** LOD별 `-tw -tl -tq` (1024px → 128px)

| LOD | tris | 파일 크기 | 텍스처 프리셋 |
|-----|------|----------|---------------|
| 1000 | 1,000 | 179 KB | `-tw -tl 1024 -tq 7` |
| 500 | 500 | 175 KB | `-tw -tl 512 -tq 6` |
| 250 | 244 | 173 KB | `-tw -tl 512 -tq 6` |
| 150 | 153 | 169 KB | `-tw -tl 256 -tq 5` |
| 100 | 110 | 169 KB | `-tw -tl 256 -tq 4` |
| 50 | 92 | 169 KB | `-tw -tl 128 -tq 4` |

**약 1/10 용량**, 텍스처 UV는 `-sp` 미사용으로 비교적 양호.  
50면 목표는 UV 보존 기준 **~92면**에서 멈춤.

```powershell
python scripts\gltfpack_lod_compact.py
```

---

## 9. 출력 폴더 구조

```
output/models_lowpoly/growroll3941a2/test/
├── lod/              # 실험1: 원본 50k → 단계별
├── lod_from1000/     # 실험2: 1000 기준 체인
├── lod_uv_test/      # 실험3: UV 옵션 비교
├── lod_balanced/     # 실험4: verts≈tris 최적화
└── lod_compact/      # 실험6: 저면수 + WebP (권장)
```

원본 Trellis GLB는 `output/models/{컬렉션ID}/{면수}/` 에 유지.

---

## 10. 옵션 치트시트

### 면 수만 줄이기 (텍스처·용량 그대로)

```powershell
& $gltfpack -i $in -o $out -si 0.2 -cc
```

### UV 보존하며 중간 LOD (250~500)

```powershell
& $gltfpack -i lod1000.glb -o out.glb -si 0.5 -sa -se 0.1 -cc
```

### 극저 LOD (텍스처 깨짐 감수)

```powershell
& $gltfpack -i $in -o $out -si 0.05 -sa -sp -se 0.5 -cc
```

### 용량만 줄이기 (면 수 유지)

```powershell
& $gltfpack -i $in -o $out -tw -tl 512 -tq 6 -cc
```

### 면 수 + 용량 (현재 권장)

```powershell
python scripts\gltfpack_lod_compact.py
```

---

## 11. 한계·트레이드오프

| 목표 | 가능 여부 | 방법 |
|------|----------|------|
| 50k → 1,000면 | ✅ | Trellis 10k + gltfpack 또는 50k에서 `-si` |
| 1,000 → 250~500면, 텍스처 유지 | ✅ | lod1000 체인, `-sa -se 0.1`, **no `-sp`** |
| verts ≈ tris, 텍스처 유지 | ✅ ~720면까지 | `gltfpack_lod_balanced.py` |
| 50~100면, 텍스처 유지 | ⚠️ 어려움 | UV 보존 시 ~92면 근처 바닥 |
| 50면, 텍스처 유지 | ❌ gltfpack만으로는 거의 불가 | `-sp` 또는 Blender 리베이크 |
| 파일 1.7MB → 200KB 이하 | ✅ | `-tw -tl 512` 이상 |
| Trellis 10,000면 미만 | ❌ | Gradio/API 최소 10,000 (Trellis `app.py` 슬라이더) |

### 50면 이하가 필요할 때

1. **Blender:** Decimate → Smart UV Project → 텍스처 베이크  
2. **빌보드/impostor:** 극원거리 LOD  
3. **단색 머티리얼:** 텍스처 제거  
4. **Trellis worker 직접 호출:** Gradio 검증 우회 (품질·안정성 리스크)

---

## 12. 확인 도구

- [three.js editor](https://threejs.org/editor/) — vertices / triangles / 용량 육안 비교  
- [gltf-viewer.donmccurdy.com](https://gltf-viewer.donmccurdy.com/) — 빠른 GLB 미리보기  

---

## 13. 관련 스크립트

| 파일 | 용도 |
|------|------|
| `scripts/gltfpack_lod_balanced.py` | \|verts − tris\| 최소 LOD 체인 |
| `scripts/gltfpack_lod_compact.py` | 저면수 + WebP 텍스처 압축 (실사용 권장) |
| `scripts/gltfpack-lod-balanced.ps1` | balanced 초기 PowerShell版 (Python 권장) |

스크립트 상단 `INPUT_GLB`, `OUT_DIR`, `TARGETS` 수정으로 다른 모델·컬렉션에 재사용 가능.

---

## 14. 권장 파이프라인 (요약)

```
1. Trellis 생성 (~50,000면)
      ↓
2. gltfpack → acorn_lod1000.glb  (-si … -sa -se 0.1 -cc)
      ↓
3. python scripts/gltfpack_lod_compact.py
      → lod_compact/ (500 / 250 / 100 / ~92면, 각 ~170KB)
```

게임 엔진에서 거리별 LOD로 `lod_compact` 단계를 매핑하면 됩니다.
