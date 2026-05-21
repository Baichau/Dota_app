// ===== DotaQuest Hub — Frontend with Node.js Backend & Real Steam Login =====
document.addEventListener('DOMContentLoaded', () => {
  // ---------- State ----------
  let state = {
    user: null,
    stars: 0,
    inventory: [],
    questsCompleted: 0,
    casesOpened: 0,
    dailyBonusAvailable: true,
    firstCaseFree: true,
  };

  // ---------- Mock Data (quests & cases) ----------
  const mockQuests = [
    { id: 1, title: 'Place 15 Observer Wards', description: 'Vision is key. Place observer wards in winning matches.', rewardStars: 150, rewardCase: 'Support Case', type: 'daily', status: 'active' },
    { id: 2, title: 'Steal & Kill with Rubick Ult', description: 'Use Spell Steal to take an ultimate and get a kill.', rewardStars: 200, rewardCase: null, type: 'daily', status: 'active' },
    { id: 3, title: 'Destroy 5 Towers', description: 'Push lanes and destroy enemy towers.', rewardStars: 100, rewardCase: 'Tower Case', type: 'weekly', status: 'active' },
    { id: 4, title: 'Win 3 Games as Support', description: 'Play hard support and secure victory.', rewardStars: 250, rewardCase: 'Support Mega Case', type: 'weekly', status: 'active' },
  ];

  const mockCases = [
    { id: 1, name: 'Radiant Relic', cost: 150, image: '🎁', contents: [
      { name: 'Dragonclaw Hook', rarity: 'Legendary', chance: 10 },
      { name: 'Blades of Voth Domosh', rarity: 'Rare', chance: 30 },
      { name: 'Iron Branch', rarity: 'Common', chance: 60 }
    ]},
    { id: 2, name: 'Dire Darkness', cost: 200, image: '🎁', contents: [
      { name: 'Arcana Lina', rarity: 'Arcana', chance: 5 },
      { name: 'Shadow Blade', rarity: 'Common', chance: 50 },
      { name: 'Demon Edge', rarity: 'Rare', chance: 45 }
    ]},
    { id: 3, name: 'Ancient Fortune', cost: 300, image: '🎁', contents: [
      { name: 'Exalted PA Arcana', rarity: 'Arcana', chance: 8 },
      { name: 'Scythe of Vyse', rarity: 'Mythical', chance: 25 },
      { name: 'Butterfly', rarity: 'Legendary', chance: 67 }
    ]},
  ];

  // ---------- DOM Elements ----------
  const screens = {
    landing: document.getElementById('screen-landing'),
    dashboard: document.getElementById('screen-dashboard'),
    quests: document.getElementById('screen-quests'),
    cases: document.getElementById('screen-cases'),
    inventory: document.getElementById('screen-inventory'),
    events: document.getElementById('screen-events'),
    profile: document.getElementById('screen-profile'),
  };

  // ---------- Helper Functions ----------
  async function saveUserData() {
    if (!state.user) return;
    const dataToSave = {
      stars: state.stars,
      inventory: state.inventory,
      questsCompleted: state.questsCompleted,
      casesOpened: state.casesOpened,
      dailyBonusAvailable: state.dailyBonusAvailable,
      firstCaseFree: state.firstCaseFree,
      completedQuestsIds: mockQuests.filter(q => q.status === 'completed').map(q => q.id)
    };
    try {
      await fetch(`/api/user/${state.user.steamId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });
    } catch (err) { console.error('Failed to save user data:', err); }
  }

  async function loadUserData(steamId) {
    try {
      const res = await fetch(`/api/user/${steamId}`);
      const data = await res.json();
      state.stars = data.stars;
      state.inventory = data.inventory || [];
      state.questsCompleted = data.questsCompleted;
      state.casesOpened = data.casesOpened;
      state.dailyBonusAvailable = data.dailyBonusAvailable;
      state.firstCaseFree = data.firstCaseFree;
      // Restore quest completion status
      const completedIds = data.completedQuestsIds || [];
      mockQuests.forEach(q => {
        q.status = completedIds.includes(q.id) ? 'completed' : 'active';
      });
    } catch (err) {
      console.error('Failed to load user data, using defaults', err);
      state.stars = 1000;
      state.inventory = [];
      state.questsCompleted = 0;
      state.casesOpened = 0;
      state.dailyBonusAvailable = true;
      state.firstCaseFree = true;
      mockQuests.forEach(q => q.status = 'active');
    }
  }

  function showScreen(screenId) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(`screen-${screenId}`);
    if (target) target.classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-screen="${screenId}"]`);
    if (navItem) navItem.classList.add('active');
  }

  function updateUI() {
    document.getElementById('starsMini').textContent = state.stars;
    document.getElementById('dashStars').textContent = state.stars;
    document.getElementById('profStars').textContent = state.stars;
    document.getElementById('dashCases').textContent = mockCases.length;
    document.getElementById('dashQuestsDone').textContent = state.questsCompleted;
    document.getElementById('profQuests').textContent = state.questsCompleted;
    document.getElementById('profCases').textContent = state.casesOpened;
    if (state.user) {
      document.getElementById('userNameMini').textContent = state.user.nickname;
      document.getElementById('userAvatarMini').src = state.user.avatar;
      document.getElementById('dashName').textContent = state.user.nickname;
      document.getElementById('profileName').textContent = state.user.nickname;
      document.getElementById('profileAvatar').src = state.user.avatar;
      document.getElementById('profileSteamId').textContent = `Steam ID: ${state.user.steamId}`;
    }
    const banner = document.getElementById('firstCaseBanner');
    if (state.firstCaseFree && state.user) banner.classList.remove('hidden');
    else banner.classList.add('hidden');
  }

  function toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.textContent = message;
    container.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3500);
  }

  function getRarityColor(rarity) {
    const colors = {
      Common: '#9d9d9d', Uncommon: '#4caf50', Rare: '#2196f3',
      Mythical: '#9c27b0', Legendary: '#ff9800', Arcana: '#ff4500'
    };
    return colors[rarity] || '#c89b3c';
  }

  // ---------- Steam Login (Real OAuth) ----------
  // Check URL for Steam callback parameters
  const urlParams = new URLSearchParams(window.location.search);
  const steamId = urlParams.get('steamId');
  const steamName = urlParams.get('name');
  const steamAvatar = urlParams.get('avatar');

  if (steamId && steamName && steamAvatar) {
    // Clear URL parameters without reload
    window.history.replaceState({}, document.title, window.location.pathname);
    state.user = {
      steamId: steamId,
      nickname: decodeURIComponent(steamName),
      avatar: decodeURIComponent(steamAvatar)
    };
    loadUserData(steamId).then(() => {
      updateUI();
      showScreen('dashboard');
      renderDashboard();
      renderQuests();
      renderCases();
      renderInventory();
      toast(`Welcome, ${state.user.nickname}!`, 'success');
      saveUserData(); // ensure fresh state is saved
    });
  }

  // Login button redirects to Steam auth endpoint
  document.getElementById('btnSteamLogin').addEventListener('click', () => {
    window.location.href = '/auth/steam';
  });

  // ---------- Navigation ----------
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const screen = item.dataset.screen;
      if (!state.user && screen !== 'landing') {
        toast('Please login first!', 'warning');
        return;
      }
      showScreen(screen);
      if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('active');
      }
    });
  });

  document.getElementById('sidebarToggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  });
  document.getElementById('sidebarOverlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
  });

  // ---------- Dashboard Rendering ----------
  function renderDashboard() {
    const questsContainer = document.getElementById('activeQuestsDash');
    const casesContainer = document.getElementById('recommendedCases');
    questsContainer.innerHTML = mockQuests.slice(0,2).map(q => `
      <div class="quest-card-mini">
        <h4>${q.title}</h4>
        <p>⭐ ${q.rewardStars}</p>
      </div>
    `).join('');
    casesContainer.innerHTML = mockCases.map(c => `
      <div class="case-card-mini">
        <h4>${c.name}</h4>
        <p>⭐ ${c.cost}</p>
      </div>
    `).join('');
  }

  document.getElementById('btnOpenCaseDash').addEventListener('click', () => {
    if (!state.user) return toast('Login first!', 'warning');
    showScreen('cases');
  });

  // ---------- Daily Bonus Wheel ----------
  document.getElementById('btnDailyBonus').addEventListener('click', () => {
    if (!state.user) return toast('Login first!', 'warning');
    if (!state.dailyBonusAvailable) {
      toast('You already claimed your daily bonus!', 'warning');
      return;
    }
    document.getElementById('wheelModal').classList.remove('hidden');
    document.getElementById('wheelNote').textContent = 'Available once per day';
    document.getElementById('wheelResult').textContent = '';
  });

  document.getElementById('btnSpinWheel').addEventListener('click', async function() {
    if (!state.dailyBonusAvailable) {
      toast('Daily bonus already claimed!', 'warning');
      return;
    }
    const wheel = document.getElementById('wheelSpinner');
    const randomDeg = Math.floor(Math.random() * 360) + 1440;
    wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    wheel.style.transform = `rotate(${randomDeg}deg)`;
    
    const rewards = [50, 100, 25, 200, 75, 'Case', 150, 10];
    const finalDeg = randomDeg % 360;
    const segmentAngle = 45;
    const index = Math.floor(((360 - finalDeg) % 360) / segmentAngle);
    const reward = rewards[index] || 50;
    
    setTimeout(async () => {
      if (reward === 'Case') {
        state.inventory.push({ name: 'Bonus Case (Wheel)', rarity: 'Rare', icon: '🎁' });
        document.getElementById('wheelResult').textContent = 'You won a Bonus Case! 🎁';
        toast('You won a Bonus Case!', 'success');
      } else {
        state.stars += reward;
        document.getElementById('wheelResult').textContent = `You won ${reward} Stars! ⭐`;
        toast(`You won ${reward} Stars!`, 'success');
      }
      state.dailyBonusAvailable = false;
      document.getElementById('wheelNote').textContent = 'Already claimed today';
      updateUI();
      renderInventory();
      await saveUserData();
    }, 4500);
  });

  document.getElementById('wheelModalClose').addEventListener('click', () => {
    document.getElementById('wheelModal').classList.add('hidden');
    document.getElementById('wheelSpinner').style.transform = 'rotate(0deg)';
  });

  // ---------- Quests ----------
  function renderQuests(filter = 'all') {
    const grid = document.getElementById('questsGrid');
    let filtered = [...mockQuests];
    if (filter === 'daily') filtered = mockQuests.filter(q => q.type === 'daily');
    else if (filter === 'weekly') filtered = mockQuests.filter(q => q.type === 'weekly');
    else if (filter === 'active') filtered = mockQuests.filter(q => q.status === 'active');
    else if (filter === 'completed') filtered = mockQuests.filter(q => q.status === 'completed');
    
    grid.innerHTML = filtered.map(q => `
      <div class="quest-card" data-id="${q.id}">
        <h4>${q.title}</h4>
        <p>${q.description}</p>
        <div class="reward-row">
          <span>⭐ ${q.rewardStars}</span>
          ${q.rewardCase ? `<span>🎁 ${q.rewardCase}</span>` : ''}
        </div>
        ${q.status === 'active' ? `<button class="btn-submit-quest" data-id="${q.id}">Submit Match ID</button>` : '<span class="completed-badge">✅ Completed</span>'}
      </div>
    `).join('');
  }

  document.querySelector('.quest-filters').addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      document.querySelectorAll('.quest-filters .filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      renderQuests(e.target.dataset.filter);
    }
  });

  document.getElementById('questsGrid').addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-submit-quest')) {
      const questId = parseInt(e.target.dataset.id);
      const matchId = prompt('Enter your Match ID:');
      if (matchId) {
        const quest = mockQuests.find(q => q.id === questId);
        if (quest && quest.status === 'active') {
          quest.status = 'completed';
          state.stars += quest.rewardStars;
          state.questsCompleted++;
          toast(`Quest completed! +${quest.rewardStars} Stars`, 'success');
          updateUI();
          renderQuests(document.querySelector('.quest-filters .filter-btn.active')?.dataset.filter || 'all');
          renderDashboard();
          await saveUserData();
        }
      }
    }
  });

  // ---------- Cases ----------
  function renderCases() {
    const grid = document.getElementById('casesGrid');
    grid.innerHTML = mockCases.map(c => `
      <div class="case-card">
        <div class="case-image" style="font-size: 3rem; text-align: center;">${c.image}</div>
        <h4>${c.name}</h4>
        <p>Cost: ⭐ ${c.cost}</p>
        <button class="btn-buy-case" data-id="${c.id}" data-cost="${c.cost}" data-name="${c.name}">Open Case</button>
      </div>
    `).join('');
  }

  let currentCaseId = null;
  let currentCaseCost = 0;

  document.getElementById('casesGrid').addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-buy-case')) {
      const cost = parseInt(e.target.dataset.cost);
      const caseName = e.target.dataset.name;
      const caseId = parseInt(e.target.dataset.id);
      if (state.stars < cost && !(state.firstCaseFree && cost > 0)) {
        return toast('Not enough Stars!', 'error');
      }
      if (state.firstCaseFree && cost > 0) {
        state.firstCaseFree = false;
        toast('First case is on us! Free opening.', 'success');
        openCaseModal(caseName, 0, caseId);
      } else {
        openCaseModal(caseName, cost, caseId);
      }
    }
  });

  async function openCaseModal(caseName, cost, caseId) {
    document.getElementById('caseModal').classList.remove('hidden');
    document.getElementById('caseModalName').textContent = caseName;
    document.getElementById('caseModalCost').textContent = cost;
    document.getElementById('chestStage').classList.remove('hidden');
    document.getElementById('resultStage').classList.add('hidden');
    document.getElementById('chestLid').style.transform = 'rotateX(0)';
    
    const currentCase = mockCases.find(c => c.id === caseId);
    
    document.getElementById('btnOpenChest').onclick = async () => {
      // Deduct stars if not free
      if (cost > 0 && !(state.firstCaseFree && state.casesOpened === 0)) {
        state.stars -= cost;
      }
      updateUI();
      // Animate chest opening
      document.getElementById('chestLid').style.transform = 'rotateX(-60deg) translateY(-20px)';
      setTimeout(async () => {
        document.getElementById('chestStage').classList.add('hidden');
        document.getElementById('resultStage').classList.remove('hidden');
        
        if (currentCase && currentCase.contents) {
          const contents = currentCase.contents;
          const totalWeight = contents.reduce((sum, item) => sum + item.chance, 0);
          let random = Math.random() * totalWeight;
          let chosen = contents[0];
          for (const item of contents) {
            if (random < item.chance) {
              chosen = item;
              break;
            }
            random -= item.chance;
          }
          document.getElementById('resultItemName').textContent = chosen.name;
          document.getElementById('resultItemRarity').textContent = chosen.rarity;
          document.getElementById('resultItemRarity').style.color = getRarityColor(chosen.rarity);
          document.getElementById('resultItemGlow').style.boxShadow = `0 0 20px ${getRarityColor(chosen.rarity)}`;
          state.inventory.push({ name: chosen.name, rarity: chosen.rarity, icon: '🗡️' });
          state.casesOpened++;
          updateUI();
          renderInventory();
          toast(`You unboxed: ${chosen.name} (${chosen.rarity})!`, 'success');
          await saveUserData();
        } else {
          document.getElementById('resultItemName').textContent = 'Mystery Item';
          document.getElementById('resultItemRarity').textContent = 'Common';
        }
      }, 1000);
    };
  }

  document.getElementById('btnClaimItem').addEventListener('click', () => {
    document.getElementById('caseModal').classList.add('hidden');
    document.getElementById('chestLid').style.transform = 'rotateX(0)';
  });

  document.getElementById('caseModalClose').addEventListener('click', () => {
    document.getElementById('caseModal').classList.add('hidden');
    document.getElementById('chestLid').style.transform = 'rotateX(0)';
  });

  // ---------- Inventory ----------
  function renderInventory(rarityFilter = 'all') {
    const grid = document.getElementById('inventoryGrid');
    let items = state.inventory;
    if (rarityFilter !== 'all') {
      items = items.filter(i => i.rarity === rarityFilter);
    }
    if (items.length === 0) {
      grid.innerHTML = '<p class="empty-inventory">No items found. Open some cases! 🎁</p>';
      return;
    }
    grid.innerHTML = items.map(item => `
      <div class="item-card" style="border-color: ${getRarityColor(item.rarity)};">
        <div class="item-rarity-glow" style="box-shadow: 0 0 10px ${getRarityColor(item.rarity)};"></div>
        <span style="font-size:2.5rem;">🗡️</span>
        <h4>${item.name}</h4>
        <span style="color:${getRarityColor(item.rarity)}; font-weight:600;">${item.rarity}</span>
      </div>
    `).join('');
  }

  document.querySelector('.inventory-filters').addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      document.querySelectorAll('.inventory-filters .filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      renderInventory(e.target.dataset.rarity);
    }
  });

  // ---------- Promo & Referral ----------
  document.getElementById('btnPromo').addEventListener('click', async () => {
    if (!state.user) return toast('Login first!', 'warning');
    const code = document.getElementById('promoCodeInput').value.trim();
    if (code === 'WELCOME2024' || code === 'DOTA2LOVE') {
      state.stars += 200;
      updateUI();
      toast('Promo code redeemed! +200 Stars', 'success');
      await saveUserData();
    } else {
      toast('Invalid promo code', 'error');
    }
  });

  document.getElementById('btnCopyRef').addEventListener('click', () => {
    const input = document.getElementById('referralLink');
    input.select();
    document.execCommand('copy');
    toast('Referral link copied!', 'success');
  });

  // ---------- Banner Close ----------
  document.getElementById('bannerClose').addEventListener('click', async () => {
    document.getElementById('firstCaseBanner').classList.add('hidden');
    state.firstCaseFree = false;
    await saveUserData();
  });

  // ---------- Initialization (if no user, show landing) ----------
  if (!state.user) {
    showScreen('landing');
  }
  updateUI();
  renderQuests();
  renderCases();
  renderInventory();
});