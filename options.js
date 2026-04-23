// Options page script for managing Team ID

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('settingsForm');
    const teamIdInput = document.getElementById('teamId');
    const statusDiv = document.getElementById('status');
    const currentIdSection = document.getElementById('currentIdSection');
    const currentTeamId = document.getElementById('currentTeamId');

    // Load current Team ID
    loadCurrentTeamId();

    // Handle form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveTeamId();
    });

    function loadCurrentTeamId() {
        chrome.storage.local.get(['fpl_extension_team_id'], (result) => {
            const teamId = result.fpl_extension_team_id;

            if (teamId) {
                currentIdSection.style.display = 'block';
                currentTeamId.textContent = teamId;
                teamIdInput.value = teamId;
            }
        });
    }

    function saveTeamId() {
        const teamId = teamIdInput.value.trim();

        // Validation
        if (!teamId) {
            showStatus('error', '❌ من فضلك أدخل Team ID');
            return;
        }

        if (!/^\d+$/.test(teamId)) {
            showStatus('error', '❌ Team ID يجب أن يحتوي على أرقام فقط');
            return;
        }

        // Save to chrome.storage
        chrome.storage.local.set({ fpl_extension_team_id: teamId }, () => {
            if (chrome.runtime.lastError) {
                showStatus('error', '❌ حدث خطأ في الحفظ: ' + chrome.runtime.lastError.message);
                return;
            }

            // Also save to localStorage for backward compatibility
            try {
                // This won't work directly from options page, but we'll send message to content script
                chrome.tabs.query({ url: 'https://fantasy.premierleague.com/*' }, (tabs) => {
                    tabs.forEach(tab => {
                        chrome.tabs.sendMessage(tab.id, {
                            action: 'saveTeamId',
                            teamId: teamId
                        }).catch(() => {
                            // Ignore errors if content script not loaded
                        });
                    });
                });
            } catch (e) {
                // Ignore
            }

            showStatus('success', '✅ تم حفظ Team ID بنجاح! يمكنك إغلاق هذه الصفحة الآن.');

            // Update current ID display
            currentIdSection.style.display = 'block';
            currentTeamId.textContent = teamId;
        });
    }

    function showStatus(type, message) {
        statusDiv.textContent = message;
        statusDiv.className = 'status ' + type;

        // Auto-hide success message after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 5000);
        }
    }
});
