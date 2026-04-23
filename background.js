// Background Service Worker
// يتعامل مع طلبات fetch من content script

console.log('🔧 Background service worker loaded');

// الاستماع للرسائل من content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Received message:', request);

    if (request.action === 'fetchPlayerPrices') {
        const { teamId, playerName } = request;

        // جلب البيانات من fpl.team
        fetch(`https://fpl.team/plan/${teamId}/`)
            .then(response => {
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error(`Team ID ${teamId} غير موجود على fpl.team!`);
                    }
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                // إرسال HTML للـ content script
                sendResponse({ success: true, html });
            })
            .catch(error => {
                console.error('❌ Fetch error:', error);
                sendResponse({ success: false, error: error.message });
            });

        // إبقاء القناة مفتوحة للرد غير المتزامن
        return true;
    }
});
