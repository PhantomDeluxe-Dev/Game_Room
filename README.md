# 🎮 Game Room – Modern Arcade Web App

A clean, modern browser-based arcade featuring classic mini-games built using HTML, TailwindCSS, and JavaScript. This project recreates nostalgic gameplay with a sleek UI and modular architecture.

[View my live portfolio here!](https://phantomdeluxe-dev.github.io/Game_Room/)
---

## 🚀 Features

* 🎨 Modern UI with TailwindCSS
* 🧩 Multiple classic games in one place
* ⚡ Lightweight and fast (no frameworks)
* 🪟 Modal-based game system
* 🎮 Keyboard-controlled gameplay
* 📱 Responsive layout with horizontal game carousel

---

## 🕹️ Available Games

* 🐍 **Snake**
* 🟦 **Tetris**
* 🏓 **Pong**
* ⌨️ **Word Attack**
* 🔴 **4 in a Row**

---

## 📂 Project Structure

```
/project-root
│
├── index.html
├── snake.js
├── tetris.js
├── pong.js
├── wordattack.js
├── fourinrow.js
│
└── assets (optional)
```

---

## 🛠️ Technologies Used

* HTML5 (Canvas API for rendering games)
* TailwindCSS (UI styling)
* Vanilla JavaScript (game logic)

---

## ▶️ How to Run

1. Download or clone the repository
2. Make sure all `.js` files are in the same directory as `index.html`
3. Open `index.html` in your browser

No build step or server required.

---

## 🎮 Controls

### Snake

* Arrow Keys / WASD → Move

### Tetris

* ← → → Move
* ↑ / Z → Rotate
* ↓ → Soft drop
* Space → Hard drop

### Pong

* ↑ ↓ or W S → Move paddle

### Word Attack

* Type words to destroy them
* Space → EMP ability

### 4 in a Row

* Mouse click → Drop piece

---

## 🧱 Architecture

* Each game is encapsulated in its own JS module
* Games are initialized using:

  ```js
  GameName.init(canvas, ...uiElements)
  ```
* Cleanup handled via:

  ```js
  GameName.destroy()
  ```
* Modal system controls game lifecycle

---

## 🧹 Customization

You can easily:

* Add new games (create new `.js` + modal)
* Modify UI via Tailwind config
* Adjust difficulty inside individual game files

---

## ⚠️ Known Limitations

* No persistent leaderboard
* No multiplayer (except local logic like CPU)
* No mobile touch controls (yet)

---

## 🔮 Future Improvements

* 🏆 Leaderboard system
* 🌐 Multiplayer support
* 📱 Touch/mobile controls
* 💾 Save game progress
* 🎵 Sound effects & music

---

## 📄 License

This project is open-source and free to use for learning or personal projects.

---

## 👤 Author

Built as a modern arcade experiment combining UI design and game development fundamentals.

---
