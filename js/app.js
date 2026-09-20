const STORAGE_KEY = 'bakdo-casino-state';

const defaultState = {
  balance: 10000,
  rounds: 0,
  wins: 0,
  history: [],
  activeGame: 'coinflip',
  selectedChoice: 'heads',
};

const gameConfig = {
  coinflip: {
    title: '코인플립',
    choices: [
      { value: 'heads', label: '앞면' },
      { value: 'tails', label: '뒷면' },
    ],
    multiplier: 1.95,
    description: '앞면 또는 뒷면을 선택해 1.95배의 보상을 노립니다.',
  },
  dice: {
    title: '다이스',
    choices: [
      { value: 1, label: '1' },
      { value: 2, label: '2' },
      { value: 3, label: '3' },
      { value: 4, label: '4' },
      { value: 5, label: '5' },
      { value: 6, label: '6' },
    ],
    multiplier: 5,
    description: '숫자를 맞히면 5배 보상을 받습니다.',
  },
  rps: {
    title: '가위바위보',
    choices: [
      { value: 'rock', label: '바위' },
      { value: 'paper', label: '보' },
      { value: 'scissors', label: '가위' },
    ],
    multiplier: 1.94,
    description: '컴퓨터와 대결해 승리하면 배당을 받습니다.',
  },
  roulette: {
    title: '룰렛',
    choices: [
      { value: 'red', label: '빨강' },
      { value: 'black', label: '검정' },
      { value: 'even', label: '짝수' },
      { value: 'odd', label: '홀수' },
    ],
    multiplier: 1.95,
    description: '색상과 홀짝으로 베팅해 룰렛 결과를 맞춥니다.',
  },
  slots: {
    title: '슬롯',
    choices: [
      { value: 'spin', label: '회전' },
    ],
    multiplier: 10,
    description: '3개 심볼이 맞으면 상금을 획득합니다.',
  },
  jackpot: {
    title: '잭팟',
    choices: [
      { value: 'jackpot', label: '잭팟' },
    ],
    multiplier: 50,
    description: '짜릿한 대박 기회를 준비했습니다.',
  },
  forge: {
    title: '검 강화',
    choices: [],
    multiplier: 0,
    description: '검을 강화하고 판매까지 진행할 수 있습니다.',
  },
};

let state = loadState();

const walletBalanceEl = document.getElementById('wallet-balance');
const betInputEl = document.getElementById('bet-input');
const playBtnEl = document.getElementById('play-btn');
const resultValueEl = document.getElementById('result-value');
const historyListEl = document.getElementById('history-list');
const gameTitleEl = document.getElementById('game-title');
const statsRoundsEl = document.getElementById('stats-rounds');
const statsWinrateEl = document.getElementById('stats-winrate');
const choiceButtonsEl = document.getElementById('choice-buttons');
const navButtons = document.querySelectorAll('.nav-btn');
const chipButtons = document.querySelectorAll('.chip-btn');

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return { ...defaultState };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      ...defaultState,
      ...parsed,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch (error) {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatMoney(value) {
  return Number(value).toLocaleString('ko-KR');
}

function setResult(text) {
  resultValueEl.textContent = text;
}

function updateWallet() {
  walletBalanceEl.textContent = formatMoney(state.balance);
}

function updateStats() {
  const winRate = state.rounds === 0 ? 0 : Math.round((state.wins / state.rounds) * 100);
  statsRoundsEl.textContent = String(state.rounds);
  statsWinrateEl.textContent = `${winRate}%`;
}

function renderHistory() {
  historyListEl.innerHTML = '';

  const items = state.history.slice(0, 8);

  items.forEach((entry) => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    const value = document.createElement('strong');

    label.textContent = `${entry.game} · ${entry.summary}`;
    value.textContent = entry.result;
    value.className = entry.outcome === 'win' ? 'win-text' : 'lose-text';

    li.append(label, value);
    historyListEl.appendChild(li);
  });
}

function renderChoiceButtons() {
  const config = gameConfig[state.activeGame];
  const availableChoices = config.choices || [];
  choiceButtonsEl.innerHTML = '';

  if (availableChoices.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'choice-btn inactive';
    placeholder.textContent = '준비중';
    placeholder.style.opacity = '0.7';
    choiceButtonsEl.appendChild(placeholder);
    return;
  }

  availableChoices.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice-btn';
    button.textContent = option.label;
    button.dataset.value = String(option.value);

    if (String(state.selectedChoice) === String(option.value)) {
      button.classList.add('active');
    }

    button.addEventListener('click', () => {
      state.selectedChoice = option.value;
      renderChoiceButtons();
    });

    choiceButtonsEl.appendChild(button);
  });
}

function updateGameTitle() {
  const config = gameConfig[state.activeGame];
  gameTitleEl.textContent = config.title;
  setResult(config.description);
}

function syncSelectionForGame() {
  const config = gameConfig[state.activeGame];
  if (config.choices.length > 0) {
    state.selectedChoice = config.choices[0].value;
  }
}

function setActiveGame(gameKey) {
  if (!gameConfig[gameKey]) {
    return;
  }

  state.activeGame = gameKey;
  syncSelectionForGame();

  navButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.game === gameKey);
  });

  updateGameTitle();
  renderChoiceButtons();
}

function addHistory({ game, summary, result, outcome }) {
  state.history.unshift({ game, summary, result, outcome });
  state.history = state.history.slice(0, 12);
  renderHistory();
}

function updateAll() {
  updateWallet();
  updateStats();
  renderHistory();
  updateGameTitle();
  renderChoiceButtons();
}

function resolveCoinFlip() {
  const choice = String(state.selectedChoice);
  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const bet = Number(betInputEl.value) || 0;

  if (bet < 10 || bet > 500000) {
    setResult('배팅 금액은 10~500,000 사이로 조정해 주세요.');
    return;
  }

  if (state.balance < bet) {
    setResult('게임 머니가 부족합니다.');
    return;
  }

  let payout = 0;
  let outcome = 'lose';
  let message = `${choice === result ? '승리' : '패배'} · ${result === 'heads' ? '앞면' : '뒷면'}`;

  if (choice === result) {
    payout = Math.floor(bet * gameConfig.coinflip.multiplier);
    outcome = 'win';
    state.balance = state.balance - bet + payout;
    message = `승리 · ${result === 'heads' ? '앞면' : '뒷면'} / +${formatMoney(payout)}`;
  } else {
    state.balance -= bet;
    message = `패배 · ${result === 'heads' ? '앞면' : '뒷면'} / -${formatMoney(bet)}`;
  }

  state.rounds += 1;
  if (outcome === 'win') state.wins += 1;

  addHistory({
    game: gameConfig.coinflip.title,
    summary: `배팅 ${formatMoney(bet)}`,
    result: message,
    outcome,
  });

  saveState();
  updateAll();
  setResult(message);
}

function resolveDice() {
  const bet = Number(betInputEl.value) || 0;
  const guess = Number(state.selectedChoice);
  const roll = Math.floor(Math.random() * 6) + 1;

  if (bet < 10 || bet > 500000) {
    setResult('배팅 금액은 10~500,000 사이로 조정해 주세요.');
    return;
  }

  if (state.balance < bet) {
    setResult('게임 머니가 부족합니다.');
    return;
  }

  let payout = 0;
  let outcome = 'lose';
  let message = `주사위 ${roll} / ${guess}번 선택`;

  if (guess === roll) {
    payout = Math.floor(bet * gameConfig.dice.multiplier);
    state.balance = state.balance - bet + payout;
    outcome = 'win';
    state.wins += 1;
    message = `승리 · ${roll} / +${formatMoney(payout)}`;
  } else {
    state.balance -= bet;
    message = `패배 · ${roll} / -${formatMoney(bet)}`;
  }

  state.rounds += 1;

  addHistory({
    game: gameConfig.dice.title,
    summary: `배팅 ${formatMoney(bet)}`,
    result: message,
    outcome,
  });

  saveState();
  updateAll();
  setResult(message);
}

function resolveRps() {
  const bet = Number(betInputEl.value) || 0;
  const player = String(state.selectedChoice);
  const hands = ['rock', 'paper', 'scissors'];
  const computer = hands[Math.floor(Math.random() * hands.length)];
  const map = {
    rock: { rock: 'draw', paper: 'lose', scissors: 'win' },
    paper: { rock: 'win', paper: 'draw', scissors: 'lose' },
    scissors: { rock: 'lose', paper: 'win', scissors: 'draw' },
  };

  if (bet < 10 || bet > 500000) {
    setResult('배팅 금액은 10~500,000 사이로 조정해 주세요.');
    return;
  }

  if (state.balance < bet) {
    setResult('게임 머니가 부족합니다.');
    return;
  }

  const resultType = map[player][computer];
  let payout = 0;
  let outcome = 'lose';
  let message = `상대 ${computer} / 패배`;

  if (resultType === 'win') {
    payout = Math.floor(bet * gameConfig.rps.multiplier);
    state.balance = state.balance - bet + payout;
    outcome = 'win';
    state.wins += 1;
    message = `승리 · 상대 ${computer} / +${formatMoney(payout)}`;
  } else if (resultType === 'draw') {
    state.rounds += 1;
    addHistory({
      game: gameConfig.rps.title,
      summary: `배팅 ${formatMoney(bet)}`,
      result: `무승부 · 상대 ${computer}`,
      outcome: 'draw',
    });
    saveState();
    updateAll();
    setResult(`무승부 · 상대 ${computer}`);
    return;
  } else {
    state.balance -= bet;
    message = `패배 · 상대 ${computer} / -${formatMoney(bet)}`;
  }

  state.rounds += 1;

  addHistory({
    game: gameConfig.rps.title,
    summary: `배팅 ${formatMoney(bet)}`,
    result: message,
    outcome,
  });

  saveState();
  updateAll();
  setResult(message);
}

function resolveRoulette() {
  const bet = Number(betInputEl.value) || 0;
  const color = ['red', 'black'];
  const result = color[Math.floor(Math.random() * color.length)];
  const guess = String(state.selectedChoice);

  if (bet < 10 || bet > 500000) {
    setResult('배팅 금액은 10~500,000 사이로 조정해 주세요.');
    return;
  }

  if (state.balance < bet) {
    setResult('게임 머니가 부족합니다.');
    return;
  }

  const isWin = guess === result || (guess === 'even' && Math.random() < 0.5) || (guess === 'odd' && Math.random() >= 0.5);
  let payout = 0;

  if (isWin) {
    payout = Math.floor(bet * gameConfig.roulette.multiplier);
    state.balance = state.balance - bet + payout;
    state.rounds += 1;
    state.wins += 1;
    addHistory({
      game: gameConfig.roulette.title,
      summary: `배팅 ${formatMoney(bet)}`,
      result: `승리 · ${result} / +${formatMoney(payout)}`,
      outcome: 'win',
    });
    saveState();
    updateAll();
    setResult(`승리 · ${result} / +${formatMoney(payout)}`);
    return;
  }

  state.balance -= bet;
  state.rounds += 1;
  addHistory({
    game: gameConfig.roulette.title,
    summary: `배팅 ${formatMoney(bet)}`,
    result: `패배 · ${result} / -${formatMoney(bet)}`,
    outcome: 'lose',
  });

  saveState();
  updateAll();
  setResult(`패배 · ${result} / -${formatMoney(bet)}`);
}

function resolveSlots() {
  const bet = Number(betInputEl.value) || 0;
  const symbols = ['7', '🍒', '⭐', '💎'];
  const roll = Array.from({ length: 3 }, () => symbols[Math.floor(Math.random() * symbols.length)]);

  if (bet < 10 || bet > 500000) {
    setResult('배팅 금액은 10~500,000 사이로 조정해 주세요.');
    return;
  }

  if (state.balance < bet) {
    setResult('게임 머니가 부족합니다.');
    return;
  }

  const win = roll.every((v) => v === roll[0]);
  let payout = 0;

  if (win) {
    payout = Math.floor(bet * gameConfig.slots.multiplier);
    state.balance = state.balance - bet + payout;
    state.rounds += 1;
    state.wins += 1;
    addHistory({
      game: gameConfig.slots.title,
      summary: `배팅 ${formatMoney(bet)}`,
      result: `승리 · ${roll.join(' ')} / +${formatMoney(payout)}`,
      outcome: 'win',
    });
    saveState();
    updateAll();
    setResult(`승리 · ${roll.join(' ')} / +${formatMoney(payout)}`);
    return;
  }

  state.balance -= bet;
  state.rounds += 1;
  addHistory({
    game: gameConfig.slots.title,
    summary: `배팅 ${formatMoney(bet)}`,
    result: `패배 · ${roll.join(' ')} / -${formatMoney(bet)}`,
    outcome: 'lose',
  });

  saveState();
  updateAll();
  setResult(`패배 · ${roll.join(' ')} / -${formatMoney(bet)}`);
}

function resolveJackpot() {
  const bet = Number(betInputEl.value) || 0;
  if (bet < 10 || bet > 500000) {
    setResult('배팅 금액은 10~500,000 사이로 조정해 주세요.');
    return;
  }

  if (state.balance < bet) {
    setResult('게임 머니가 부족합니다.');
    return;
  }

  const jackpotChance = Math.random();
  let payout = 0;

  if (jackpotChance < 0.08) {
    payout = Math.floor(bet * gameConfig.jackpot.multiplier);
    state.balance = state.balance - bet + payout;
    state.rounds += 1;
    state.wins += 1;
    addHistory({
      game: gameConfig.jackpot.title,
      summary: `배팅 ${formatMoney(bet)}`,
      result: `잭팟! +${formatMoney(payout)}`,
      outcome: 'win',
    });
    saveState();
    updateAll();
    setResult(`잭팟! +${formatMoney(payout)}`);
    return;
  }

  state.balance -= bet;
  state.rounds += 1;
  addHistory({
    game: gameConfig.jackpot.title,
    summary: `배팅 ${formatMoney(bet)}`,
    result: `패배 · -${formatMoney(bet)}`,
    outcome: 'lose',
  });

  saveState();
  updateAll();
  setResult(`패배 · -${formatMoney(bet)}`);
}

function handlePlay() {
  if (state.activeGame === 'coinflip') {
    resolveCoinFlip();
    return;
  }

  if (state.activeGame === 'dice') {
    resolveDice();
    return;
  }

  if (state.activeGame === 'rps') {
    resolveRps();
    return;
  }

  if (state.activeGame === 'roulette') {
    resolveRoulette();
    return;
  }

  if (state.activeGame === 'slots') {
    resolveSlots();
    return;
  }

  if (state.activeGame === 'jackpot') {
    resolveJackpot();
    return;
  }

  setResult('검 강화는 검 강화 페이지에서 진행하세요.');
}

function handleDailyBonus() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const lastClaim = localStorage.getItem('bakdo-daily-claim');

  if (lastClaim === todayKey) {
    setResult('오늘은 이미 5,000 코인을 받았습니다.');
    return;
  }

  state.balance += 5000;
  localStorage.setItem('bakdo-daily-claim', todayKey);
  setResult('일일 보너스 5,000 코인을 받았습니다.');
  saveState();
  updateAll();
}

function resetBalance() {
  state.balance = defaultState.balance;
  state.rounds = 0;
  state.wins = 0;
  state.history = [];
  setResult('잔액을 초기화했습니다.');
  saveState();
  updateAll();
}

navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setActiveGame(button.dataset.game);
  });
});

chipButtons.forEach((button) => {
  button.addEventListener('click', () => {
    betInputEl.value = button.dataset.chip;
  });
});

playBtnEl.addEventListener('click', handlePlay);
document.getElementById('daily-btn').addEventListener('click', handleDailyBonus);
document.getElementById('reset-btn').addEventListener('click', resetBalance);

setActiveGame(state.activeGame);
updateAll();
