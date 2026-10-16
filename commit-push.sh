#!/bin/bash
set -e

echo "=== 1. Git 작성자(Author) 정보 choicomma 설정 ==="
git config user.name "choicomma"
git config user.email "choicomma@users.noreply.github.com"

echo "=== 2. 원격 최신 정보 가져오기 ==="
git fetch origin main

echo "=== 3. findcategory 커밋 내역 정리 및 origin/main(choicomma)으로 연결 ==="
# 작업한 소스 코드는 그대로 보존하면서, 기준점을 origin/main(choicomma)으로 재설정
git reset origin/main

echo "=== 4. choicomma 작성자로 새 커밋 생성 ==="
git add .
if [ -n "$(git status --porcelain)" ]; then
  git commit -m "261016 -2 회원등급수정" --author="choicomma <choicomma@users.noreply.github.com>"
  echo "✅ choicomma 명의로 커밋이 완료되었습니다."
else
  echo "ℹ️ 커밋할 변경사항이 없습니다."
fi

echo "=== 5. origin main으로 푸시 ==="
git push origin main

echo "=== 🎉 완료되었습니다! Graph에서 findcategory가 사라지고 choicomma로 깔끔하게 1줄 연결되었습니다. ==="
