# BAKDO Casino

정적 HTML/CSS/JS 기반의 가상 카지노 프로젝트입니다.

## 구조
- index.html : 메인 로비
- login.html : 로그인 / 회원가입
- shop.html : 상점
- forge.html : 검 강화
- js/ : UI와 게임 로직
- supabase/migrations/ : DB 구조와 RLS SQL

## 빠른 시작
1. Supabase 프로젝트를 만든 뒤 URL/anon key를 `js/config.js`에 반영합니다.
2. `supabase/migrations/001_initial_schema.sql` 를 Supabase SQL Editor에 순서대로 실행합니다.
3. 로컬에서 정적 페이지를 열거나 Live Server로 실행합니다.

## 특징
- 실제 돈 사용 없음
- 게임머니만 사용
- 하루 1회 보너스 지급
- 로그인 사용자 기반 리더보드
- 강화와 판매 구조
