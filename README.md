# Choice to Run — NFC Lap Counter

A modern PWA for tracking running laps via NFC tags. Features offline sync, real-time lap counting, and Google Sheets integration.

## 🚀 Quick Setup

### 1. Deploy to GitHub Pages
1. Push this code to a GitHub repository
2. Go to Settings → Pages
3. Source: "Deploy from a branch" → main branch
4. Your app will be live at: `https://yourusername.github.io/repo-name/`

### 2. Set up Google Apps Script
1. Go to [script.google.com](https://script.google.com)
2. Create new project
3. Replace `Code.gs` with the provided code
4. Deploy → New deployment → Web app
5. Execute as: "Me" → Who has access: "Anyone"
6. Copy the Web App URL

### 3. Update Apps Script URL
In `app.js`, replace the `APPS_SCRIPT_URL` with your new URL:
```javascript
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_NEW_URL/exec';
```

## 📱 NFC Tag Setup

### For NFC Tools app:
**Fun Run (tags 1-10):**
```
https://yourusername.github.io/repo-name/run.html?lap=1&course=fun&tag=1
https://yourusername.github.io/repo-name/run.html?lap=1&course=fun&tag=2
...
https://yourusername.github.io/repo-name/run.html?lap=1&course=fun&tag=10
```

**Serious Run (tags 1-10):**
```
https://yourusername.github.io/repo-name/run.html?lap=1&course=serious&tag=1
https://yourusername.github.io/repo-name/run.html?lap=1&course=serious&tag=2
...
https://yourusername.github.io/repo-name/run.html?lap=1&course=serious&tag=10
```

## 🏃‍♂️ How It Works

1. **Registration**: Runner enters name, course, and category
2. **NFC Tap**: Scan tag → immediately counts lap (no app opening needed)
3. **Offline Sync**: Laps queue locally, sync when online
4. **Manual Send**: Final results sent manually from results screen
5. **Google Sheets**: Data organized in tabs by course/category

## ✨ Features

- **First tap counts immediately** (no app opening required)
- **Offline-first** with automatic sync when online
- **60-second cooldown** between laps
- **Mobile-friendly** PWA with wake lock
- **Real-time sync status** indicator
- **Manual final send** for reliability
- **Organizer status page** for debugging

## 📊 Data Structure

Google Sheets will have these tabs:
- `Serious_Individual` - Serious run individual laps
- `Serious_Team` - Serious run team laps  
- `Fun_Individual` - Fun run individual laps
- `Fun_Team` - Fun run team laps
- `Results` - Final results summary

## 🔧 Customization

### Brand Colors
Edit the CSS variables in `styles.css`:
```css
:root {
  --brand: #14d7ff;      /* Primary brand color */
  --brand-2: #00ffa3;    /* Secondary brand color */
  --bg-1: #070b12;       /* Background dark */
  --bg-2: #0d1a2b;       /* Background light */
}
```

### Cooldown Time
Change in `app.js`:
```javascript
const COOLDOWN_MS = 60_000; // 60 seconds
```

## 🐛 Troubleshooting

### Check sync status:
- Visit `/status.html` to see local storage and force sync
- Green dot = synced, Yellow dot = pending, Red dot = error

### Common issues:
- **CORS errors**: Make sure Apps Script is deployed as "Anyone"
- **No lap counting**: Check NFC tag URLs are correct
- **Sync fails**: Verify internet connection and Apps Script URL

## 📱 PWA Features

- Install to home screen
- Works offline
- Push notifications (future)
- Background sync

## 🔒 Privacy

- All data stored locally first
- Only sends to your Google Sheets
- No third-party tracking
- No analytics

---

**Built for Choice to Run events** 🏃‍♂️ 