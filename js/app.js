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
  lottery: {
    title: '복권',
    choices: [
      { value: 'bronze', label: '브론즈 100' },
      { value: 'silver', label: '실버 1,000' },
      { value: 'cat', label: '고양이 10,000' },
    ],
    multiplier: 1,
    description: '캔버스를 긁어 복권 결과를 확인하세요.',
  },
  forge: {
    title: '검 강화',
    choices: [],
    multiplier: 0,
    description: '검을 강화하고 판매까지 진행할 수 있습니다.',
  },
};

const lotteryTicketConfig = {
  bronze: {
    type: 'bronze',
    label: '브론즈 복권',
    price: 100,
    holes: 3,
    radius: 28,
    emoji: '🥉',
  },
  silver: {
    type: 'silver',
    label: '실버 복권',
    price: 1000,
    holes: 5,
    radius: 26,
    emoji: '🥈',
  },
  cat: {
    type: 'cat',
    label: '고양이 복권',
    price: 10000,
    holes: 5,
    radius: 26,
    emoji: '🐾',
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
const diceSceneEl = document.getElementById('dice-scene');
const diceCubeEl = document.getElementById('dice-cube');
const jackpotSceneEl = document.getElementById('jackpot-scene');
const jackpotWheelEl = document.getElementById('jackpot-wheel');
const slotsSceneEl = document.getElementById('slots-scene');
const slotsReelsEl = document.getElementById('slots-reels');
const lotterySceneEl = document.getElementById('lottery-scene');
const lotteryCanvasEl = document.getElementById('lottery-canvas');
const slotSymbols = ['7', '🍒', '⭐', '💎', 'BAR', '777'];

const diceFaceMap = {
  1: 'rotateX(0deg) rotateY(0deg)',
  2: 'rotateY(90deg) rotateZ(-90deg)',
  3: 'rotateX(-90deg) rotateZ(0deg)',
  4: 'rotateX(90deg) rotateZ(0deg)',
  5: 'rotateY(-90deg) rotateZ(90deg)',
  6: 'rotateX(180deg) rotateY(180deg)',
};

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

function setupSlotsScene() {
  if (!slotsReelsEl) {
    return;
  }

  slotsReelsEl.innerHTML = '';
  const reelCount = 3;

  for (let reelIndex = 0; reelIndex < reelCount; reelIndex += 1) {
    const reel = document.createElement('div');
    reel.className = 'slot-reel';

    const track = document.createElement('div');
    track.className = 'slot-track';

    const repeatedSymbols = [...slotSymbols, ...slotSymbols, ...slotSymbols, ...slotSymbols];
    repeatedSymbols.forEach((symbol) => {
      const item = document.createElement('div');
      item.className = 'slot-item';
      item.textContent = symbol;
      track.appendChild(item);
    });

    reel.appendChild(track);
    slotsReelsEl.appendChild(reel);
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

  if (diceSceneEl) {
    diceSceneEl.classList.toggle('hidden', gameKey !== 'dice');
  }

  if (jackpotSceneEl) {
    jackpotSceneEl.classList.toggle('hidden', gameKey !== 'jackpot');
  }

  if (slotsSceneEl) {
    slotsSceneEl.classList.toggle('hidden', gameKey !== 'slots');
  }

  if (lotterySceneEl) {
    lotterySceneEl.classList.toggle('hidden', gameKey !== 'lottery');
  }

  if (gameKey === 'lottery') {
    prepareLotteryBoard();
  }

  updateGameTitle();
  renderChoiceButtons();
}

function animateDiceRoll(finalValue, callback) {
  if (!diceSceneEl || !diceCubeEl) {
    callback();
    return;
  }

  diceSceneEl.classList.remove('hidden');
  diceCubeEl.classList.add('dice-rolling');

  const cycle = [1, 2, 3, 4, 5, 6, 2, 5, 3, 1, 6, 4];
  let index = 0;

  const timer = setInterval(() => {
    const value = cycle[index % cycle.length];
    diceCubeEl.style.transform = diceFaceMap[value] || diceFaceMap[1];
    index += 1;
  }, 90);

  setTimeout(() => {
    clearInterval(timer);
    diceCubeEl.classList.remove('dice-rolling');
    diceCubeEl.style.transform = diceFaceMap[finalValue] || diceFaceMap[1];
    setTimeout(() => callback(), 180);
  }, 900);
}

function animateJackpotSpin(finalIndex, callback) {
  if (!jackpotSceneEl || !jackpotWheelEl) {
    callback();
    return;
  }

  jackpotSceneEl.classList.remove('hidden');
  const totalTurns = 6;
  const baseRotation = 360 * totalTurns;
  const singleStep = 360 / 8;
  const offset = 360 - (finalIndex * singleStep + singleStep / 2);
  const finalRotation = baseRotation + offset;

  jackpotWheelEl.style.transform = `rotate(${finalRotation}deg)`;

  setTimeout(() => callback(), 2800);
}

function animateSlotsSpin(finalSymbols, callback) {
  if (!slotsSceneEl || !slotsReelsEl) {
    callback();
    return;
  }

  slotsSceneEl.classList.remove('hidden');
  const reels = Array.from(slotsReelsEl.querySelectorAll('.slot-reel'));

  reels.forEach((reel, index) => {
    const track = reel.querySelector('.slot-track');
    const items = Array.from(track.children);
    if (!items.length) return;

    const itemHeight = items[0].offsetHeight + 10;
    const randomOffset = Math.floor(Math.random() * 16 + 8) * itemHeight;
    const targetSymbol = finalSymbols[index];
    let targetOffset = 0;

    for (let i = 0; i < items.length; i += 1) {
      if (items[i].textContent === targetSymbol) {
        targetOffset = i * itemHeight;
      }
    }

    track.style.transition = 'none';
    track.style.transform = `translateY(-${randomOffset}px)`;

    setTimeout(() => {
      track.style.transition = 'transform 1.7s cubic-bezier(0.12, 0.8, 0.2, 1)';
      track.style.transform = `translateY(-${targetOffset}px)`;
    }, 80 + index * 110);
  });

  setTimeout(callback, 1900);
}

function getLotterySymbolsForType(type) {
  const config = lotteryTicketConfig[type] || lotteryTicketConfig.bronze;
  const symbols = ['6', '체리', '별', '7'];
  const results = [];

  for (let i = 0; i < config.holes; i += 1) {
    const roll = Math.random();
    let chosen = '체리';

    if (roll < 0.15) {
      chosen = '6';
    } else if (roll < 0.85) {
      chosen = '체리';
    } else if (roll < 0.95) {
      chosen = '별';
    } else {
      chosen = '7';
    }

    results.push(chosen);
  }

  return results;
}

function getLotteryHolePositions(type) {
  const cfg = lotteryTicketConfig[type] || lotteryTicketConfig.bronze;

  if (type === 'bronze') {
    return [
      { x: 86, y: 96, r: cfg.radius },
      { x: 180, y: 96, r: cfg.radius },
      { x: 274, y: 96, r: cfg.radius },
    ];
  }

  if (type === 'silver') {
    return [
      { x: 68, y: 82, r: cfg.radius },
      { x: 132, y: 82, r: cfg.radius },
      { x: 196, y: 82, r: cfg.radius },
      { x: 260, y: 82, r: cfg.radius },
      { x: 324, y: 82, r: cfg.radius },
    ];
  }

  return [
    { x: 112, y: 116, r: 24 },
    { x: 196, y: 78, r: 20 },
    { x: 280, y: 116, r: 24 },
    { x: 196, y: 168, r: 20 },
    { x: 196, y: 116, r: 38 },
  ];
}

function prepareLotteryBoard() {
  if (!lotteryCanvasEl) {
    return;
  }

  const type = state.selectedChoice || 'bronze';
  const config = lotteryTicketConfig[type] || lotteryTicketConfig.bronze;
  const canvas = lotteryCanvasEl;
  const ctx = canvas.getContext('2d');
  const positions = getLotteryHolePositions(type);
  const symbols = getLotterySymbolsForType(type);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#f4d58d');
  gradient.addColorStop(0.25, '#eaaf3d');
  gradient.addColorStop(0.7, '#efc86d');
  gradient.addColorStop(1, '#bf8930');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(18, 25, 42, 0.9)';
  ctx.fillRect(18, 16, canvas.width - 36, canvas.height - 32);

  ctx.fillStyle = '#f4d58d';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`${config.label} · ${config.price} 코인`, 32, 42);

  positions.forEach((hole, index) => {
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2);
    ctx.fillStyle = '#e8eefc';
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(hole.x, hole.y, hole.r - 8, 0, Math.PI * 2);
    ctx.fillStyle = '#dfe7ff';
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbols[index], hole.x, hole.y + 2);
  });

  ctx.fillStyle = 'rgba(15, 20, 30, 0.72)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cardState = {
    type,
    cells: positions.map((pos, index) => ({ ...pos, symbol: symbols[index] })),
    scratched: 0,
    resolved: false,
  };

  canvas._lotteryState = cardState;
  canvas._lotteryIsScratching = false;

  canvas.onmousedown = (event) => {
    const point = getCanvasPoint(event, canvas);
    canvas._lotteryIsScratching = true;
    scratchLotteryAtPoint(point.x, point.y, canvas);
  };

  canvas.onmousemove = (event) => {
    if (!canvas._lotteryIsScratching || canvas._lotteryState.resolved) return;
    const point = getCanvasPoint(event, canvas);
    scratchLotteryAtPoint(point.x, point.y, canvas);
  };

  canvas.onmouseup = () => {
    canvas._lotteryIsScratching = false;
    finishLotteryIfNeeded(canvas);
  };

  canvas.onmouseleave = () => {
    canvas._lotteryIsScratching = false;
    finishLotteryIfNeeded(canvas);
  };
}

function getCanvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function scratchLotteryAtPoint(x, y, canvas) {
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();
  ctx.restore();

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = image.data;
  let cleared = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 0) {
      cleared += 1;
    }
  }

  const totalPixels = canvas.width * canvas.height;
  const ratio = cleared / totalPixels;
  canvas._lotteryState.scratched = ratio;
}

function finishLotteryIfNeeded(canvas) {
  if (!canvas || !canvas._lotteryState || canvas._lotteryState.resolved) return;

  if (canvas._lotteryState.scratched > 0.35) {
    canvas._lotteryState.resolved = true;
    resolveLotteryFromCanvas(canvas);
  }
}

function resolveLotteryFromCanvas(canvas) {
  const stateForTicket = canvas._lotteryState;
  const ticketType = stateForTicket.type;
  const ticketConfig = lotteryTicketConfig[ticketType] || lotteryTicketConfig.bronze;
  const ticketValue = ticketConfig.price;
  const symbolCounts = { '6': 0, '체리': 0, '별': 0, '7': 0 };

  stateForTicket.cells.forEach((cell) => {
    symbolCounts[cell.symbol] += 1;
  });

  let payout = 0;
  payout -= symbolCounts['6'] * ticketValue * 2;
  payout += Math.floor(symbolCounts['체리'] / 2) * ticketValue;
  payout += symbolCounts['별'] * ticketValue * 3;
  payout += symbolCounts['7'] * ticketValue * 300;

  const resultText = payout > 0
    ? `복권 결과: ${ticketConfig.label} / +${formatMoney(payout)}`
    : `복권 결과: ${ticketConfig.label} / -${formatMoney(Math.abs(payout))}`;

  if (payout > 0) {
    state.balance = state.balance - ticketValue + payout;
    state.rounds += 1;
    state.wins += 1;
    addHistory({
      game: gameConfig.lottery.title,
      summary: `${ticketConfig.label} ${formatMoney(ticketValue)}`,
      result: resultText,
      outcome: 'win',
    });
  } else {
    state.balance -= ticketValue;
    state.rounds += 1;
    addHistory({
      game: gameConfig.lottery.title,
      summary: `${ticketConfig.label} ${formatMoney(ticketValue)}`,
      result: resultText,
      outcome: 'lose',
    });
  }

  saveState();
  updateAll();
  setResult(resultText);
  playBtnEl.disabled = false;
  playBtnEl.textContent = '게임 실행';
}

function resolveLottery() {
  const type = state.selectedChoice || 'bronze';
  const config = lotteryTicketConfig[type] || lotteryTicketConfig.bronze;
  const price = config.price;

  if (state.balance < price) {
    setResult('게임 머니가 부족합니다.');
    return;
  }

  if (!lotteryCanvasEl) {
    setResult('복권 캔버스를 불러오지 못했습니다.');
    return;
  }

  prepareLotteryBoard();
  setResult('캔버스를 긁어 결과를 확인하세요.');
  playBtnEl.disabled = true;
  playBtnEl.textContent = '복권 긁는 중...';
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

  if (bet < 10 || bet > 500000) {
    setResult('배팅 금액은 10~500,000 사이로 조정해 주세요.');
    return;
  }

  if (state.balance < bet) {
    setResult('게임 머니가 부족합니다.');
    return;
  }

  const roll = Math.floor(Math.random() * 6) + 1;
  playBtnEl.disabled = true;
  playBtnEl.textContent = '주사위 굴리는 중...';

  animateDiceRoll(roll, () => {
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
    playBtnEl.disabled = false;
    playBtnEl.textContent = '게임 실행';
  });
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
  const symbols = ['7', '🍒', '⭐', '💎', 'BAR', '777'];
  const roll = Array.from({ length: 3 }, () => symbols[Math.floor(Math.random() * symbols.length)]);

  if (bet < 10 || bet > 500000) {
    setResult('배팅 금액은 10~500,000 사이로 조정해 주세요.');
    return;
  }

  if (state.balance < bet) {
    setResult('게임 머니가 부족합니다.');
    return;
  }

  playBtnEl.disabled = true;
  playBtnEl.textContent = '릴 돌리는 중...';

  animateSlotsSpin(roll, () => {
    const win = roll.every((v) => v === roll[0]);
    let payout = 0;
    let resultText = `패배 · ${roll.join(' ')} / -${formatMoney(bet)}`;

    if (win) {
      payout = Math.floor(bet * gameConfig.slots.multiplier);
      state.balance = state.balance - bet + payout;
      state.rounds += 1;
      state.wins += 1;
      resultText = `승리 · ${roll.join(' ')} / +${formatMoney(payout)}`;
      addHistory({
        game: gameConfig.slots.title,
        summary: `배팅 ${formatMoney(bet)}`,
        result: resultText,
        outcome: 'win',
      });
    } else {
      state.balance -= bet;
      state.rounds += 1;
      addHistory({
        game: gameConfig.slots.title,
        summary: `배팅 ${formatMoney(bet)}`,
        result: resultText,
        outcome: 'lose',
      });
    }

    saveState();
    updateAll();
    setResult(resultText);
    playBtnEl.disabled = false;
    playBtnEl.textContent = '게임 실행';
  });
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

  const wheelSymbols = ['7', 'BAR', '★', '777', '7', 'CHERRY', 'BAR', '7'];
  const finalIndex = Math.floor(Math.random() * wheelSymbols.length);
  const finalSymbol = wheelSymbols[finalIndex];
  const isWinner = finalSymbol.includes('7') || finalSymbol === '777';

  playBtnEl.disabled = true;
  playBtnEl.textContent = '룰렛 돌리는 중...';

  animateJackpotSpin(finalIndex, () => {
    let payout = 0;
    let resultText = `패배 · ${finalSymbol} / -${formatMoney(bet)}`;

    if (isWinner) {
      payout = Math.floor(bet * gameConfig.jackpot.multiplier);
      state.balance = state.balance - bet + payout;
      state.rounds += 1;
      state.wins += 1;
      resultText = `잭팟! ${finalSymbol} / +${formatMoney(payout)}`;
      addHistory({
        game: gameConfig.jackpot.title,
        summary: `배팅 ${formatMoney(bet)}`,
        result: resultText,
        outcome: 'win',
      });
    } else {
      state.balance -= bet;
      state.rounds += 1;
      addHistory({
        game: gameConfig.jackpot.title,
        summary: `배팅 ${formatMoney(bet)}`,
        result: resultText,
        outcome: 'lose',
      });
    }

    saveState();
    updateAll();
    setResult(resultText);
    playBtnEl.disabled = false;
    playBtnEl.textContent = '게임 실행';
  });
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

  if (state.activeGame === 'lottery') {
    resolveLottery();
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

setupSlotsScene();
setActiveGame(state.activeGame);
updateAll();
