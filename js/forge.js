const walletBalanceEl = document.getElementById('wallet-balance');
const swordNameEl = document.getElementById('sword-name');
const swordLevelEl = document.getElementById('sword-level');
const successRateEl = document.getElementById('success-rate');
const upgradeCostEl = document.getElementById('upgrade-cost');
const forgeStatusEl = document.getElementById('forge-status');
const upgradeBtnEl = document.getElementById('upgrade-btn');
const sellBtnEl = document.getElementById('sell-btn');
const protectToggle = document.getElementById('protect-toggle');
const boostToggle = document.getElementById('boost-toggle');

let swordLevel = 0;
let swordName = '나무 검';

const swordNames = [
  '나무 검', '철 검', '강철 검', '용검', '전설 검',
];

function formatMoney(value) {
  return Number(value).toLocaleString('ko-KR');
}

function getBalance() {
  try {
    const raw = JSON.parse(localStorage.getItem('bakdo-casino-state') || '{"balance":10000}');
    return Number(raw.balance || 0);
  } catch (error) {
    return 10000;
  }
}

function setBalance(nextBalance) {
  const raw = JSON.parse(localStorage.getItem('bakdo-casino-state') || '{"balance":10000}');
  raw.balance = nextBalance;
  localStorage.setItem('bakdo-casino-state', JSON.stringify(raw));
}

function clearWarn() {
  forgeStatusEl.classList.remove('warn');
}

function getCost(level) {
  return Math.floor(100 * Math.pow(1.5, level));
}

function getSuccessRate(level) {
  const bands = [
    { min: 0, max: 5, rate: 0.95 },
    { min: 5, max: 10, rate: 0.7 },
    { min: 10, max: 15, rate: 0.45 },
    { min: 15, max: 20, rate: 0.2 },
  ];

  const selected = bands.find((band) => level >= band.min && level < band.max) || bands[bands.length - 1];
  return Math.round(selected.rate * 100);
}

function renderSwords() {
  const safeLevel = Math.min(Math.max(swordLevel, 0), 20);
  swordName = swordNames[Math.min(Math.floor(safeLevel / 5), swordNames.length - 1)] || '나무 검';

  swordNameEl.textContent = swordName;
  swordLevelEl.textContent = `+${safeLevel}`;
  upgradeCostEl.textContent = formatMoney(getCost(safeLevel));
  successRateEl.textContent = `${getSuccessRate(safeLevel)}%`;
  walletBalanceEl.textContent = formatMoney(getBalance());
}

function handleUpgrade() {
  const balance = getBalance();
  const cost = getCost(swordLevel);

  if (balance < cost) {
    forgeStatusEl.textContent = '게임 머니가 부족합니다.';
    forgeStatusEl.classList.add('warn');
    return;
  }

  const protectUsed = protectToggle.checked;
  const boostUsed = boostToggle.checked;
  const baseRate = getSuccessRate(swordLevel) / 100;
  const adjustedRate = Math.min(baseRate + (boostUsed ? 0.05 : 0), 1);
  const success = Math.random() < adjustedRate;

  setBalance(balance - cost);

  if (success) {
    swordLevel += 1;
    forgeStatusEl.textContent = `강화 성공! 현재 ${swordLevel}단계로 올라갔습니다.`;
    clearWarn();
  } else {
    const willBreak = swordLevel >= 10 && Math.random() < (swordLevel >= 15 ? 0.15 : 0.05);
    if (protectUsed && !willBreak) {
      forgeStatusEl.textContent = '보호권으로 파괴를 막았습니다. 단계 유지.';
      clearWarn();
    } else if (willBreak) {
      swordLevel = Math.max(0, swordLevel - 2);
      forgeStatusEl.textContent = '강화 실패! 검이 파괴되어 크게 하락했습니다.';
      forgeStatusEl.classList.add('warn');
    } else {
      swordLevel = Math.max(0, swordLevel - 1);
      forgeStatusEl.textContent = '강화 실패. 단계가 하락했습니다.';
      forgeStatusEl.classList.add('warn');
    }
  }

  renderSwords();
  if (swordLevel >= 20) {
    forgeStatusEl.textContent = '전설의 검을 완성했습니다!';
    clearWarn();
  }
}

function handleSell() {
  const currentBalance = getBalance();
  const sellPrice = 120 + swordLevel * 220;
  const nextBalance = currentBalance + sellPrice;

  setBalance(nextBalance);
  forgeStatusEl.textContent = `검을 판매해 ${formatMoney(sellPrice)} 코인을 받았습니다.`;
  swordLevel = 0;
  renderSwords();
}

upgradeBtnEl.addEventListener('click', handleUpgrade);
sellBtnEl.addEventListener('click', handleSell);
renderSwords();
