#!/bin/bash
set -e

echo "=== 1. Git 작성자(Author) 정보 choicomma 설정 ==="
git config user.name "choicomma"
git config user.email "choicomma@users.noreply.github.com"

echo "=== 2. 원격 최신 정보 가져오기 ==="
git fetch origin main

echo "=== 3. 변경 사항 스테이징 및 커밋 ==="
git add .
if [ -n "$(git status --porcelain)" ]; then
  COMMIT_MSG="${1:-261016 -8 회원관리 검색창 엔터(Enter) 키 및 검색 버튼 클릭 시 결과 반영 방식으로 개편}"
  git commit -m "$COMMIT_MSG" --author="choicomma <choicomma@users.noreply.github.com>"
  echo "✅ 커밋 완료: $COMMIT_MSG"
else
  echo "ℹ️ 커밋할 변경사항이 없습니다."
fi

echo "=== 4. origin main으로 푸시 ==="
git push origin main

echo "=== 🎉 푸시가 성공적으로 완료되었습니다! Vercel에서 자동 빌드가 재개됩니다. ==="
