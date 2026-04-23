# FPL Purchase Price Info Extension

A Chrome extension that displays the purchase price of your Fantasy Premier League players right on the FPL website, fetching data seamlessly from fpl.team.
<img width="1012" height="866" alt="Screenshot 2026-04-23 183125" src="https://github.com/user-attachments/assets/f3b998b5-0519-4b4c-8e90-589c2bc81259" />

## Features

- ✨ Automatically shows the Purchase Price
- 💰 Displays the current Sell Price
- 🎨 Clean, native-looking design matching the FPL website
- ⚡ Fast and lightweight

## Installation
https://github.com/mohmd-v1/FPL-Purchase-Price-Info/releases/tag/1.0

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
