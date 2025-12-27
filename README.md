<div align="center">

# 📦 EasyWinGet
### The Ultimate Modern GUI for Windows Package Manager

![Version](https://img.shields.io/badge/version-3.5.0-blue?style=for-the-badge&logo=windows)
![Platform](https://img.shields.io/badge/platform-Windows-0078D6?style=for-the-badge&logo=windows)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![PowerShell](https://img.shields.io/badge/backend-PowerShell-5391FE?style=for-the-badge&logo=powershell)

**EasyWinGet** redefines how you manage software on Windows. By combining the raw power of **WinGet** with a stunning, **Glassmorphism-inspired web interface**, it delivers a premium experience that is both beautiful and blazing fast.

[Fast] • [Beautiful] • [Powerful] • [Open Source]

</div>

---

## ✨ Why EasyWinGet?

EasyWinGet isn't just a wrapper; it's a complete reimagining of the package manager experience.

### 🎨 Stunning Visuals ("Jhakks" Design)
- **Glassmorphism UI**: A premium, translucent dark theme that looks modern on any desktop.
- **Fluid Animations**: Every interaction, from hovering to loading, is smooth and responsive.
- **Context-Aware Buttons**: Smart buttons that know if an app is installed, needs an update, or is ready to download.

### 🚀 Next-Gen Features
- **📦 Smart App Management**: Install, Update, and Uninstall thousands of apps with one click.
- **🛡️ Ignore Updates**: Don't want to update a specific app? Simply **Ignore** it, and it vanishes from your update list. Manage your ignored apps via a dedicated modal.
- **📂 Download Manager**: Download installers directly for offline use. Track, Run, or Delete them instantly from the "Downloaded" tab.
- **🔍 Intelligent Search**: Finds apps locally and from the Microsoft Store/WinGet repository instantly.
- **⚡ Zero-Lag Performance**: Uses advanced **JSON Caching** and **Multi-threaded Background Loading** to ensure the UI never freezes, even with huge libraries.

---

## 🛠️ Tech Architecture

Built with a philosophy of **"Zero Dependencies"** for the end-user. No Node.js, no Python, no bloated runtimes.

| Component | Technology | Why? |
|-----------|------------|------|
| **Frontend** | HTML5, CSS3, Vanilla JS | Maximum speed, instant startup, no compile step. |
| **Backend** | PowerShell Core | Native Windows integration, deeply hooks into WinGet. |
| **Data Layer** | JSON Files | File-based caching for persistence without database overhead. |
| **Executor** | WinGet CLI | Leveraging Microsoft's official reliable package manager. |

---

## 📂 Project Structure

A clean, modular architecture makes contributing easy:

```text
EasyWinGet/
├── 📂 data/                # Intelligent JSON Cache Layer
│   ├── installed.json      # Snapshot of current system
│   ├── updates.json        # Pending approvals
│   ├── ignored.json        # User-defined exclusion list
│   └── downloads.json      # Tracked offline installers
├── 📂 gui/                 # The "Jhakks" Frontend
│   ├── index.html          # Semantic HTML5 Structure
│   ├── style.css           # 1000+ lines of hand-crafted CSS variables & animations
│   └── script.js           # Async logic, API layer, & DOM manipulation
├── 📂 modules/             # Backend Logic
│   └── parser.ps1          # Regex-based output parser
├── 📂 Downloads/           # Dedicated folder for downloaded installers
├── server.ps1              # The Brain: Custom HTTP Server implementation
└── start-gui.bat           # One-click Magic Launcher
```

---

## 🚀 Getting Started

No installation wizards. No complex setup. Just run and go.

### Prerequisites
- **Windows 10/11** (1809 or newer)
- **WinGet** (App Installer) pre-installed (Standard on modern Windows)

### Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/DARKBOYJYOTI/EasyWinGet.git
   ```
2. Enter the directory:
   ```bash
   cd EasyWinGet
   ```

### Usage
Double-click **`start-gui.bat`**.
- The server starts instantly.
- Your default browser opens the dashboard automatically.
- Start managing your apps like a pro!

---

## 👨‍💻 Credits & Author

<div align="center">

**Masterminded by**

### **Jyoti Karmakar**

[![GitHub](https://img.shields.io/badge/GitHub-DARKBOYJYOTI-181717?style=for-the-badge&logo=github)](https://github.com/DARKBOYJYOTI)
[![Website](https://img.shields.io/badge/Website-darkboyjyoti.github.io-blue?style=for-the-badge&logo=google-chrome)](https://darkboyjyoti.github.io)
[![YouTube](https://img.shields.io/badge/YouTube-Subscribe-red?style=for-the-badge&logo=youtube)](https://www.youtube.com/karmakarjyoti777)
[![Email](https://img.shields.io/badge/Email-Contact_Me-EA4335?style=for-the-badge&logo=gmail)](mailto:karmakarjyoti777@gmail.com)

*"Coding the future, one script at a time."*

</div>

---

<div align="center">
© 2025 EasyWinGet. Open Source Community.
</div>
