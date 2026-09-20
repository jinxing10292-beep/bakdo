const inventoryListEl = document.getElementById('inventory-list');
const walletBalanceEl = document.getElementById('wallet-balance');
const shopItemsEl = document.getElementById('shop-items');

const shopItems = [
  { id: 'protect', name: '보호권', price: 2000, desc: '강화 실패 시 1회 보호', type: 'item' },
  { id: 'boost', name: '강화 주문서', price: 1500, desc: '강화 성공률 +5%p', type: 'item' },
  { id: 'starter-sword', name: '나무 검', price: 500, desc: '기본 장비', type: 'sword' },
  { id: 'steel-sword', name: '철 검', price: 2200, desc: '초반용 버전', type: 'sword' },
];

const inventory = [
  { name: '보호권', qty: 1 },
  { name: '강화 주문서', qty: 2 },
];

function formatMoney(value) {
  return Number(value).toLocaleString('ko-KR');
}

function getState() {
  try {
    return JSON.parse(localStorage.getItem('bakdo-casino-state') || '{"balance":10000,"history":[],"rounds":0,"wins":0}');
  } catch (error) {
    return { balance: 10000, history: [], rounds: 0, wins: 0 };
  }
}

function saveState(nextState) {
  localStorage.setItem('bakdo-casino-state', JSON.stringify(nextState));
}

function renderWallet() {
  const state = getState();
  walletBalanceEl.textContent = formatMoney(state.balance || 0);
}

function renderShop() {
  shopItemsEl.innerHTML = '';

  shopItems.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'shop-card';

    card.innerHTML = `
      <div>
        <p class="item-kind">${item.type === 'sword' ? '무기' : '아이템'}</p>
        <h3>${item.name}</h3>
      </div>
      <p>${item.desc}</p>
      <div class="shop-actions">
        <strong>${formatMoney(item.price)}</strong>
        <button class="secondary-btn buy-btn" type="button" data-item="${item.id}">구매</button>
      </div>
    `;

    card.querySelector('.buy-btn').addEventListener('click', () => {
      const state = getState();
      const cost = item.price;

      if ((state.balance || 0) < cost) {
        alert('게임 머니가 부족합니다.');
        return;
      }

      state.balance = Number(state.balance || 0) - cost;
      saveState(state);
      renderWallet();
      alert(`${item.name}을(를) 구매했습니다.`);
    });

    shopItemsEl.appendChild(card);
  });
}

function renderInventory() {
  inventoryListEl.innerHTML = '';

  inventory.forEach((item) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${item.name}</span><strong>x${item.qty}</strong>`;
    inventoryListEl.appendChild(li);
  });
}

renderWallet();
renderShop();
renderInventory();
