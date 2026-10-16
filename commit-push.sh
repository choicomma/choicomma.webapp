#!/bin/bash
set -e

echo "=== 1. Git 작성자(Author) 정보 choicomma 설정 ==="
git config user.name "choicomma"
git config user.email "choicomma@users.noreply.github.com"

echo "=== 2. 원격 최신 정보 가져오기 ==="
git fetch origin main

echo "=== 3. pnpm-lock.yaml 정리 및 변경 사항 스테이징 ==="
rm -f pnpm-lock.yaml
git rm -f pnpm-lock.yaml 2>/dev/null || true
git add .
if [ -n "$(git status --porcelain)" ]; then
  COMMIT_MSG="${1:-261016 -9 pnpm에서 npm으로 완전 전환 및 Vercel 빌드 불일치 해결}"
  git commit -m "$COMMIT_MSG" --author="choicomma <choicomma@users.noreply.github.com>"
  echo "✅ 커밋 완료: $COMMIT_MSG"
else
  echo "ℹ️ 커밋할 변경사항이 없습니다."
fi

echo "=== 4. origin main으로 푸시 ==="
git push origin main

echo "=== 🎉 푸시가 성공적으로 완료되었습니다! Vercel에서 자동 빌드가 재개됩니다. ==="
