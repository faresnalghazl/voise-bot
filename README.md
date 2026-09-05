# 🎵 Discord Voice & Music Bot

A high-performance Discord voice and music streaming bot built with Discord.js v14, @discordjs/voice, and youtube-dl-exec with custom FFmpeg audio transcoding pipelines.

Features interactive UI buttons for playback controls, real-time voice channel state management, and YouTube audio streaming with cookie session support.

---

## ✨ Key Features

- 🔊 Voice Channel Integration: Fast and stable voice gateway connection via @discordjs/voice.
- 🎶 Streaming Pipeline: Streams audio directly using youtube-dl-exec piped into a high-efficiency ffmpeg-static process.
- 🎛️ Interactive Controls: Buttons directly on the now-playing embed:
  - ⏸️ / ▶️ Pause / Resume
  - 🔁 Replay Current Track
  - ⏹️ Stop & Leave Voice Channel
- 🛡️ Session & Bot Protection: Supports cookies.json authentication to bypass YouTube streaming rate limits.
- ⚡ Voice State Validation: Ensures users are in the same voice channel before executing playback commands.

---

## 🛠️ Tech Stack & Dependencies

- Runtime: Node.js (v16.11.0+)
- Discord Gateway & API: discord.js v14
- Voice Engine: @discordjs/voice & opusscript
- Audio Extraction & Transcoding: youtube-dl-exec & ffmpeg-static

---

## 📁 Project Structure

voise-bot/
├── cookies.json        # YouTube session cookies (bypasses rate-limiting)
├── index.js            # Main application logic, voice connection & player controls
├── package.json        # Project metadata and dependencies
└── README.md           # Documentation

---

## 📦 Installation & Setup

### 1. Install Dependencies
Make sure you have Node.js installed, then run in your terminal:

npm install

Or install the core libraries manually:
npm install discord.js @discordjs/voice opusscript youtube-dl-exec ffmpeg-static dotenv

### 2. Discord Developer Portal Setup
1. Go to the Discord Developer Portal (https://discord.com/developers/applications).
2. Create an Application, then go to the Bot tab.
3. Under Privileged Gateway Intents, enable:
   - MESSAGE CONTENT INTENT
   - SERVER MEMBERS INTENT
4. Copy your Bot Token.

### 3. Configure Token & Cookies
- Replace the token in index.js (or preferably move it to a .env file as DISCORD_TOKEN).
- If streaming from YouTube requires verification, place your exported YouTube cookies in cookies.json.

### 4. Run the Bot
node index.js

---

## 🎮 Commands

| Command | Usage | Description |
| :--- | :--- | :--- |
| !play <name or URL> | !play lofi hip hop | Joins your voice channel and plays audio from YouTube |
| !stop | !stop | Stops audio playback and disconnects the bot from voice |

### 🎛️ Buttons Controls
Once a track is playing, an embed with interactive buttons appears:
- Pause / Resume: Pauses or resumes playback.
- Replay: Restarts the track from the beginning.
- Stop: Halts audio and disconnects from the channel.

---

## 📄 License

This project is licensed under the MIT License.
