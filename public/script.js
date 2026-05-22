// ==================== DotaQuest Hub – Frontend (FULLY FIXED) ====================
document.addEventListener('DOMContentLoaded', () => {
  // --- Parse Steam redirect parameters ---
  const urlParams = new URLSearchParams(window.location.search);
  const steamIdFromUrl = urlParams.get('steamId');
  if (steamIdFromUrl) {
    window.history.replaceState({}, document.title, window.location.pathname);
    setTimeout(() => {
      fetchUser().then(() => {
        updateUI();
        showScreen('dashboard');
        renderDashboard();
        renderQuests();
        renderInventory();
        toast(`Welcome, ${state.user.nickname}!`, 'success');
      });
    }, 100);
  }

  // ---------- State ----------
  let state = {
    user: null,
    stars: 0,
    inventory: [],
    questsCompleted: 0,
    casesOpened: 0,
    dailyBonusAvailable: true,   // kept for backend but we ignore limit
    firstCaseFree: true,
    completedQuestsIds: [],
    casesData: [],
    isSpinning: false
  };

  // ---------- Quests Data ----------
  const mockQuests = [
    { id: 1, title: 'Place 15 Observer Wards', description: 'Vision wins games. Plant 15 obs.', rewardStars: 150, type: 'daily', questType: 'wards', status: 'active' },
    { id: 2, title: 'Steal & Kill with Rubick Ult', description: 'Use Spell Steal to take an ultimate and get a kill.', rewardStars: 200, type: 'daily', questType: 'rubick', status: 'active' },
    { id: 3, title: 'Destroy 5 Towers', description: 'Push lanes and demolish towers.', rewardStars: 100, type: 'weekly', questType: 'towers', status: 'active' },
    { id: 4, title: 'Win 3 Games as Support', description: 'Play hard support and secure victory.', rewardStars: 250, type: 'weekly', questType: 'support_wins', status: 'active' }
  ];

  // ---------- DOM Elements ----------
  const screens = {
    landing: document.getElementById('screen-landing'),
    dashboard: document.getElementById('screen-dashboard'),
    quests: document.getElementById('screen-quests'),
    cases: document.getElementById('screen-cases'),
    inventory: document.getElementById('screen-inventory'),
    events: document.getElementById('screen-events'),
    profile: document.getElementById('screen-profile')
  };

  // ---------- Helper: Load user from backend ----------
  async function fetchUser() {
    try {
      const res = await fetch('/api/user/me');
      if (res.ok) {
        const user = await res.json();
        if (user && user.steamId) {
          state.user = {
            steamId: user.steamId,
            nickname: user.nickname || 'Dota Warrior',
            avatar: user.avatar || 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb.jpg'
          };
          state.stars = user.stars ?? 1000;
          state.inventory = user.inventory || [];
          state.questsCompleted = user.questsCompleted || 0;
          state.casesOpened = user.casesOpened || 0;
          state.dailyBonusAvailable = user.dailyBonusAvailable ?? true;
          state.firstCaseFree = user.firstCaseFree ?? true;
          state.completedQuestsIds = user.completedQuestsIds || [];
          mockQuests.forEach(q => {
            q.status = state.completedQuestsIds.includes(q.id) ? 'completed' : 'active';
          });
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Failed to load user', err);
      return false;
    }
  }

  async function saveUserData() {
    if (!state.user) return;
    try {
      await fetch('/api/user/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stars: state.stars,
          inventory: state.inventory,
          questsCompleted: state.questsCompleted,
          casesOpened: state.casesOpened,
          dailyBonusAvailable: state.dailyBonusAvailable,
          firstCaseFree: state.firstCaseFree,
          completedQuestsIds: state.completedQuestsIds
        })
      });
    } catch (err) { console.error('Save failed', err); }
  }

  // ---------- UI Update ----------
  function updateUI() {
    if (state.user) {
      document.getElementById('userNameMini').textContent = state.user.nickname;
      document.getElementById('userAvatarMini').src = state.user.avatar;
      document.getElementById('profileName').textContent = state.user.nickname;
      document.getElementById('profileAvatar').src = state.user.avatar;
      document.getElementById('profileSteamId').textContent = `Steam ID: ${state.user.steamId}`;
    }
    document.getElementById('starsMini').textContent = state.stars;
    document.getElementById('dashStars').textContent = state.stars;
    document.getElementById('profStars').textContent = state.stars;
    document.getElementById('dashCases').textContent = state.casesData.length;
    document.getElementById('dashQuestsDone').textContent = state.questsCompleted;
    document.getElementById('profQuests').textContent = state.questsCompleted;
    document.getElementById('profCases').textContent = state.casesOpened;
    const banner = document.getElementById('firstCaseBanner');
    if (state.firstCaseFree && state.user) banner.classList.remove('hidden');
    else banner.classList.add('hidden');
  }

  function showScreen(screenId) {
    Object.values(screens).forEach(s => s?.classList.add('hidden'));
    const target = screens[screenId];
    if (target) target.classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-screen="${screenId}"]`);
    if (activeNav) activeNav.classList.add('active');
    if (screenId === 'inventory') renderInventory();
    if (screenId === 'quests') renderQuests();
    if (screenId === 'cases' && state.casesData.length) renderCases();
    if (screenId === 'dashboard') renderDashboard();
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

  // ---------- Dashboard ----------
  function renderDashboard() {
    const questsContainer = document.getElementById('activeQuestsDash');
    const casesContainer = document.getElementById('recommendedCases');
    if (questsContainer) {
      questsContainer.innerHTML = mockQuests.slice(0,2).map(q => `
        <div class="quest-card-mini">
          <h4>${q.title}</h4>
          <p>⭐ ${q.rewardStars}</p>
        </div>
      `).join('');
    }
    if (casesContainer && state.casesData.length) {
      casesContainer.innerHTML = state.casesData.slice(0,2).map(c => `
        <div class="case-card-mini">
          <h4>${c.name}</h4>
          <p>⭐ ${c.cost}</p>
        </div>
      `).join('');
    }
  }

  // ---------- Wheel (unlimited spins) ----------
  let wheelSpinning = false;
  let currentWheelRotation = 0;

 function initWheelLabels() {
  const container = document.querySelector('#wheelSpinner .wheel-labels');
  if (!container) return;
  const rewards = ['50⭐', '100⭐', '25⭐', '200⭐', '75⭐', '🎁 Case', '150⭐', '10⭐'];
  container.innerHTML = '';
  const radius = 115;
  const centerX = 140, centerY = 140;
  for (let i = 0; i < 8; i++) {
    const span = document.createElement('span');
    // Place each label exactly at the center of its segment (45° per segment, center at i*45 + 22.5)
    const angle = (i * 45 + 22.5) * Math.PI / 180;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;
    span.style.transform = `translate(-50%, -50%)`;
    span.textContent = rewards[i];
    container.appendChild(span);
  }
}

  document.getElementById('btnSpinWheel')?.addEventListener('click', async function() {
    if (wheelSpinning) return;
    if (!state.user) return toast('Login first!', 'warning');
    
    wheelSpinning = true;
    const wheel = document.getElementById('wheelSpinner');
    const rewards = [50, 100, 25, 200, 75, 'Case', 150, 10];
    
    // 1. Pick random reward
    const rewardIndex = Math.floor(Math.random() * rewards.length);
    const reward = rewards[rewardIndex];
    
    // 2. Calculate target final rotation so that the chosen segment's center points to top (0°)
    // Segment centers are at angles: index*45 + 22.5
    const targetCenterAngle = rewardIndex * 45 + 22.5;
    // We want (targetCenterAngle - finalRotation) % 360 = 0  => finalRotation % 360 = targetCenterAngle
    let targetRotation = targetCenterAngle;
    // Add random extra full spins (5-10) for realism
    const extraSpins = 360 * (5 + Math.floor(Math.random() * 6));
    targetRotation += extraSpins;
    
    // 3. Calculate delta from current rotation
    let delta = targetRotation - currentWheelRotation;
    // Ensure delta is positive for smooth forward spin
    if (delta <= 0) delta += 360;
    // Add a little more randomness to delta (up to 360 extra) to make it less predictable
    delta += Math.random() * 360;
    
    const newRotation = currentWheelRotation + delta;
    currentWheelRotation = newRotation;
    
    // 4. Apply animation
    wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    wheel.style.transform = `rotate(${newRotation}deg)`;
    
    // 5. After spin, give reward
    setTimeout(async () => {
      if (reward === 'Case') {
        state.inventory.push({ name: 'Bonus Case (Wheel)', rarity: 'Rare', icon: '🎁', image: '' });
        document.getElementById('wheelResult').textContent = 'You won a Bonus Case! 🎁';
        toast('Bonus Case added to inventory!', 'success');
      } else {
        state.stars += reward;
        document.getElementById('wheelResult').textContent = `You won ${reward} Stars! ⭐`;
        toast(`+${reward} Stars!`, 'success');
      }
      updateUI();
      renderInventory();
      await saveUserData();
      wheelSpinning = false;
      // Do NOT reset wheel to 0 – keep its position
    }, 4000);
  });

  document.getElementById('btnDailyBonus')?.addEventListener('click', () => {
    if (!state.user) return toast('Login first!', 'warning');
    // No daily limit – always show wheel
    document.getElementById('wheelModal').classList.remove('hidden');
    document.getElementById('wheelNote').textContent = 'Spin anytime! No cooldown.';
    document.getElementById('wheelResult').textContent = '';
    const wheel = document.getElementById('wheelSpinner');
    wheel.style.transition = 'none';
      document.getElementById('wheelModalClose')?.addEventListener('click', () => {
    document.getElementById('wheelModal').classList.add('hidden');
    // Do NOT reset wheel rotation, keep it as is
    wheelSpinning = false;
   });
      wheelSpinning = false;
    initWheelLabels();
  });

  document.getElementById('btnSpinWheel')?.addEventListener('click', async function() {
    if (wheelSpinning) return;
    if (!state.user) return toast('Login first!', 'warning');
    
    wheelSpinning = true;
    const wheel = document.getElementById('wheelSpinner');
    const rewards = [50, 100, 25, 200, 75, 'Case', 150, 10];
    
    // 1. Pick a random reward
    const rewardIndex = Math.floor(Math.random() * rewards.length);
    const reward = rewards[rewardIndex];
    
    // 2. Calculate required final rotation so that the chosen segment's CENTER aligns with the pointer (at top, 0°)
    // Each segment is 45°, center is at (segmentIndex * 45 + 22.5) degrees.
    const targetSegmentCenter = rewardIndex * 45 + 22.5;
    // The pointer is at the top (0°). We need wheel to rotate such that the target center comes to 0°.
    // Current rotation = 0. After rotation = finalRotation. The position of that segment on wheel = (targetSegmentCenter - finalRotation) mod 360.
    // We want (targetSegmentCenter - finalRotation) mod 360 = 0 (pointer at top).
    // So finalRotation mod 360 = targetSegmentCenter.
    let finalRotation = targetSegmentCenter;
    // Add multiple full spins (e.g., 5 to 10 extra rotations) for natural look
    const extraSpins = Math.floor(Math.random() * 6) + 5; // between 5 and 10 full spins
    finalRotation += extraSpins * 360;
    
    // 3. Animate
    wheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    wheel.style.transform = `rotate(${finalRotation}deg)`;
    
    // 4. After animation, apply reward
    setTimeout(async () => {
      if (reward === 'Case') {
        state.inventory.push({ name: 'Bonus Case (Wheel)', rarity: 'Rare', icon: '🎁', image: '' });
        document.getElementById('wheelResult').textContent = 'You won a Bonus Case! 🎁';
        toast('Bonus Case added to inventory!', 'success');
      } else {
        state.stars += reward;
        document.getElementById('wheelResult').textContent = `You won ${reward} Stars! ⭐`;
        toast(`+${reward} Stars!`, 'success');
      }
      updateUI();
      renderInventory();
      await saveUserData();
      wheelSpinning = false;
      // Reset transition for next spin
      wheel.style.transition = 'none';
      wheel.style.transform = `rotate(0deg)`;
      // Force reflow? Not necessary, but we keep wheel at 0 for next spin
    }, 4000);
  });

  document.getElementById('wheelModalClose')?.addEventListener('click', () => {
    document.getElementById('wheelModal').classList.add('hidden');
    const wheel = document.getElementById('wheelSpinner');
    wheel.style.transition = 'none';
    
    wheelSpinning = false;
  });

  // ---------- Quests ----------
  function renderQuests(filter = 'all') {
    const grid = document.getElementById('questsGrid');
    if (!grid) return;
    let filtered = [...mockQuests];
    if (filter === 'daily') filtered = mockQuests.filter(q => q.type === 'daily');
    else if (filter === 'weekly') filtered = mockQuests.filter(q => q.type === 'weekly');
    else if (filter === 'active') filtered = mockQuests.filter(q => q.status === 'active');
    else if (filter === 'completed') filtered = mockQuests.filter(q => q.status === 'completed');

    grid.innerHTML = filtered.map(q => `
      <div class="quest-card" data-id="${q.id}">
        <h4>${q.title}</h4>
        <p>${q.description}</p>
        <div class="reward-row">⭐ ${q.rewardStars}</div>
        ${q.status === 'completed' ? '<span class="completed-badge">✅ Completed</span>' :
          `<button class="btn-submit-quest" data-id="${q.id}">Submit Match ID</button>`}
      </div>
    `).join('');
  }

  document.querySelector('.quest-filters')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      document.querySelectorAll('.quest-filters .filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      renderQuests(e.target.dataset.filter);
    }
  });

  document.getElementById('questsGrid')?.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-submit-quest')) {
      const questId = parseInt(e.target.dataset.id);
      const quest = mockQuests.find(q => q.id === questId);
      if (!quest || quest.status === 'completed') return;
      const matchId = prompt('Enter your Match ID (from Dota 2 client):');
      if (!matchId) return;

      toast('Validating match... please wait', 'info');
      try {
        const res = await fetch('/api/validate-quest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId, questType: quest.questType })
        });
        const data = await res.json();
        if (data.valid) {
          quest.status = 'completed';
          state.completedQuestsIds.push(questId);
          state.stars += quest.rewardStars;
          state.questsCompleted++;
          toast(`Quest completed! +${quest.rewardStars} Stars`, 'success');
          updateUI();
          renderQuests(document.querySelector('.quest-filters .filter-btn.active')?.dataset.filter || 'all');
          renderDashboard();
          await saveUserData();
        } else {
          toast('You did not meet the quest requirements in that match.', 'error');
        }
      } catch (err) {
        toast('Validation error. Check Match ID or try again.', 'error');
      }
    }
  });

  // ---------- Cases ----------
  async function loadCases() {
    try {
      const res = await fetch('/api/cases');
      if (res.ok) {
        state.casesData = await res.json();
      } else {
        throw new Error('Backend not ready');
      }
    } catch (err) {
      console.warn('Using mock case data');
      state.casesData = [
        {
          id: 1,
          name: 'Treasure of the Crimson Witness',
          cost: 100,
          image: '🎁',
          contents: [
            { name: 'Wraith Band', rarity: 'Common', chance: 50, icon: '⚙️' },
            { name: 'Phase Boots', rarity: 'Common', chance: 40, icon: '👟' },
            { name: 'Blink Dagger', rarity: 'Rare', chance: 7, icon: '🗡️' },
            { name: 'Aghanim\'s Scepter', rarity: 'Mythical', chance: 2.5, icon: '🔮' },
            { name: 'Divine Rapier', rarity: 'Legendary', chance: 0.5, icon: '⚔️' }
          ]
        },
        {
          id: 2,
          name: 'Arcana Vault',
          cost: 300,
          image: '💎',
          contents: [
            { name: 'Heroic Cache', rarity: 'Common', chance: 60, icon: '📦' },
            { name: 'Immortal Golden', rarity: 'Rare', chance: 25, icon: '🏅' },
            { name: 'Arcana (PA)', rarity: 'Arcana', chance: 2, icon: '🗡️' },
            { name: 'Arcana (Zeus)', rarity: 'Arcana', chance: 2, icon: '⚡' }
          ]
        }
      ];
    }
    renderCases();
  }

  function renderCases() {
    const grid = document.getElementById('casesGrid');
    if (!grid) return;
    grid.innerHTML = state.casesData.map(c => `
      <div class="case-card">
        <div class="case-image" style="font-size:3rem; text-align:center;">${c.image || '🎁'}</div>
        <h4>${c.name}</h4>
        <p>Cost: ⭐ ${c.cost}</p>
        <button class="btn-buy-case" data-id="${c.id}" data-cost="${c.cost}" data-name="${c.name}">Open Case</button>
      </div>
    `).join('');
  }

  let currentCaseContents = [];
  let currentCaseCost = 0;

  document.getElementById('casesGrid')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-buy-case');
    if (!btn) return;
    const cost = parseInt(btn.dataset.cost);
    const caseId = parseInt(btn.dataset.id);
    const currentCase = state.casesData.find(c => c.id === caseId);
    if (!currentCase) return;
    currentCaseContents = currentCase.contents;
    currentCaseCost = cost;

    if (state.firstCaseFree && cost > 0) {
      state.firstCaseFree = false;
      toast('First case is FREE!', 'success');
      openCaseModal(currentCase.name, 0, currentCase.contents);
    } else {
      if (state.stars < cost) return toast('Not enough Stars!', 'error');
      openCaseModal(currentCase.name, cost, currentCase.contents);
    }
  });

  function openCaseModal(caseName, cost, contents) {
    const safeContents = contents.map(item => ({
      ...item,
      chance: item.chance !== undefined ? item.chance : 1
    }));

    const modal = document.getElementById('caseModal');
    if (!modal) {
      console.error('Case modal not found');
      return;
    }
    modal.classList.remove('hidden');
    document.getElementById('caseModalName').textContent = caseName;
    document.getElementById('caseModalCost').textContent = cost;
    document.getElementById('chestStage').classList.remove('hidden');
    document.getElementById('resultStage').classList.add('hidden');
    
    const lid = document.getElementById('chestLid');
    if (lid) lid.style.transform = 'rotateX(0)';

    const btnOpen = document.getElementById('btnOpenChest');
    if (!btnOpen) {
      console.error('Button #btnOpenChest missing');
      return;
    }

    // Remove previous listener to avoid duplicates
    const newBtn = btnOpen.cloneNode(true);
    btnOpen.parentNode.replaceChild(newBtn, btnOpen);
    
    newBtn.onclick = async () => {
      if (cost > 0) {
        if (state.stars < cost) {
          toast('Not enough stars!', 'error');
          modal.classList.add('hidden');
          return;
        }
        state.stars -= cost;
      }
      updateUI();

      const chestLid = document.getElementById('chestLid');
      if (chestLid) chestLid.style.transform = 'rotateX(-60deg) translateY(-20px)';
      
      const rollPreview = document.getElementById('rollPreview');
      const rollItemName = document.getElementById('rollItemName');
      if (rollPreview) rollPreview.classList.remove('hidden');
      
      let rollInterval = setInterval(() => {
        const rand = safeContents[Math.floor(Math.random() * safeContents.length)];
        if (rollItemName) rollItemName.textContent = rand.name;
      }, 80);

      setTimeout(async () => {
        clearInterval(rollInterval);
        if (rollPreview) rollPreview.classList.add('hidden');
        document.getElementById('chestStage').classList.add('hidden');
        document.getElementById('resultStage').classList.remove('hidden');

        const totalWeight = safeContents.reduce((sum, it) => sum + it.chance, 0);
        let rand = Math.random() * totalWeight;
        let chosen = safeContents[0];
        for (const item of safeContents) {
          if (rand < item.chance) {
            chosen = item;
            break;
          }
          rand -= item.chance;
        }

        document.getElementById('resultItemName').textContent = chosen.name;
        document.getElementById('resultItemRarity').textContent = chosen.rarity;
        const rarityColor = getRarityColor(chosen.rarity);
        document.getElementById('resultItemRarity').style.color = rarityColor;
        const glow = document.getElementById('resultItemGlow');
        if (glow) glow.style.boxShadow = `0 0 30px ${rarityColor}`;
        document.getElementById('resultItemIcon').textContent = chosen.icon || '🗡️';

        state.inventory.push({ name: chosen.name, rarity: chosen.rarity, icon: chosen.icon || '🗡️', image: '' });
        state.casesOpened++;
        updateUI();
        renderInventory();
        toast(`You unboxed: ${chosen.name} (${chosen.rarity})!`, 'success');
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        await saveUserData();
      }, 2000);
    };
  }

  document.getElementById('btnClaimItem')?.addEventListener('click', () => {
    document.getElementById('caseModal').classList.add('hidden');
    document.getElementById('chestLid').style.transform = 'rotateX(0)';
  });
  document.getElementById('caseModalClose')?.addEventListener('click', () => {
    document.getElementById('caseModal').classList.add('hidden');
    document.getElementById('chestLid').style.transform = 'rotateX(0)';
  });

  // ---------- Inventory ----------
  let steamInventoryCache = null;
  async function loadSteamInventory() {
    try {
      const res = await fetch('/api/user/inventory');
      if (res.ok) steamInventoryCache = await res.json();
      else steamInventoryCache = [];
    } catch { steamInventoryCache = []; }
  }

  function renderInventory(rarityFilter = 'all') {
    const grid = document.getElementById('inventoryGrid');
    if (!grid) return;
    if (rarityFilter === 'steam') {
      if (!steamInventoryCache) {
        grid.innerHTML = '<p>Loading Steam inventory...</p>';
        loadSteamInventory().then(() => renderInventory('steam'));
        return;
      }
      if (steamInventoryCache.length === 0) {
        grid.innerHTML = '<p class="empty-inventory">No Steam items found. Make sure your inventory is public.</p>';
        return;
      }
      grid.innerHTML = steamInventoryCache.map(item => `
        <div class="item-card" style="border-color: ${getRarityColor(item.rarity)};">
          <img src="${item.image}" alt="${item.name}" style="width:80px; height:80px; object-fit:contain;" onerror="this.onerror=null;this.src='';this.alt='🗡️'">
          <h4>${item.name}</h4>
          <span style="color:${getRarityColor(item.rarity)}">${item.rarity}</span>
        </div>
      `).join('');
      return;
    }

    let items = state.inventory;
    if (rarityFilter !== 'all') items = items.filter(i => i.rarity === rarityFilter);
    if (items.length === 0) {
      grid.innerHTML = '<p class="empty-inventory">No items found.</p>';
      return;
    }
    grid.innerHTML = items.map(item => `
      <div class="item-card" style="border-color: ${getRarityColor(item.rarity)};">
        <div class="item-rarity-glow" style="box-shadow: 0 0 10px ${getRarityColor(item.rarity)};"></div>
        <span style="font-size:2.5rem;">${item.icon || '🗡️'}</span>
        <h4>${item.name}</h4>
        <span style="color:${getRarityColor(item.rarity)}">${item.rarity}</span>
      </div>
    `).join('');
  }

  document.querySelector('.inventory-filters')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      document.querySelectorAll('.inventory-filters .filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      renderInventory(e.target.dataset.rarity);
    }
  });

  // ---------- Promo & Referral ----------
  document.getElementById('btnPromo')?.addEventListener('click', async () => {
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

  document.getElementById('btnCopyRef')?.addEventListener('click', () => {
    const input = document.getElementById('referralLink');
    input.select();
    document.execCommand('copy');
    toast('Referral link copied!', 'success');
  });

  // ---------- Banner close & Dashboard open case button ----------
  document.getElementById('bannerClose')?.addEventListener('click', async () => {
    document.getElementById('firstCaseBanner').classList.add('hidden');
    state.firstCaseFree = false;
    await saveUserData();
  });

  document.getElementById('btnOpenCaseDash')?.addEventListener('click', () => {
    showScreen('cases');
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

  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  });
  document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
  });

  // ---------- Initialization ----------
  (async () => {
    const loggedIn = await fetchUser();
    await loadCases();
    if (loggedIn) {
      updateUI();
      showScreen('dashboard');
      renderDashboard();
      renderQuests();
      renderInventory();
      toast(`Welcome back, ${state.user.nickname}!`, 'success');
    } else {
      showScreen('landing');
    }
  })();

  document.getElementById('btnSteamLogin')?.addEventListener('click', () => {
    window.location.href = '/auth/steam';
  });
});