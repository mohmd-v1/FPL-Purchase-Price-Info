# FPL Purchase Price Info Extension

A Chrome extension that displays the purchase price of your Fantasy Premier League players right on the FPL website, fetching data seamlessly from fpl.team.

## Features

- ✨ Automatically shows the Purchase Price
- 💰 Displays the current Sell Price
- 🎨 Clean, native-looking design matching the FPL website
- ⚡ Fast and lightweight

## Installation

### Local Installation (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** in the top right corner
3. Click on **Load unpacked**
4. Select the extension directory
5. The extension will now appear in your extensions list

## Usage

1. Upon first use, the extension will prompt you to enter your **Team ID**.
   - You can get this from your fpl.team URL.
   - Example: In the URL `https://fpl.team/plan/3022172/`, the number `3022172` is your Team ID.
   - You can also change your Team ID anytime by clicking on the extension icon.

2. Afterwards, whenever you open a player's information dialog on the Fantasy Premier League website:
   - The purchase price information will appear automatically at the top of the stats list.
   - It features a distinct purple design, showing your profit/loss margin.

## Notes

- The extension only works for players currently in your squad.
- Data is fetched directly from fpl.team.
- No additional login is required.

## Troubleshooting

### Purchase Info Not Showing
- Ensure you have entered the correct Team ID.
- Verify that the player is actually in your squad on fpl.team.
- Ensure the extension is enabled in `chrome://extensions/`.

### How to Change Team ID
You can change your Team ID by clicking on the extension icon and clicking the settings button. Alternatively, open the browser console on the Fantasy Premier League page and type:
```javascript
localStorage.removeItem('fpl_extension_team_id');
```
Then refresh the page.

## Support

If you encounter any issues, check the browser console (F12) to see if there are any error messages.
