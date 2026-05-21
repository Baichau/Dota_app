# ⚔️ DotaQuest Hub

**Forge Your Legacy. Earn Stars. Open Cases. Rise.**

DotaQuest Hub is a web platform where Dota 2 players complete skill-based quests, earn Stars, and open cases containing legendary in-game skins.  
It features **real Steam login**, persistent user progress, a daily bonus wheel, and a fully responsive UI with a fantasy RPG aesthetic.

![DotaQuest Hub Screenshot](https://via.placeholder.com/800x400?text=DotaQuest+Hub+Preview)  
*(Replace with an actual screenshot of your dashboard)*

---

## ✨ Features

- 🔐 **Real Steam OAuth 2.0 Login** – secure authentication via Passport‑Steam  
- 📜 **Daily & Weekly Quests** – submit Match IDs to earn Stars and bonus cases  
- 🎁 **Case Opening System** – weighted rarities (Common → Arcana) with animated chest opening  
- 🎡 **Daily Bonus Wheel** – spin once per day for Stars or a free case  
- 🗃️ **Inventory** – view collected items, filter by rarity  
- 👤 **Profile** – track stats, redeem promo codes, copy referral link  
- 💾 **Server‑side persistence** – all progress saved via REST API  
- 📱 **Fully Responsive** – works on desktop, tablet, and mobile  

---

## 🛠️ Tech Stack

| Layer       | Technology |
|-------------|------------|
| Frontend    | HTML5, CSS3, Vanilla JavaScript |
| Backend     | Node.js + Express |
| Auth        | Passport.js (Steam strategy) |
| Database    | In‑memory (Map) – easily replaceable with MongoDB/PostgreSQL |
| Styling     | Custom CSS with gold/crimson RPG theme |
| Fonts       | Google Fonts (Cinzel Decorative, Inter) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or later)
- A Steam account
- A [Steam Web API Key](https://steamcommunity.com/dev/apikey) (set domain to `localhost` for testing)

### Installation

1. **Clone the repository**  
   ```bash
   git clone https://github.com/your-username/dotaquest-hub.git
   cd dotaquest-hub