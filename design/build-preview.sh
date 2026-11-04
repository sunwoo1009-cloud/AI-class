#!/usr/bin/env bash
# 디자인 핸드오프용 미리보기 페이지를 조립한다.
#   screens-preview.html  전체 화면 모음 (claude.ai 디자인 기능에 올리는 파일)
#   hobbang-preview.html  호빵 컨셉 화면만
#   styles-all.css        tokens.css + global.css 합본
#
# 사용: bash design/build-preview.sh   (프로젝트 어디에서 실행해도 된다)
#
# 결과물 3개는 .gitignore 에 있다. 소스는 이 폴더의
# preview-body.html / hobbang-screen.html / hobbang.css 다.
set -e

SRC="$(cd "$(dirname "$0")" && pwd)"
PROJ="$(cd "$SRC/.." && pwd)"
cd "$PROJ"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# 본문: 기본 화면들 + 호빵 컨셉 화면
head -n -2 "$SRC/preview-body.html" > "$TMP/body.html"
cat "$SRC/hobbang-screen.html" >> "$TMP/body.html"
printf '  </div>\n</div>\n' >> "$TMP/body.html"

{
  cat <<'HEAD'
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>회기 후 감압 화면 모음</title>
    <style>
/* =======================================================================
   아래는 실제 앱의 CSS 그대로입니다. (src/styles/tokens.css + global.css)
   클래스 이름과 구조는 React 컴포넌트가 참조하므로 바꾸지 마세요.
   ======================================================================= */

HEAD
  cat src/styles/tokens.css
  echo ""
  grep -v "^@import './tokens.css';" src/styles/global.css
  cat "$SRC/hobbang.css"
  cat <<'GALLERY'

/* =======================================================================
   여기부터는 이 미리보기 페이지 전용입니다. 실제 앱에는 없는 스타일이니
   디자인 작업 결과에 포함하지 마세요.
   ======================================================================= */

body { background: var(--surface-alt); }

.gallery { max-width: 1480px; margin: 0 auto; padding: 36px 20px 90px; }
.gallery-head { max-width: 720px; margin: 0 auto 40px; }
.gallery-head h1 { font-size: 1.6rem; }
.gallery-head code {
  font-size: 0.875em;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 5px;
}

.gallery-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
  justify-content: center;
  align-items: flex-start;
}

.screen { width: 390px; scroll-margin-top: 24px; }

.screen-caption {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin-bottom: 8px;
  padding-left: 4px;
}

.screen-frame {
  height: 780px;
  overflow: hidden;
  border-radius: 22px;
  border: 1px solid var(--border);
  background: var(--bg);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
}

/* 실제 앱에서는 .app 이 화면 전체 높이를 쓰지만, 모음 페이지에서는 틀에 맞춘다 */
.screen-frame .app {
  min-height: 100%;
  height: 100%;
  max-width: none;
  padding-top: 20px;
  padding-bottom: 24px;
}
GALLERY
  cat <<'MID'
    </style>
  </head>
  <body>
MID
  cat "$TMP/body.html"
  cat <<'TAIL'
  </body>
</html>
TAIL
} > screens-preview.html

# 호빵만 따로 보는 페이지 (같은 CSS, 해당 화면만)
{
  sed -n '1,/<body>/p' screens-preview.html
  echo '<div class="gallery"><div class="gallery-grid">'
  cat "$SRC/hobbang-screen.html"
  echo '</div></div>'
  printf '  </body>\n</html>\n'
} > hobbang-preview.html

# CSS 합본 (마크업 없이 스타일만 넘길 때)
{
  echo "/* 회기 후 감압 앱 — 전체 스타일 (tokens.css + global.css 합본) */"
  echo "/* 원본: src/styles/tokens.css, src/styles/global.css */"
  echo "/* 생성: $(date '+%Y-%m-%d') · design/build-preview.sh */"
  echo ""
  echo "/* ===================== tokens.css ===================== */"
  echo ""
  cat src/styles/tokens.css
  echo ""
  echo "/* ===================== global.css ===================== */"
  echo ""
  grep -v "^@import './tokens.css';" src/styles/global.css
} > styles-all.css

echo "screens-preview.html  $(wc -c < screens-preview.html) bytes"
echo "hobbang-preview.html  $(wc -c < hobbang-preview.html) bytes"
echo "styles-all.css        $(wc -c < styles-all.css) bytes"
