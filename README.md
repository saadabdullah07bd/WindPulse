<div align="center">

<img src="https://raw.githubusercontent.com/saadabdullah07bd/WindPulse/main/src/assets/windpulse-icon.png" alt="WindPulse Logo" width="120" />

<h1>WindPulse</h1>

<p><strong>Free & Open Source Android Screen Mirroring for Windows</strong></p>

<p>
  <a href="https://github.com/saadabdullah07bd/WindPulse/releases/latest"><img src="https://img.shields.io/github/v/release/saadabdullah07bd/WindPulse?style=flat-square&color=00b4d8&label=Version" alt="Release" /></a>
  <a href="https://github.com/saadabdullah07bd/WindPulse/blob/main/LICENSE"><img src="https://img.shields.io/github/license/saadabdullah07bd/WindPulse?style=flat-square&color=38b000" alt="License" /></a>
  <a href="https://github.com/saadabdullah07bd/WindPulse/stargazers"><img src="https://img.shields.io/github/stars/saadabdullah07bd/WindPulse?style=flat-square&color=ffd60a" alt="Stars" /></a>
  <a href="https://github.com/saadabdullah07bd/WindPulse/releases"><img src="https://img.shields.io/github/downloads/saadabdullah07bd/WindPulse/total?style=flat-square&color=9b5de5" alt="Downloads" /></a>
  <a href="https://github.com/saadabdullah07bd/WindPulse/issues"><img src="https://img.shields.io/github/issues/saadabdullah07bd/WindPulse?style=flat-square&color=ef476f" alt="Issues" /></a>
</p>

<p>
  <a href="https://github.com/saadabdullah07bd/WindPulse/releases/download/Files/WindPulseV2.0.Setupx64.exe">
    <img src="https://img.shields.io/badge/⬇_Download_WindPulse_v2.0-00b4d8?style=for-the-badge&logoColor=white" alt="Download" />
  </a>
</p>

<p><em>Mirror your Android screen to your PC — wirelessly or via USB. No ads, no tracking, no sign-up.</em></p>

</div>

---

<h2>✨ Features</h2>

<table>
  <tr>
    <td>📱 <strong>USB & Wireless Mirroring</strong></td>
    <td>Connect via USB cable or Wi-Fi with native <code>adb pair</code> support</td>
  </tr>
  <tr>
    <td>🖥️ <strong>Multiple Devices</strong></td>
    <td>Mirror and manage multiple Android devices simultaneously</td>
  </tr>
  <tr>
    <td>🎮 <strong>3 Display Modes</strong></td>
    <td><strong>Mirror</strong> (view + control), <strong>Stream</strong> (view only), <strong>Record</strong> (capture to file)</td>
  </tr>
  <tr>
    <td>⚡ <strong>Low Latency</strong></td>
    <td>Powered by <a href="https://github.com/Genymobile/scrcpy">scrcpy</a> for near-native performance</td>
  </tr>
  <tr>
    <td>🔒 <strong>Privacy First</strong></td>
    <td>No data collection, no ads, no telemetry — ever</td>
  </tr>
  <tr>
    <td>🆓 <strong>100% Free</strong></td>
    <td>Open source under MIT License — free forever</td>
  </tr>
</table>

---

<h2>📸 Screenshots</h2>

<div align="center">
  <p><em>Screenshots coming soon</em></p>
</div>

---

<h2>🚀 Installation</h2>

<h3>Quick Install (Recommended)</h3>

<ol>
  <li>Download <a href="https://github.com/saadabdullah07bd/WindPulse/releases/download/Files/WindPulseV2.0.Setupx64.exe"><strong>WindPulseV2.0.Setupx64.exe</strong></a></li>
  <li>Run the installer</li>
  <li>Launch WindPulse from your desktop</li>
  <li>Connect your Android device via USB or Wi-Fi</li>
</ol>

<h3>System Requirements</h3>

<table>
  <tr>
    <td><strong>OS</strong></td>
    <td>Windows 10 / 11 (64-bit)</td>
  </tr>
  <tr>
    <td><strong>Android</strong></td>
    <td>Android 11+ (API 30+)</td>
  </tr>
  <tr>
    <td><strong>USB</strong></td>
    <td>USB Debugging enabled on your device</td>
  </tr>
  <tr>
    <td><strong>Wi-Fi</strong></td>
    <td>Both devices on the same network</td>
  </tr>
</table>

<h3>Build from Source</h3>

```bash
# Clone the repository
git clone https://github.com/saadabdullah07bd/WindPulse.git
cd WindPulse

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build the installer
npm run build
```

---

<h2>📱 How to Connect Your Device</h2>

<h3>USB Connection</h3>

<ol>
  <li>Enable <strong>Developer Options</strong> on your Android device</li>
  <li>Enable <strong>USB Debugging</strong> in Developer Options</li>
  <li>Connect your device via USB cable</li>
  <li>Open WindPulse and click <strong>Connect</strong></li>
</ol>

<h3>Wireless Connection</h3>

<ol>
  <li>Enable <strong>Wireless Debugging</strong> in Developer Options (Android 11+)</li>
  <li>Open WindPulse and select <strong>Wireless Pairing</strong></li>
  <li>Enter the pairing code shown on your device</li>
  <li>Click <strong>Connect</strong></li>
</ol>

---

<h2>🏗️ Tech Stack</h2>

<table>
  <tr>
    <td><strong>Framework</strong></td>
    <td>Electron + React + TypeScript</td>
  </tr>
  <tr>
    <td><strong>UI</strong></td>
    <td>Tailwind CSS + shadcn/ui</td>
  </tr>
  <tr>
    <td><strong>Build</strong></td>
    <td>Vite + electron-builder</td>
  </tr>
  <tr>
    <td><strong>Mirroring</strong></td>
    <td>scrcpy + ADB</td>
  </tr>
</table>

---

<h2>🤝 Contributing</h2>

<p>Contributions are welcome! Please read the <a href="CONTRIBUTING.md">Contributing Guide</a> before submitting a pull request.</p>

---

<h2>📄 License</h2>

<p>This project is licensed under the <a href="LICENSE">MIT License</a> — free to use, modify, and distribute.</p>

---

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/saadabdullah07bd">Saad Abdullah</a></p>
  <p>
    <a href="https://github.com/saadabdullah07bd/WindPulse/stargazers">⭐ Star this repo</a> if you find it useful!
  </p>
</div>
