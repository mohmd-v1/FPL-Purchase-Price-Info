// FPL Purchase Price Info Extension v5.8 (Exact FPL Selling Economics Warning)
// يعتمد كلياً على الـ API الرسمي للفانتازي بدون أي مواقع خارجية

console.log('🟢 FPL Purchase Price Extension: Starting (Official FPL API mode)...');

// Caches
let bootstrapCache = null;      // code -> element_id & info
let myTeamPicksMap = null;      // element_id -> { purchase_price, selling_price, predictedProgress, currentProgress }
let isFetchingTeam = false;
let activePlayerId = null;       // معرّف اللاعب المعروض حالياً في الـ Dialog
let ensureTimer = null;
let pitchTimer = null;

// Official FPL Up & Down SVGs
const SVG_UP = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" class="_1axm9e10" title="up"><g fill-rule="evenodd"><path d="M8,16 C8.85354691,16 9.67587305,15.866328 10.4471863,15.618776 C13.6684789,14.5849062 16,11.5647311 16,8 C16,3.581722 12.418278,0 8,0 C3.581722,0 0,3.581722 0,8 C0,12.418278 3.581722,16 8,16 Z"></path><path fill="currentColor" fill-rule="nonzero" d="M4.5,6.27851588 L5.1004646,5.63925794 C5.43077928,5.2876031 5.70475818,5 5.70967916,5 C5.71460014,5 6.23194007,5.54639596 6.85921456,6.2144865 L8,7.428973 L9.14078544,6.2144865 C9.76831893,5.5467015 10.2856309,5 10.2903208,5 C10.2952427,5 10.5695007,5.28761055 10.8995354,5.63925794 L11.5,6.27851588 L9.75217699,8.13925794 C8.79080084,9.16274432 8.00246399,10 8.000014,10 C7.99756401,10 7.20894716,9.16281884 6.24785101,8.13925794 L4.5,6.27851588 Z"></path></g></svg>`;

const SVG_DOWN = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" class="_1axm9e11" title="down"><g fill-rule="evenodd"><path d="M8,16 C8.85354691,16 9.67587305,15.866328 10.4471863,15.618776 C13.6684789,14.5849062 16,11.5647311 16,8 C16,3.581722 12.418278,0 8,0 C3.581722,0 0,3.581722 0,8 C0,12.418278 3.581722,16 8,16 Z"></path><path fill="currentColor" fill-rule="nonzero" d="M4.5,6.27851588 L5.1004646,5.63925794 C5.43077928,5.2876031 5.70475818,5 5.70967916,5 C5.71460014,5 6.23194007,5.54639596 6.85921456,6.2144865 L8,7.428973 L9.14078544,6.2144865 C9.76831893,5.5467015 10.2856309,5 10.2903208,5 C10.2952427,5 10.5695007,5.28761055 10.8995354,5.63925794 L11.5,6.27851588 L9.75217699,8.13925794 C8.79080084,9.16274432 8.00246399,10 8.000014,10 C7.99756401,10 7.20894716,9.16281884 6.24785101,8.13925794 L4.5,6.27851588 Z" transform="matrix(1 0 0 -1 0 15)"></path></g></svg>`;

// 1. جلب بيانات التشكيلة والتوقعات عبر الـ Page Bridge
function requestSquadDataFromBridge() {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      window.removeEventListener('message', onMessage);
      resolve(null);
    }, 5000);

    function onMessage(event) {
      if (event.source !== window || !event.data || event.data.type !== 'FPL_RESPONSE_MY_TEAM') {
        return;
      }
      clearTimeout(timeout);
      window.removeEventListener('message', onMessage);

      if (event.data.success && Array.isArray(event.data.picks)) {
        const map = new Map();
        const predictions = event.data.predictions || {};

        event.data.picks.forEach(pick => {
          const pred = predictions[pick.element];
          map.set(pick.element, {
            elementId: pick.element,
            purchasePrice: (pick.purchase_price / 10).toFixed(1),
            sellPrice: (pick.selling_price / 10).toFixed(1),
            predictedProgress: pred ? pred.predictedProgress : null,
            currentProgress: pred ? pred.currentProgress : null
          });
        });
        resolve(map);
      } else {
        console.warn('⚠️ Bridge response error:', event.data.error);
        resolve(null);
      }
    }

    window.addEventListener('message', onMessage);
    window.postMessage({ type: 'FPL_REQUEST_MY_TEAM' }, '*');
  });
}

// 2. جلب بيانات اللاعبين من FPL Bootstrap API (ربط photo/code بـ element ID)
async function getBootstrapData() {
  if (bootstrapCache) return bootstrapCache;

  try {
    console.log('🌐 Fetching FPL Bootstrap data...');
    const response = await fetch('/api/bootstrap-static/');
    const data = await response.json();

    const codeToId = new Map();
    const nameToId = new Map();
    const idToElement = new Map();

    data.elements.forEach(player => {
      codeToId.set(String(player.code), player.id);
      nameToId.set(player.web_name.toLowerCase(), player.id);
      nameToId.set(`${player.first_name} ${player.second_name}`.toLowerCase(), player.id);
      idToElement.set(player.id, player);
    });

    bootstrapCache = { codeToId, nameToId, idToElement, rawElements: data.elements };
    console.log(`✅ Loaded ${data.elements.length} players from FPL Bootstrap`);
    return bootstrapCache;
  } catch (error) {
    console.error('❌ Error fetching FPL bootstrap:', error);
    return null;
  }
}

// 3. جلب وتحديث كاش التشكيلة
async function loadMyTeamPicks(forceRefresh = false) {
  if (myTeamPicksMap && !forceRefresh) return myTeamPicksMap;
  if (isFetchingTeam) return null;

  isFetchingTeam = true;
  console.log('📡 Requesting squad data from page bridge...');
  const map = await requestSquadDataFromBridge();
  isFetchingTeam = false;

  if (map && map.size > 0) {
    myTeamPicksMap = map;
    console.log(`✅ Successfully loaded ${map.size} squad players with official prices & predictions!`);
    return myTeamPicksMap;
  }

  return null;
}

// 4. استخراج معرّف اللاعب واسمه من الـ Dialog
async function extractPlayerInfoFromDialog(dialog) {
  const bootstrap = await getBootstrapData();
  if (!bootstrap) return null;

  let playerId = null;
  let playerName = null;

  // الطريقة 1: من صورة البروفايل
  const img = dialog.querySelector('img[src*="photos/players"], img[src*="premierleague"]');
  if (img && img.src) {
    const match = img.src.match(/(\d+)\.(png|jpg)/i);
    if (match && match[1]) {
      const code = match[1];
      playerId = bootstrap.codeToId.get(code);
    }
  }

  // من عنوان h1
  const h1 = dialog.querySelector('h1');
  if (h1) {
    const fullText = h1.textContent.replace('Player Profile:', '').trim();
    const parts = fullText.split(/\s+/).filter(Boolean);
    if (parts.length > 0) {
      playerName = parts[parts.length - 1]; // اللقب
    }
    if (!playerId) {
      if (parts.length > 0 && bootstrap.nameToId.has(parts[parts.length - 1].toLowerCase())) {
        playerId = bootstrap.nameToId.get(parts[parts.length - 1].toLowerCase());
      } else if (bootstrap.nameToId.has(parts.join(' ').toLowerCase())) {
        playerId = bootstrap.nameToId.get(parts.join(' ').toLowerCase());
      }
    }
  }

  if (playerId && !playerName && bootstrap.idToElement.has(playerId)) {
    playerName = bootstrap.idToElement.get(playerId).web_name;
  }

  return playerId ? { playerId, playerName } : null;
}

// 5. البحث عن سكشن السعر في الـ Dialog
function findPriceSection(dialog) {
  if (!dialog) return null;

  let section = dialog.querySelector('[class*="_priceSection_"]') ||
                dialog.querySelector('[class*="priceSection"]');

  if (!section) {
    const allDivs = Array.from(dialog.querySelectorAll('div')).reverse();
    for (const div of allDivs) {
      if (div.textContent.trim().startsWith('Price:') && div.children.length <= 2) {
        section = div;
        break;
      }
    }
  }

  return section;
}

// 6. حقن كارت سعر الشراء وشارة Predicted Progress في الـ Dialog
function addPurchaseInfo(dialog, pickData, playerName) {
  if (!pickData || !pickData.purchasePrice) return;

  const priceSection = findPriceSection(dialog);
  if (!priceSection) {
    return;
  }

  // 1) إضافة شارة Predicted Progress الرسمية بجانب "Price: £Xm"
  const predictedVal = pickData.predictedProgress;
  const priceSpan = priceSection.querySelector('span');

  if (priceSpan && predictedVal !== null && predictedVal !== undefined) {
    let predBadge = priceSpan.querySelector('.fpl-pred-badge');
    if (!predBadge) {
      predBadge = document.createElement('span');
      predBadge.className = 'fpl-pred-badge';
      priceSpan.appendChild(predBadge);
    }

    const numVal = parseFloat(String(predictedVal).replace('%', ''));
    const formattedVal = (numVal > 0 ? `+${numVal}` : `${numVal}`) + '%';

    let badgeClass = 'fpl-pred-neutral';
    let iconSvg = '';

    if (numVal > 0) {
      badgeClass = 'fpl-pred-up';
      iconSvg = SVG_UP;
    } else if (numVal < 0) {
      badgeClass = 'fpl-pred-down';
      iconSvg = SVG_DOWN;
    }

    predBadge.className = `fpl-pred-badge ${badgeClass}`;
    predBadge.title = `Predicted Progress: ${formattedVal}`;
    predBadge.innerHTML = `${iconSvg} <span>${formattedVal}</span>`;
  }

  // 2) التحقق من كارت سعر الشراء وتجديده
  if (priceSection.querySelector('.fpl-purchase-info')) {
    return;
  }

  const existing = dialog.querySelectorAll('.fpl-purchase-info');
  existing.forEach(el => el.remove());

  let currentPrice = pickData.sellPrice;
  const priceText = priceSection.textContent;
  const priceMatch = priceText.match(/£([\d\.]+)m?/);
  if (priceMatch && priceMatch[1]) {
    currentPrice = priceMatch[1];
  }

  const purchasePriceVal = parseFloat(pickData.purchasePrice);
  const currentPriceVal = parseFloat(currentPrice);
  const diff = (currentPriceVal - purchasePriceVal).toFixed(1);
  const diffSign = diff >= 0 ? `+${diff}` : `${diff}`;
  const diffClass = diff >= 0 ? 'fpl-profit' : 'fpl-loss';

  const card = document.createElement('div');
  card.className = 'fpl-purchase-info';
  card.innerHTML = `
    <div class="fpl-purchase-row">
      <span class="fpl-purchase-label">Purchased</span>
      <span class="fpl-purchase-values">
        <span class="fpl-purchase-price">£${pickData.purchasePrice}m</span>
        <span class="fpl-arrow">→</span>
        <span class="fpl-current-price">£${currentPrice}m</span>
        <span class="fpl-price-diff ${diffClass}">${diffSign}m</span>
      </span>
    </div>
    <span class="fpl-sell-line">Sell: £${pickData.sellPrice}m</span>
  `;

  priceSection.appendChild(card);
}

// 7. التحقق من شروط التنبيه (؟) على اللاعب في الملعب برة
// الشروط الدقيقة المطلوبة:
// 1. اللاعب على وشك انخفاض سعره بنسبة 75% فأكثر (Predicted Progress بالسالب: <= -75%)
// 2. فارق السعر الحالي عن الشراء مكسب موجب (Profit > 0)
// 3. الرقم بعد العلامة العشرية مباشرة عدد زوجي (أو فرق السعر الكلي 0.2, 0.4, 0.6, 0.8...)
function shouldShowPitchAlert(pickData, currentMarketPrice) {
  if (!pickData || pickData.predictedProgress === null || pickData.predictedProgress === undefined) {
    return false;
  }

  // 1) نسبة نقص السعر 75% فما فوق (بالسالب يعني -75% أو -80% أو -98% أو -100%)
  const predNum = parseFloat(String(pickData.predictedProgress).replace('%', ''));
  if (isNaN(predNum) || predNum > -75) {
    return false;
  }

  // 2) مقارنة سعر السوق الأصلي مع سعر الشراء
  const purchasePriceVal = parseFloat(pickData.purchasePrice);
  const marketPriceVal = parseFloat(currentMarketPrice);
  if (isNaN(purchasePriceVal) || isNaN(marketPriceVal)) return false;

  const rawDiff = +(marketPriceVal - purchasePriceVal).toFixed(1);
  if (rawDiff <= 0) {
    return false; // ليس في حالة مكسب
  }

  // 3) فحص الرقم بعد العلامة العشرية مباشرة هل هو زوجي (2, 4, 6, 8, 0)
  // مثال: 0.2 -> 2, 0.4 -> 4, 0.8 -> 8, 1.2 -> 2, 2.6 -> 6
  // وأيضاً لو فارق سعر البيع (Selling Price - Purchase) زوجي
  const sellPriceVal = parseFloat(pickData.sellPrice);
  const sellDiff = +(sellPriceVal - purchasePriceVal).toFixed(1);

  const marketDecimal = Math.round(Math.abs(rawDiff) * 10) % 10;
  const sellDecimal = Math.round(Math.abs(sellDiff) * 10) % 10;

  const isDecimalEven = (marketDecimal % 2 === 0) || (sellDiff > 0 && sellDecimal % 2 === 0);

  return isDecimalEven;
}

// 8. حقن علامة (؟) على أزرار اللاعبين في الملعب/التشكيلة برة
async function updatePitchAlertBadges() {
  const pitchButtons = document.querySelectorAll('button[data-pitch-element="true"]');
  if (!pitchButtons || pitchButtons.length === 0) return;

  const picksMap = await loadMyTeamPicks();
  const bootstrap = await getBootstrapData();
  if (!picksMap || !bootstrap) return;

  pitchButtons.forEach(btn => {
    // استخراج اسم وسعر اللاعب من نص الزر
    const textLines = btn.innerText.split('\n').map(t => t.trim()).filter(Boolean);
    let playerName = null;

    for (const line of textLines) {
      if (!line.startsWith('£') && !line.startsWith('Fixture:') && !line.includes('(') && !playerName) {
        playerName = line;
      }
    }

    if (!playerName) return;

    // مطابقة اللاعب
    let playerId = bootstrap.nameToId.get(playerName.toLowerCase());
    let playerObj = null;
    if (playerId) {
      playerObj = bootstrap.idToElement.get(playerId);
    } else {
      for (const [id, el] of bootstrap.idToElement.entries()) {
        if (el.web_name.toLowerCase() === playerName.toLowerCase()) {
          playerId = id;
          playerObj = el;
          break;
        }
      }
    }

    if (!playerId || !playerObj) return;

    const pickData = picksMap.get(playerId);
    if (!pickData) return;

    // السعر الحالي الرسمي للاعب في السوق (الذي يحدد ربحك الحقيقي)
    const marketPrice = (playerObj.now_cost / 10).toFixed(1);
    const isAlert = shouldShowPitchAlert(pickData, marketPrice);

    let badge = btn.querySelector('.fpl-pitch-alert-badge');

    if (isAlert) {
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'fpl-pitch-alert-badge';
        badge.innerHTML = '?';
        btn.style.position = 'relative';
        btn.appendChild(badge);
      }
      const pred = pickData.predictedProgress;
      const profit = (parseFloat(marketPrice) - parseFloat(pickData.purchasePrice)).toFixed(1);
      badge.title = `⚠️ Price Drop Alert: Predicted Progress is ${pred}% (Risk >= 75%) & Profit is +${profit}m (Even)`;
    } else if (badge) {
      badge.remove();
    }
  });
}

// 9. معالجة وتحديث كارت السعر والشارة في الـ Dialog
async function ensureDialogInfo() {
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog || !dialog.isConnected) {
    activePlayerId = null;
    return;
  }

  const picksMap = await loadMyTeamPicks();
  if (!picksMap) return;

  const playerInfo = await extractPlayerInfoFromDialog(dialog);
  if (!playerInfo) return;

  activePlayerId = playerInfo.playerId;
  const pickData = picksMap.get(playerInfo.playerId);
  if (pickData) {
    addPurchaseInfo(dialog, pickData, playerInfo.playerName);
  }
}

// 10. الجدولة الذكية للتحقق الدوري (Debounced)
function scheduleCheck() {
  if (ensureTimer) clearTimeout(ensureTimer);
  ensureTimer = setTimeout(() => {
    ensureDialogInfo();
  }, 100);

  if (pitchTimer) clearTimeout(pitchTimer);
  pitchTimer = setTimeout(() => {
    updatePitchAlertBadges();
  }, 200);
}

// 11. MutationObserver لمراقبة DOM
function observeDialogs() {
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (
          (node.getAttribute && (node.getAttribute('role') === 'dialog' || node.getAttribute('data-pitch-element') === 'true')) ||
          (node.querySelector && (node.querySelector('[role="dialog"]') || node.querySelector('button[data-pitch-element="true"]') || node.querySelector('[class*="priceSection"]'))) ||
          (node.closest && (node.closest('[role="dialog"]') || node.closest('button[data-pitch-element="true"]')))
        ) {
          shouldCheck = true;
          break;
        }
      }
      if (shouldCheck) break;
    }

    if (shouldCheck) {
      scheduleCheck();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log('👀 Observer active and monitoring for pitch players & dialogs');
}

// البدء والتهيئة
async function init() {
  observeDialogs();
  await getBootstrapData();
  await loadMyTeamPicks();
  updatePitchAlertBadges();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
