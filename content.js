// FPL Purchase Price Info Extension v4
// يستخدم FPL Bootstrap API + fpl.team API

console.log('🟢 FPL Purchase Price Extension v4: Starting...');

// Cache للاعبين
let playersCache = null;

// الحصول على معرف الفريق من chrome.storage أو localStorage
async function getTeamId() {
  console.log('🔍 Attempting to get Team ID...');

  return new Promise((resolve) => {
    // Try chrome.storage first
    chrome.storage.local.get(['fpl_extension_team_id'], (result) => {
      if (result.fpl_extension_team_id) {
        console.log('✅ Found Team ID in chrome.storage:', result.fpl_extension_team_id);
        // Sync to localStorage
        localStorage.setItem('fpl_extension_team_id', result.fpl_extension_team_id);
        resolve(result.fpl_extension_team_id);
        return;
      }

      // Fallback to localStorage
      try {
        const savedTeamId = localStorage.getItem('fpl_extension_team_id');
        if (savedTeamId) {
          console.log('✅ Found Team ID in localStorage:', savedTeamId);
          // Migrate to chrome.storage
          chrome.storage.local.set({ fpl_extension_team_id: savedTeamId });
          resolve(savedTeamId);
          return;
        }
      } catch (e) {
        console.error('❌ Error accessing localStorage:', e);
      }

      // No Team ID found - prompt user
      console.log('⚠️ No Team ID found, prompting user...');
      const teamId = prompt('من فضلك أدخل معرف فريقك (Team ID) من موقع fpl.team\nمثال: 3022172\n\nيمكنك تغييره لاحقاً بالضغط على أيقونة الإضافة');

      if (teamId) {
        // Save to both
        chrome.storage.local.set({ fpl_extension_team_id: teamId });
        localStorage.setItem('fpl_extension_team_id', teamId);
        console.log('✅ Team ID saved:', teamId);
        resolve(teamId);
      } else {
        console.log('❌ No Team ID provided');
        resolve(null);
      }
    });
  });
}

// الحصول على بيانات كل اللاعبين من FPL Bootstrap API
async function fetchAllPlayers() {
  if (playersCache) {
    console.log('📦 Using cached players data');
    return playersCache;
  }

  try {
    console.log('🌐 Fetching FPL Bootstrap data...');
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    const data = await response.json();

    // بناء mapping: FPL ID -> Player Info
    playersCache = {};
    data.elements.forEach(player => {
      playersCache[player.id] = {
        id: player.id,
        name: player.web_name,  // اسم اللاعب
        firstName: player.first_name,
        secondName: player.second_name,
        team: player.team
      };
    });

    console.log(`✅ Loaded ${Object.keys(playersCache).length} players from FPL API`);
    return playersCache;
  } catch (error) {
    console.error('❌ Error fetching FPL bootstrap:', error);
    return null;
  }
}

// الحصول على FPL Player ID من الاسم
function getFPLPlayerIdByName(playerName, allPlayers) {
  for (const [id, player] of Object.entries(allPlayers)) {
    if (player.name.toLowerCase() === playerName.toLowerCase() ||
      player.secondName.toLowerCase() === playerName.toLowerCase()) {
      console.log(`✅ Found FPL ID ${id} for ${playerName}`);
      return id;
    }
  }
  console.log(`⚠️ No FPL ID found for ${playerName}`);
  return null;
}

// استخراج البيانات من fpl.team عبر background script (لتجنب CORS)
async function fetchPlayerPrices(teamId, playerName) {
  console.log(`🌐 Requesting prices for "${playerName}" from background script...`);
  console.log(`📋 TeamID value: "${teamId}", type: ${typeof teamId}`);

  return new Promise((resolve, reject) => {
    // إرسال رسالة للـ background script - Ensure teamId is string
    chrome.runtime.sendMessage(
      {
        action: 'fetchPlayerPrices',
        teamId: String(teamId),  // Force convert to string
        playerName
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Runtime error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        if (!response || !response.success) {
          const errorMsg = response?.error || 'No response';
          console.error('❌ Fetch failed:', errorMsg);

          // Alert user if Team ID is wrong
          if (errorMsg.includes('404') || errorMsg.includes('غير موجود')) {
            alert(`⚠️ خطأ في Team ID!\n\nالـ Team ID ${teamId} غير موجود على fpl.team\n\nالحل:\n✅ اضغط على أيقونة الإضافة 📊\n✅ زر "تغيير Team ID"\n✅ أدخل الرقم الصحيح من fpl.team`);
          }

          reject(new Error(errorMsg));
          return;
        }

        console.log('✅ Received HTML from background, parsing...');

        // تحليل HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(response.html, 'text/html');

        // البحث عن اللاعب
        const allPlayers = doc.querySelectorAll('[data-player-name]');
        console.log(`📋 Found ${allPlayers.length} players in HTML`);

        // محاولة المطابقة بطرق متعددة
        let foundPlayer = null;
        const searchNameLower = playerName.toLowerCase();

        for (const playerDiv of allPlayers) {
          const name = playerDiv.getAttribute('data-player-name');
          if (!name) continue;

          const nameLower = name.toLowerCase();

          // المطابقة 1: تطابق كامل
          if (nameLower === searchNameLower) {
            foundPlayer = playerDiv;
            console.log(`✅ Exact match found: "${name}"`);
            break;
          }

          // المطابقة 2: تطابق جزئي (للأسماء المختصرة مثل "Bruno G.")
          if (nameLower.includes(searchNameLower) || searchNameLower.includes(nameLower)) {
            foundPlayer = playerDiv;
            console.log(`✅ Partial match found: "${name}" ~ "${playerName}"`);
            break;
          }

          // المطابقة 3: تطابق الكلمة الأخيرة (اللقب)
          const lastWordSearch = searchNameLower.split(/\s+/).pop();
          const lastWordName = nameLower.split(/\s+/).pop();
          if (lastWordSearch === lastWordName && lastWordSearch.length > 3) {
            foundPlayer = playerDiv;
            console.log(`✅ Last name match found: "${name}" (${lastWordName}) ~ "${playerName}" (${lastWordSearch})`);
            break;
          }
        }

        if (foundPlayer) {
          const purchasePrice = foundPlayer.getAttribute('data-player-purchase-price');
          const sellPrice = foundPlayer.getAttribute('data-player-sell-price');
          const currentPrice = foundPlayer.getAttribute('data-player-price');
          const matchedName = foundPlayer.getAttribute('data-player-name');

          console.log('✅ Found prices:', {
            matchedName,
            purchasePrice,
            sellPrice,
            currentPrice
          });

          resolve({
            playerName: matchedName,
            purchasePrice,
            sellPrice,
            currentPrice
          });
        } else {
          console.log('⚠️ Player not in your fpl.team squad');
          console.log('Available players:', Array.from(allPlayers).slice(0, 10).map(p => p.getAttribute('data-player-name')).join(', '));
          resolve(null);
        }
      }
    );
  });
}

// إضافة معلومات السعر إلى صفحة اللاعب
function addPurchaseInfo(playerData) {
  console.log('📝 Adding purchase info to page...', playerData);

  if (!playerData || !playerData.purchasePrice) {
    console.log('⚠️ No purchase price data');
    return;
  }

  // حذف القديم إذا وجد
  const existing = document.querySelector('.fpl-purchase-info');
  if (existing) {
    existing.remove();
    console.log('🗑️ Removed old purchase info');
  }

  // البحث عن الحاوية الجديدة حسب طلب المستخدم
  const statsContainer = document.querySelector('._1j8cm7va');

  if (!statsContainer) {
    console.error('❌ Stats container (._1j8cm7va) not found');
    console.log('🔍 Available containers:', document.querySelectorAll('[class*="_1vuagv"]'));
    return;
  }

  console.log('✅ Found container:', statsContainer.className);

  // حساب الفرق (الربح/الخسارة)
  const purchasePrice = parseFloat(playerData.purchasePrice);
  const currentPrice = parseFloat(playerData.currentPrice);
  const difference = currentPrice - purchasePrice;
  const differenceText = difference >= 0 ? `+${difference.toFixed(1)}` : difference.toFixed(1);
  const diffColor = difference >= 0 ? '#00ff87' : '#ff4757'; // أخضر للربح، أحمر للخسارة

  console.log(`💰 Price: Buy ${purchasePrice} | Now ${currentPrice} | Diff ${differenceText}`);

  // إنشاء عنصر جديد
  const purchaseItem = document.createElement('li');
  purchaseItem.className = '_1pge6780 fpl-purchase-info';

  // حساب class الربح/الخسارة
  const diffClass = difference >= 0 ? 'fpl-profit' : 'fpl-loss';

  purchaseItem.innerHTML = `
    <div class="_1pge6781">
      <span class="_1pge6782" id="stat-title-purchase">Purchase→Current💲
      <span class="_1pge6783" id="stat-value-purchase">
        <span class="fpl-purchase-price">£${playerData.purchasePrice}m</span>
        <span class="fpl-arrow">→</span>
        <span class="fpl-current-price">£${playerData.currentPrice}m</span>
        <span class="fpl-price-diff ${diffClass}">(${differenceText}m)</span>
      </span>
      <span class="_1pge6784 fpl-extra-info">
        Sell: £${playerData.sellPrice}m
      </span>
    </div>
  `;

  statsContainer.insertBefore(purchaseItem, statsContainer.firstChild);
  console.log('✅ Purchase info added successfully!');
}

// استخراج معلومات اللاعب من dialog
async function extractAndDisplayPlayerInfo(dialog) {
  console.log('🔍 Extracting player info from dialog...');

  try {
    // محاولات متعددة للحصول على اسم اللاعب
    let playerName = null;

    // الطريقة 1: من عنوان h1
    const h1 = dialog.querySelector('h1');
    if (h1) {
      // البحث عن آخر div في h1 (عادة يحتوي على اللقب)
      const nameDiv = h1.querySelector('div[class*="_5kfev07"]');
      if (nameDiv) {
        playerName = nameDiv.textContent.trim();
        console.log('✅ Method 1 - Player name from _5kfev07:', playerName);
      }
    }

    // الطريقة 2: البحث في كل divs داخل h1
    if (!playerName && h1) {
      const allDivs = h1.querySelectorAll('div');
      if (allDivs.length >= 2) {
        // عادة الاسم الأخير (اللقب) في آخر div
        playerName = allDivs[allDivs.length - 1].textContent.trim();
        console.log('✅ Method 2 - Player name from last div in h1:', playerName);
      }
    }

    // الطريقة 3: من title الصفحة
    if (!playerName) {
      const titleElement = dialog.querySelector('h2[id*="sheet-title"]');
      if (titleElement) {
        // استخراج الاسم من title
        const titleText = titleElement.textContent;
        console.log('📝 Title text:', titleText);
      }
    }

    // الطريقة 4: مباشرة من h1 text content
    if (!playerName && h1) {
      const fullText = h1.textContent.trim();
      // عادة يكون بصيغة "FirstName LastName"
      const parts = fullText.split(/\s+/);
      if (parts.length > 0) {
        playerName = parts[parts.length - 1]; // آخر كلمة
        console.log('✅ Method 4 - Player name from h1 split:', playerName);
      }
    }

    if (!playerName) {
      console.error('❌ Could not extract player name from dialog');
      console.log('📋 Dialog HTML:', dialog.innerHTML.substring(0, 500));
      return;
    }

    console.log('✅ Final player name:', playerName);

    // تحويل الأسماء الكاملة إلى صيغة مختصرة للبحث
    // مثال: "Guimarães Rodriguez Moura" → ["Guimarães Rodriguez Moura", "Moura", "Bruno G."]
    const searchVariants = [playerName]; // الاسم الأصلي

    // استخراج كل الأسماء من h1 للحصول على الاسم الأول
    if (h1) {
      const allDivs = h1.querySelectorAll('div');
      if (allDivs.length >= 2) {
        const firstName = allDivs[0].textContent.trim(); // الاسم الأول
        const lastName = allDivs[allDivs.length - 1].textContent.trim(); // اللقب

        // إضافة اللقب فقط كخيار
        if (lastName && lastName !== playerName) {
          searchVariants.push(lastName);
        }

        // إنشاء نسخة مختصرة: "FirstName L."
        if (firstName && lastName) {
          const lastNameParts = lastName.split(/\s+/);
          if (lastNameParts.length > 0) {
            const abbreviated = `${firstName} ${lastNameParts[0][0]}.`;
            searchVariants.push(abbreviated);
            console.log(`📝 Created abbreviated variant: "${abbreviated}"`);
          }
        }
      }
    }

    console.log('🔍 Search variants:', searchVariants);


    // الحصول على Team ID
    const teamId = await getTeamId();
    if (!teamId) {
      console.log('❌ No Team ID');
      return;
    }

    // جلب أسعار اللاعب من fpl.team - جرب كل الأسماء المحتملة
    let playerPrices = null;
    for (const variant of searchVariants) {
      console.log(`🔎 Trying variant: "${variant}"`);
      playerPrices = await fetchPlayerPrices(teamId, variant);
      if (playerPrices) {
        console.log(`✅ Match found with variant: "${variant}"`);
        break;
      }
    }

    if (playerPrices) {
      addPurchaseInfo(playerPrices);
    } else {
      console.log('⚠️ Player not in your team or data unavailable after trying all variants');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// مراقبة فتح صفحة معلومات اللاعب
function observePlayerDialog() {
  console.log('👀 Setting up MutationObserver...');

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          let playerDialog = null;

          if (node.getAttribute && node.getAttribute('role') === 'dialog') {
            playerDialog = node;
          } else {
            playerDialog = node.querySelector('[role="dialog"]');
          }

          if (playerDialog) {
            console.log('🎯 Player dialog detected!');
            setTimeout(() => {
              extractAndDisplayPlayerInfo(playerDialog);
            }, 1000);
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('✅ Observer active');
}

// Listen for messages from options page to sync Team ID
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveTeamId' && request.teamId) {
    console.log('📨 Received Team ID update from options:', request.teamId);
    localStorage.setItem('fpl_extension_team_id', request.teamId);
    chrome.storage.local.set({ fpl_extension_team_id: request.teamId });
    sendResponse({ success: true });
  } else if (request.action === 'getTeamId') {
    const teamId = localStorage.getItem('fpl_extension_team_id');
    sendResponse({ teamId: teamId });
  }
  return true;
});

// التهيئة عند تحميل الصفحة
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM loaded');
    observePlayerDialog();
    // تحميل بيانات اللاعبين مسبقاً
    fetchAllPlayers();
  });
} else {
  console.log('✅ DOM already loaded');
  observePlayerDialog();
  fetchAllPlayers();
}

console.log('✅ Extension loaded!');
