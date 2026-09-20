# 가상 카지노 프로젝트 기획서 (v0.1)

> 게임 내 가상 화폐만 사용하는 웹 카지노. 현금 충전·환전 없음.
> 수치(확률, 배당, 비용)는 모두 **초안**이며, 시뮬레이션으로 검증하며 조정한다.

---

## 0. 프로젝트 개요

### 0.1 목표
- 다양한 도박 게임과 특수 콘텐츠(검 강화, 가위바위보)를 한곳에 모은 웹 게임
- 회원가입/로그인, 지갑, 리더보드, 상점까지 갖춘 하나의 작은 "경제 시스템"

### 0.2 핵심 원칙
1. **가상 화폐 전용**: 실제 돈과 연결되는 기능(충전, 환전, 현금성 보상)은 만들지 않는다.
2. **결과는 서버(DB)가 결정**: 브라우저는 화면만 그린다. 난수와 정산은 Supabase 쪽에서 처리한다.
3. **게임 추가가 쉬운 구조**: 모든 게임이 `배팅 → 결과 결정 → 정산` 흐름을 공유한다.
4. **확률·배당은 데이터로 관리**: 코드 수정 없이 `game_config` 테이블에서 조정한다.

### 0.3 범위
- **포함**: 카드/주사위/룰렛/슬롯/복권/배팅형/신규 스타일 게임, 검 강화, 가위바위보
- **제외**: 비디오 포커처럼 오프라인(실물 기계/장비) 성격이 섞인 게임
- **후순위**: 멀티플레이 카드게임(텍사스 홀덤, 쓰리카드 포커, 고스톱)

---

## 1. 기술 스택과 아키텍처

### 1.1 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 프론트엔드 | HTML / CSS / JavaScript (ES Modules) | 프레임워크 없이 시작 |
| 호스팅 | GitHub Pages | 정적 파일만 서빙 |
| 백엔드 | Supabase (BaaS) | Auth, Postgres, RLS, RPC, Realtime |
| 개발 환경 | VS Code + Live Server 확장 | 로컬 테스트용 |

> **"풀스택"인가?** 직접 서버 코드를 짜는 게 아니라 Supabase가 백엔드 역할을 대신해 주는 **프론트엔드 + BaaS** 구조다. 흔히 풀스택이라고 넓게 부르기도 하지만, 서버 로직(게임 규칙)은 SQL 함수로 작성하게 된다는 점이 다르다.

### 1.2 구조도

```
[브라우저: GitHub Pages]                [Supabase]
 HTML/CSS/JS (화면, 연출, 입력)   ──▶  Auth (로그인/회원가입)
        │                              Postgres
        │  supabase.rpc('play_xxx')      ├─ profiles / ledger / game_rounds
        └───────────────────────────▶   ├─ game_config (확률·배당)
                                         ├─ RPC 함수 (난수, 판정, 정산)
        ◀── 결과 JSON ──────────────     └─ RLS (직접 수정 차단)
        ◀── Realtime (멀티플레이) ────  Realtime
```

### 1.3 가장 중요한 원칙: 정적 사이트에서 안전하게 만들기

GitHub Pages의 JS 코드는 누구나 열어볼 수 있고 콘솔에서 조작할 수 있다. 따라서:

- ❌ 브라우저에서 `Math.random()`으로 결과를 정하고 잔액을 업데이트 → 조작 가능
- ✅ 브라우저는 `supabase.rpc('play_coinflip', { p_bet: 100, p_choice: 'heads' })`만 호출
- ✅ DB 함수가 잔액 검증 → 난수 생성 → 정산 → 기록까지 한 번에 처리하고 결과만 반환
- ✅ `profiles.balance`는 RLS로 클라이언트의 직접 `update`를 막고, 오직 RPC 함수로만 변경

Supabase의 `anon key`는 프론트 코드에 들어가도 되는 공개 키다(RLS가 제대로 걸려 있다는 전제). 반대로 **`service_role` 키는 절대 프론트에 넣지 않는다.**

### 1.4 게임 처리 방식 3종

| 유형 | 설명 | 예시 | 구현 방식 |
|---|---|---|---|
| **즉시형** | 한 번의 호출로 끝 | 코인플립, 슬롯, 룰렛, 스크래치 | RPC 1회 |
| **상태 유지형** | 여러 단계에 걸쳐 진행 | 블랙잭, 하이로우, 지뢰찾기, 크래시, 검 강화 | 세션 테이블 + 단계별 RPC |
| **멀티플레이형** | 여러 유저가 같은 판에 참여 | PvP 가위바위보, 포커, 홀덤, 고스톱 | 방 테이블 + Realtime |

**상태 유지형 주의점**: 진행 중인 게임의 비밀 정보(덱 순서, 지뢰 위치, 크래시 지점)는 `game_sessions` 테이블에 저장하고 **select 정책을 주지 않는다**. 클라이언트는 RPC가 돌려주는 "공개 가능한 상태"만 받는다. 이걸 `game_rounds.detail`처럼 읽을 수 있는 곳에 두면 덱이나 지뢰 위치가 그대로 노출된다.

**타이머/자동 진행**: Supabase는 상시 실행되는 게임 서버가 아니므로, 시간 기반 로직은 두 가지로 푼다.
- 요청이 들어올 때 서버가 경과 시간을 계산 (예: 크래시 배수는 `now() - started_at`으로 계산)
- 주기 작업이 필요하면 `pg_cron` 확장 사용 (로또 추첨, 방 타임아웃 정리 등)

### 1.5 Supabase 설정 체크리스트
- [ ] 프로젝트 생성, `Project URL`과 `anon key` 확보
- [ ] Auth: 이메일/비밀번호 활성화, 이메일 인증 여부 결정, 소셜 로그인(선택)
- [ ] Auth > URL Configuration에 **Site URL / Redirect URL로 GitHub Pages 주소 등록** (`https://<유저명>.github.io/<레포명>/`)
- [ ] `pgcrypto` 확장 활성화 (`gen_random_bytes` 사용)
- [ ] 모든 테이블 RLS 활성화
- [ ] SQL은 Studio에서 직접 치지 말고 `supabase/migrations/*.sql` 파일로 레포에 보관 (변경 이력 관리)
- [ ] 무료 플랜의 사용량 제한과, 장기간 미사용 시 프로젝트가 일시 정지될 수 있다는 점 확인

### 1.6 폴더 구조 (초안)

```
/
├─ index.html                 # 로비
├─ login.html                 # 로그인/회원가입
├─ games/
│   ├─ coinflip.html
│   ├─ rps.html
│   ├─ sword.html
│   └─ ...
├─ css/
│   ├─ base.css               # 변수, 리셋, 공통 레이아웃
│   └─ components.css         # 버튼, 배팅 패널, 모달
├─ js/
│   ├─ supabaseClient.js      # createClient
│   ├─ auth.js                # 로그인 상태 확인, 로그아웃
│   ├─ wallet.js              # 잔액 조회/갱신, 표시
│   ├─ ui/                    # 배팅 패널, 토스트, 사운드
│   └─ games/                 # 게임별 화면 로직 (coinflip.js ...)
├─ assets/                    # 이미지, 사운드
├─ supabase/migrations/       # SQL 파일
└─ docs/PLAN.md               # 이 문서
```

> GitHub Pages는 `https://유저명.github.io/레포명/` 형태의 하위 경로에서 서빙되는 경우가 많다. 링크와 리소스는 `/css/...` 같은 절대경로 대신 **상대경로**로 작성한다.

---

## 2. 게임 라인업

### 2.1 목록과 우선순위

| 우선순위 | 게임 | 유형 | 목표 RTP(초안) | 비고 |
|---|---|---|---|---|
| 1 | 코인플립 | 즉시 | 97.5% | 뼈대 검증용, 배당 1.95배 |
| 1 | 홀짝 | 즉시 | 97.5% | 코인플립과 동일 로직 |
| 1 | **가위바위보** | 즉시/멀티 | 97% | 4장 참고 |
| 1 | **검 강화** | 상태(아이템) | 의도적 손해(싱크) | 4장 참고 |
| 2 | 슬롯 | 즉시 | 94~96% | 릴 가중치 테이블 |
| 2 | 룰렛(유럽식) | 즉시 | 97.3% | 0 포함 37칸 |
| 2 | 블랙잭 | 상태 | 약 99% | 규칙에 따라 변동 |
| 3 | 하이로우 | 상태 | 97% | 연속 맞히기 + 캐시아웃 |
| 3 | 크래시 | 시간 기반 | 97% | 개인 라운드 방식 |
| 3 | 지뢰찾기 배팅 | 상태 | 97% | 안전 확률 기반 배수 |
| 3 | 플링코 | 즉시 | 96% | 서버가 경로 계산, 클라는 연출 |
| 3 | 스크래치 카드 | 즉시 | 90~95% | 등급별 당첨 테이블 |
| 4 | 바카라 | 즉시/상태 | 약 98.9% | 뱅커 5% 커미션 기준 |
| 4 | 크랩스 | 상태 | 약 98.6% | 패스라인 기준 |
| 4 | 식보 | 즉시 | 약 97% | 대/소 기준 |
| 4 | 가상 경마/경주 | 즉시 | 90~95% | 서버가 착순 시뮬레이션 |
| 4 | 키노 | 즉시 | 92~95% | 고른 숫자 수별 배당표 |
| 4 | 로또/빙고 | 주기형 | 별도 | `pg_cron`으로 정해진 시각 추첨 |
| 5 | 쓰리카드 포커 | 멀티 | 하우스 수수료 | 방식 확정 후 |
| 5 | 텍사스 홀덤 | 멀티 | 하우스 수수료 | Realtime 필수 |
| 5 | 고스톱 | 멀티 | 하우스 수수료 | 규칙이 복잡, 마지막에 |

### 2.2 RTP 검증 방식
- 각 게임의 배당표는 **Node 스크립트로 100만 회 이상 시뮬레이션**해서 실제 RTP가 목표와 맞는지 확인한 뒤 `game_config`에 반영한다.
- 운영 중에는 `game_rounds`를 집계해 게임별 실측 RTP를 SQL 뷰로 확인한다.

---

## 3. 공통 시스템

### 3.1 DB 스키마 (초안)

```sql
create extension if not exists pgcrypto with schema extensions;

-- 유저 프로필 + 지갑
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text unique not null,
  balance bigint not null default 10000 check (balance >= 0),
  xp bigint not null default 0,
  level int not null default 1,
  last_daily_claim date,
  created_at timestamptz not null default now()
);

-- 잔액 변동 원장 (모든 증감을 기록)
create table public.ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta bigint not null,               -- 증감액 (+/-)
  balance_after bigint not null,
  reason text not null,                -- 'game:coinflip', 'daily_bonus', 'shop:...'
  round_id bigint,
  created_at timestamptz not null default now()
);

-- 게임 1판의 기록
create table public.game_rounds (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game text not null,
  bet bigint not null,
  payout bigint not null default 0,
  detail jsonb not null default '{}',  -- 정산 후 공개해도 되는 결과만
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

-- 진행 중 게임의 비밀 상태 (덱, 지뢰 위치 등). select 정책 없음!
create table public.game_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game text not null,
  bet bigint not null,
  secret jsonb not null,               -- 서버만 접근
  public_state jsonb not null default '{}',
  started_at timestamptz not null default now()
);

-- 게임별 설정 (확률/배당/한도)
create table public.game_config (
  game text primary key,
  enabled boolean not null default true,
  min_bet bigint not null default 10,
  max_bet bigint not null default 100000,
  params jsonb not null default '{}'   -- 예: {"multiplier": 1.95}
);
```

### 3.2 가입 시 프로필 자동 생성

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, 'player_' || substr(new.id::text, 1, 8));
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
```

### 3.3 RLS 정책 (핵심: 읽기만 허용, 쓰기는 정책 없음)

```sql
alter table public.profiles      enable row level security;
alter table public.ledger        enable row level security;
alter table public.game_rounds   enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_config   enable row level security;

create policy "본인 프로필 조회" on public.profiles
  for select using (auth.uid() = id);
create policy "본인 원장 조회" on public.ledger
  for select using (auth.uid() = user_id);
create policy "본인 게임 기록 조회" on public.game_rounds
  for select using (auth.uid() = user_id);
create policy "설정 조회" on public.game_config
  for select using (true);

-- insert / update / delete 정책은 만들지 않는다.
-- game_sessions는 select 정책도 만들지 않는다.
-- → 클라이언트는 RPC(security definer 함수)로만 데이터를 바꿀 수 있다.
```

리더보드처럼 남의 정보가 필요한 화면은 닉네임과 잔액만 반환하는 별도 RPC(`get_leaderboard`)로 제공한다.

### 3.4 즉시형 게임 RPC 템플릿 (코인플립 예시)

```sql
create or replace function public.play_coinflip(p_bet bigint, p_choice text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions   -- security definer에는 search_path 지정 필수
as $$
declare
  v_uid uuid := auth.uid();
  v_cfg game_config%rowtype;
  v_balance bigint;
  v_new_balance bigint;
  v_result text;
  v_payout bigint := 0;
  v_round_id bigint;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_choice not in ('heads', 'tails') then raise exception 'INVALID_CHOICE'; end if;

  select * into v_cfg from game_config where game = 'coinflip' and enabled;
  if not found then raise exception 'GAME_DISABLED'; end if;
  if p_bet is null or p_bet < v_cfg.min_bet or p_bet > v_cfg.max_bet then
    raise exception 'INVALID_BET';
  end if;

  -- 잔액 행 잠금: 연타/동시 요청으로 잔액을 초과해 배팅하는 것을 방지
  select balance into v_balance from profiles where id = v_uid for update;
  if v_balance < p_bet then raise exception 'INSUFFICIENT_BALANCE'; end if;

  -- 난수: 암호학적 난수 1바이트 (0~255) 중 128 미만이면 앞면
  v_result := case when get_byte(gen_random_bytes(1), 0) < 128 then 'heads' else 'tails' end;

  if v_result = p_choice then
    v_payout := floor(p_bet * (v_cfg.params->>'multiplier')::numeric);
  end if;

  v_new_balance := v_balance - p_bet + v_payout;
  update profiles set balance = v_new_balance where id = v_uid;

  insert into game_rounds (user_id, game, bet, payout, detail, settled_at)
  values (v_uid, 'coinflip', p_bet, v_payout,
          jsonb_build_object('choice', p_choice, 'result', v_result), now())
  returning id into v_round_id;

  insert into ledger (user_id, delta, balance_after, reason, round_id)
  values (v_uid, v_payout - p_bet, v_new_balance, 'game:coinflip', v_round_id);

  return jsonb_build_object(
    'result', v_result,
    'win', v_payout > 0,
    'payout', v_payout,
    'balance', v_new_balance
  );
end $$;

-- 로그인한 유저만 호출 가능하게
revoke execute on function public.play_coinflip(bigint, text) from public, anon;
grant  execute on function public.play_coinflip(bigint, text) to authenticated;

insert into public.game_config (game, params)
values ('coinflip', '{"multiplier": 1.95}');
```

프론트에서 호출:

```js
const { data, error } = await supabase.rpc('play_coinflip', {
  p_bet: 100,
  p_choice: 'heads',
});
// data = { result, win, payout, balance }  → 이걸 받아서 동전 애니메이션만 재생
```

> 나머지 즉시형 게임(슬롯, 룰렛, 스크래치 등)도 같은 뼈대에서 "난수 → 판정" 부분만 바꾸면 된다.

---

## 4. 특별 콘텐츠 상세

## 4.1 검 강화

### 컨셉
돈을 써서 검을 강화하고, 높은 단계에 도전할지 멈추고 팔지를 고민하게 만드는 게임. 강화 자체가 이 프로젝트의 가장 큰 **돈 싱크(화폐 소각처)** 역할도 한다.

### 기본 규칙 (초안)
- 검은 `+0`부터 `+20`까지 강화 가능하다.
- 강화 시 **강화 비용**을 지불한다. 성공하면 +1, 실패 시 단계에 따라 결과가 달라진다.
- 비용 공식(초안): `cost(n) = floor(100 × 1.5^n)`, +0 → 100 / +10 → 약 5,700 / +20 → 약 332,000

### 성공률과 실패 결과 (초안)

| 구간 (현재 → 다음) | 성공률 | 실패 시 |
|---|---|---|
| +0 → +5 | 95% → 75% (단계당 5%p 감소) | 단계 유지 |
| +5 → +10 | 70% → 50% | 1단계 하락 |
| +10 → +15 | 45% → 25% | 1단계 하락 (5% 확률로 **파괴**) |
| +15 → +20 | 20% → 5% | 1단계 하락 (15% 확률로 **파괴**) |

### 아이템

| 아이템 | 효과 | 획득 |
|---|---|---|
| 보호권 | 실패 시 하락/파괴 1회 방지 | 상점 구매 |
| 강화 주문서 | 해당 강화의 성공률 +5%p | 상점 구매 / 출석 보상 |

### 판매
- **시스템 판매**: 판매가는 "해당 단계에 도달하는 평균 비용"보다 낮게(약 60~70%) 설정한다. 그래야 강화가 평균적으로 손해이고, 돈이 시스템에서 빠져나간다.
- **유저 거래소(후순위)**: 유저끼리 자유롭게 가격을 정해 거래하고, 판매 시 수수료를 뗀다.
- 평균 도달 비용은 Node 시뮬레이터로 계산해 판매가 표를 만든다.

### 재미 요소
- 단계별 검 이름/외형 (나무 검 → 철검 → … → 전설 검), 도감 (최초 도달 시 등록)
- 강화 연출: 대기 → 두근두근 사운드 → 성공/실패 이펙트, 화면 흔들림
- "최고 단계 검 보유자" 랭킹, +15 이상 달성 시 칭호

### 서버 구조
```
swords      (id, owner_id, level, name, created_at, destroyed_at)
items       (id, name, description, price)
inventory   (user_id, item_id, qty)
enhance_config  → game_config.params에 단계별 성공률/비용/판매가 배열로 저장

RPC: create_sword()                     -- +0 검 지급/구매
RPC: enhance_sword(sword_id, use_protect, use_boost)
     → 소유권 검증 → 비용 차감(잔액 잠금) → 난수 → 결과 반영 → 결과 JSON 반환
RPC: sell_sword(sword_id)               -- 서버에서 판매가 계산
```

---

## 4.2 가위바위보

### 모드 A: 하우스와 대결 (즉시형)
- 플레이어가 가위/바위/보 선택 → 서버가 하우스의 패를 **순수 난수**로 결정
- **무승부는 재대결**로 처리하고, 승리 시 **1.94배** 지급 (재대결 처리 시 실질 승률 50%, RTP 약 97%)
- **연승 챌린지**: 승리하면 배수가 누적(1.94 → 3.76 → 7.3 …)되고, 언제든 캐시아웃하거나 계속 도전. 패배 시 전액 소멸 (상태 유지형)

> **패턴 학습 AI를 넣고 싶다면**: 플레이어의 패턴을 읽는 AI는 하우스 엣지 계산이 깨진다. 배팅이 걸린 모드에서는 순수 난수를 유지하고, 패턴 AI는 **배팅 없는 연습 모드**나 별도 이벤트(보상 아이템 지급 등)로 분리한다.

### 모드 B: 플레이어 vs 플레이어 (멀티형)
- 방장이 배팅액을 정해 방을 생성 → 다른 유저가 참가 (양쪽 배팅액 잠금)
- 각자 패를 제출하면 서버가 판정하고, 승자가 상금에서 **수수료(예: 5%)를 뺀 금액**을 받는다.
- 무승부 시 재대결(최대 N회) 또는 환불
- **상대 패 비공개**: 제출한 패는 `rps_choices` 같은 **select 정책 없는 테이블**에 저장하고, 양쪽이 제출하면 서버가 판정한 뒤 결과 필드에 공개한다. (안 그러면 개발자 도구로 상대 패를 볼 수 있다.)
- 방 상태 변경은 Supabase Realtime으로 구독해서 화면에 반영
- **타임아웃**: 제한 시간 내 미제출 시 몰수패. 자동 처리는 `pg_cron`이나 다음 요청 시 검사(lazy)로 구현
- 이탈/새로고침으로 배팅금이 묶이지 않도록, 만료된 방은 환불 처리

---

## 5. 그 외 게임 구현 메모

| 게임 | 핵심 규칙/서버 처리 메모 |
|---|---|
| 슬롯 | 릴별 심볼 가중치 테이블을 `game_config`에 저장. 서버가 릴 위치 3개를 뽑고 페이라인 판정. 클라는 결과 위치로 스핀 애니메이션 |
| 룰렛 | 0~36 난수 1개. 배팅은 여러 칸/영역에 동시에 가능(배열로 받아 한 번에 정산) |
| 블랙잭 | 시작 시 서버가 셔플된 덱을 `game_sessions.secret`에 저장. `hit`/`stand`/`double` RPC마다 상태 전진. 딜러의 뒤집힌 카드는 종료 전까지 미공개 |
| 하이로우 | 현재 카드 공개, "높다/낮다" 선택. 배수 = `0.97 / 적중 확률`. 연속 성공 시 배수 누적, 캐시아웃 가능 |
| 크래시 | 시작 시 서버가 `crash_point`를 비공개로 결정 (`0.97 / (1 - r)`, r은 0~1 난수, 최소 1.00). 배수는 `f(now - started_at)`로 서버가 계산. 캐시아웃 요청 시점의 배수가 crash_point 이하면 성공. **처음엔 개인 라운드**로 만들고, 공용 라운드는 후순위 |
| 지뢰찾기 | N×N 칸에 지뢰 M개를 서버가 배치(비공개). 칸을 열 때마다 배수 = `0.97 × 1/(안전 칸을 연속으로 열 확률)` 누적 |
| 플링코 | 서버가 핀 경로(좌/우 시퀀스)를 난수로 결정해 도착 슬롯을 반환. 클라는 그 경로대로 공이 떨어지는 연출 |
| 스크래치 | 서버가 당첨 등급을 결정하고 그에 맞는 칸 배치를 반환. 클라는 긁는 연출 |
| 바카라 | 서버가 덱에서 카드를 뽑아 규칙(제3카드 룰)대로 진행하고 결과 전체를 반환 |
| 크랩스 | 코메아웃 롤 → 포인트 확정 → 포인트 롤. 상태 유지형(`game_sessions`) |
| 식보 | 주사위 3개. 대/소, 합계, 단일 숫자 등 다중 배팅 |
| 가상 경마 | 말별 능력치/배당을 정해두고 서버가 착순을 가중 난수로 시뮬레이션. 클라는 착순대로 레이스 연출 |
| 키노 | 1~80 중 N개 선택, 서버가 20개 추첨. 선택 수/적중 수별 배당표 |
| 로또/빙고 | 정해진 시각(`pg_cron`)에 추첨. 구매한 티켓은 `tickets` 테이블에 저장하고, 추첨 후 자동 정산 |
| 텍사스 홀덤 / 쓰리카드 / 고스톱 | 방(`tables`) + 좌석 + Realtime. 손패는 select 정책 없는 테이블, 턴 타임아웃 필수. **가장 나중에** |

---

## 6. 경제 설계

### 6.1 화폐 흐름

| 유입 (돈이 생기는 곳) | 유출/싱크 (돈이 사라지는 곳) |
|---|---|
| 가입 보너스 10,000 | 하우스 엣지 (게임별 RTP < 100%) |
| 일일 출석 보상 (연속 출석 시 증가) | 검 강화 비용, 검 시스템 판매가 < 강화 비용 |
| 파산 구제 | 상점 (보호권, 주문서, 꾸미기) |
| 업적/퀘스트 보상 | VIP룸 입장료, 거래 수수료, PvP 수수료 |

### 6.2 파산 구제
- 조건: 잔액이 최소 배팅액 미만이고 판매 가능한 검이 없을 때
- 지급: 1,000 코인, 쿨다운 있음 (예: 하루 1회)
- 목적: 파산해도 다시 시작할 수 있게 하되, 악용(계속 받기)은 막는다.

### 6.3 레벨/VIP
- 배팅액에 비례해 XP 획득 → 레벨업
- 레벨에 따라 **최대 배팅 한도 증가**, VIP룸(고배당·고한도 테이블) 해금, 칭호/프로필 꾸미기

### 6.4 리더보드/시즌
- 순자산(잔액 + 검 평가액) 기준 랭킹, 일간/주간/전체
- **시즌제 추천**: 4주 단위로 랭킹 보상(칭호 등)을 주고 잔액을 부분 초기화 → 상위권 고착과 인플레이션 방지

### 6.5 모니터링
- 하루 단위 총 통화량, 유입/유출량, 게임별 실측 RTP를 SQL 뷰로 조회
- 통화량이 계속 늘면 싱크를 늘리거나 보상을 줄이고, 줄기만 하면 구제·보너스를 늘린다.

---

## 7. 화면 / UX

### 7.1 화면 목록
1. 로그인 / 회원가입 / 비밀번호 재설정
2. 닉네임 설정 (최초 1회)
3. 로비 (게임 카드 목록, 내 잔액, 일일 보너스 버튼, 공지)
4. 게임 화면 (공통 레이아웃)
5. 대장간 (검 강화) / 인벤토리
6. 내 정보 (전적, 게임별 통계, 잔액 변동 내역)
7. 리더보드
8. 상점
9. 설정 (효과음/연출 스킵)

### 7.2 게임 화면 공통 레이아웃
- 상단: 잔액, 레벨/XP, 메뉴
- 중앙: 게임 영역
- 하단: **공통 배팅 패널** (금액 입력, ½ / 2× / MAX 버튼, 배팅 버튼) — 컴포넌트 하나를 모든 게임이 재사용
- 측면/하단: 최근 결과 기록, 오늘의 손익

### 7.3 UX 원칙
- **결과는 서버 응답 후에 연출**한다. 연출이 결과를 결정하지 않는다. 연출 스킵 버튼 제공.
- 배팅 버튼은 응답이 올 때까지 비활성화 (연타 방지, 서버에서도 잠금 처리하지만 UI에서도 막는다).
- 에러 코드(`INSUFFICIENT_BALANCE` 등)는 사용자 친화적 문구로 변환해 토스트로 표시.
- 모바일 우선 반응형. 효과음은 기본 낮은 볼륨 + 끄기 옵션.
- 화면 어딘가에 "**가상 화폐이며 실제 가치가 없습니다**" 문구 고정 표시.
- 텍스트(닉네임 등) 출력은 `innerHTML` 대신 `textContent` 사용 (XSS 방지).

---

## 8. 보안 · 운영 · 법적 주의

### 8.1 보안 체크리스트
- [ ] 모든 테이블 RLS 활성화, 잔액/기록에 대한 클라이언트 쓰기 정책 없음
- [ ] 게임 로직 RPC는 `security definer` + `set search_path` 지정
- [ ] RPC 실행 권한을 `authenticated`로 제한 (`anon`, `public` 회수)
- [ ] 잔액 변경 시 `select ... for update`로 행 잠금 (동시 요청 방지)
- [ ] 입력 검증: null, 음수, 소수, 범위 초과, 허용되지 않은 선택지
- [ ] 진행 중 게임의 비밀 상태는 select 정책 없는 테이블에 저장
- [ ] 초단시간 반복 호출 제한 (RPC 내부에서 최근 N초 내 라운드 수 확인)
- [ ] `service_role` 키는 절대 프론트/레포에 노출 금지 (`.env`, 커밋 전 확인)
- [ ] 다중 계정 어뷰징 대응: 이메일 인증, 가입 보너스 계정당 1회, 필요 시 소셜 로그인

### 8.2 운영
- 모든 잔액 변동은 `ledger`에 남기고, 이상 징후(짧은 시간 급증 등)는 쿼리로 점검
- 게임별 `enabled` 플래그로 문제가 생긴 게임을 즉시 끌 수 있게 한다.
- 밸런스 패치는 `game_config` 수정으로 처리하고 변경 이력을 남긴다.

### 8.3 법적/윤리적 주의 (법률 자문 아님)
- 실제 돈으로 코인을 살 수 있게 하거나, 코인·아이템을 현금·상품으로 바꿀 수 있게 하는 순간 도박 관련 규제 대상이 될 수 있다. **충전·환전·현금성 보상은 만들지 않는다.**
- 유료 아이템, 후원, 광고 수익 모델을 붙일 계획이 생기면 그 시점에 국내 게임/사행성 관련 규정을 별도로 확인한다.
- 불특정 다수에게 널리 공개할 계획이라면 연령 안내와 관련 법규(등급 분류 등)도 확인한다.
- 개인정보는 최소한(이메일, 닉네임)만 수집하고, 개인정보 처리 안내 문구를 둔다.

---

## 9. 개발 로드맵

### Phase 0. 환경 준비
- [ ] GitHub 레포 생성, Pages 배포 설정 (빈 `index.html`로 배포 확인)
- [ ] Supabase 프로젝트 생성, URL/anon key 연결 (`supabaseClient.js`)
- [ ] VS Code + Live Server로 로컬 개발 환경 확인
- **완료 기준**: 배포된 페이지에서 Supabase 연결 테스트 성공

### Phase 1. 뼈대
- [ ] 회원가입/로그인/로그아웃, 로그인 상태에 따른 화면 분기
- [ ] 스키마 + RLS 적용, 가입 시 프로필 자동 생성
- [ ] 지갑 표시, 공통 배팅 패널, 토스트
- [ ] **코인플립** 완성 (RPC → 결과 → 연출 → 잔액 갱신 → 원장 기록)
- **완료 기준**: 콘솔에서 `update profiles set balance = ...`를 시도해도 실패한다

### Phase 2. 특별 콘텐츠
- [ ] 가위바위보 (모드 A → 연승 챌린지 → 모드 B PvP)
- [ ] 검 강화 (강화/판매/보호권/도감) + 강화 시뮬레이터로 밸런스 검증
- [ ] 일일 보너스, 파산 구제

### Phase 3. 카지노 기본
- [ ] 슬롯, 룰렛, 블랙잭, 하이로우
- [ ] 리더보드, 내 정보(전적/원장)

### Phase 4. 확장
- [ ] 크래시, 지뢰찾기, 플링코, 스크래치, 키노, 홀짝
- [ ] 바카라, 크랩스, 식보, 가상 경마
- [ ] 레벨/VIP, 상점, 업적

### Phase 5. 멀티플레이 & 주기형
- [ ] 로또/빙고 (`pg_cron`)
- [ ] 쓰리카드 포커, 텍사스 홀덤, 고스톱
- [ ] 검 유저 거래소

### Phase 6. 다듬기
- [ ] 시즌제, 모니터링 뷰, 사운드/애니메이션 폴리싱, 모바일 최적화

---

## 10. 결정이 필요한 항목

| 항목 | 선택지 | 추천 |
|---|---|---|
| 로그인 방식 | 이메일만 / 소셜(Google, Discord) 추가 | 이메일 + 소셜 (어뷰징 감소) |
| 이메일 인증 | 사용 / 미사용 | 사용 (다중 계정 억제) |
| 랭킹 방식 | 누적 / 시즌제 | 시즌제 |
| 크래시 | 개인 라운드 / 공용 라운드 | 개인 라운드 먼저 |
| 가위바위보 패턴 AI | 배팅 모드에 적용 / 연습 모드만 | 연습 모드만 |
| 멀티플레이 범위 | 2인 PvP만 / 포커·고스톱까지 | 2인 PvP부터, 나머지는 반응 보고 |
| 검 거래소 | 시스템 판매만 / 유저 거래 포함 | 시스템 판매 먼저 |
| 테마/디자인 | 미정 | 카지노 느낌 통일 (색상 변수화) |