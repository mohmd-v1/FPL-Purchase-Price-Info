// Popup script

document.addEventListener('DOMContentLoaded', () => {
    const teamIdValue = document.getElementById('teamIdValue');
    const openSettingsBtn = document.getElementById('openSettings');

    // Load and display current Team ID
    loadTeamId();

    // Open settings page when button is clicked
    openSettingsBtn.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    function loadTeamId() {
        // Try chrome.storage first
        chrome.storage.local.get(['fpl_extension_team_id'], (result) => {
            if (result.fpl_extension_team_id) {
                teamIdValue.textContent = result.fpl_extension_team_id;
                teamIdValue.classList.remove('team-id-none');
            } else {
                // Check localStorage as fallback (query active tab)
                chrome.tabs.query({ url: 'https://fantasy.premierleague.com/*' }, (tabs) => {
                    if (tabs.length > 0) {
                        chrome.tabs.sendMessage(tabs[0].id, { action: 'getTeamId' }, (response) => {
                            if (response && response.teamId) {
                                teamIdValue.textContent = response.teamId;
                                teamIdValue.classList.remove('team-id-none');
                                // Save to chrome.storage
                                chrome.storage.local.set({ fpl_extension_team_id: response.teamId });
                            } else {
                                showNoTeamId();
                            }
                        });
                    } else {
                        showNoTeamId();
                    }
                });
            }
        });
    }

    function showNoTeamId() {
        teamIdValue.textContent = 'غير محدد';
        teamIdValue.classList.add('team-id-none');
    }
});
