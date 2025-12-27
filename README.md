<div align="center">

# 📦 EasyWinGet
### The Modern, Elegant GUI for Windows Package Manager

![Version](https://img.shields.io/badge/version-3.2.0-blue?style=for-the-badge&logo=windows)
![Platform](https://img.shields.io/badge/platform-Windows-0078D6?style=for-the-badge&logo=windows)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![PowerShell](https://img.shields.io/badge/backend-PowerShell-5391FE?style=for-the-badge&logo=powershell)

**EasyWinGet** is a stunning, web-based graphical interface for the Windows Package Manager (WinGet). Experience the power of the command line with the elegance of a modern web application.

[Fast] • [Beautiful] • [Powerful] • [Open Source]

</div>

---

## ✨ Features

### 🎨 Modern User Interface
- **Glassmorphism Design**: Sleek, dark-themed UI with translucent elements.
- **Responsive**: Perfectly adapts to any screen size.
- **Animations**: Smooth transitions, hover effects, and loading states.
- **Interactive Feedback**: Toast notifications and progress tracking.

### 🚀 Powerful Management
- **Smart Search**: Instantly find thousands of apps locally and from the WinGet catalog.
- **One-Click Actions**: Install, Update, and Uninstall applications with a single click.
- **Bulk Operations**: Update all your outdated apps effortlessly.
- **Sort & Filter**: Organize your installed apps A-Z or Z-A with dynamic filtering.

### ⚡ Performance
- **Local Caching**: Blazing fast load times using JSON-based caching.
- **Optimized Backend**: Lightweight PowerShell server (no Node.js/Python required).
- **Asynchronous**: Non-blocking operations ensure the UI never freezes.

---

## 🛠️ Technology Stack

This project uses a unique, lightweight architecture:

| Component | Technology | Description |
|-----------|------------|-------------|
| **Frontend** | HTML5, CSS3, JavaScript | Pure vanilla stack. No frameworks, no build steps. |
| **Backend** | PowerShell Core | custom HTTP server implementation. |
| **Database** | JSON | File-based caching for high performance. |
| **Core** | WinGet CLI | Microsoft's official Windows Package Manager. |

---

## 📂 Project Structure

```text
EasyWinGet/
├── 📂 data/                # Application cache storage
│   ├── installed.json      # Cached list of installed apps
│   └── updates.json        # Cached list of available updates
├── 📂 gui/                 # Frontend Source Code
│   ├── index.html          # Main application interface
│   ├── style.css           # Premium styling & animations
│   └── script.js           # UI Logic & API communication
├── 📂 modules/             # Backend Modules
│   └── parser.ps1          # Advanced WinGet output parser
├── 📂 Downloads/           # Default download directory
├── server.ps1              # Core PowerShell HTTP Server
├── start-gui.bat           # One-click launcher script
└── version.json            # Version control metadata
```

---

## 🚀 Getting Started

### Prerequisites
- **Windows 10/11** (1809 or newer)
- **App Installer** (WinGet) installed

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/DARKBOYJYOTI/EasyWinGet.git
   ```
2. Navigate to the folder:
   ```bash
   cd EasyWinGet
   ```

### Usage
Simply double-click **`start-gui.bat`**. 
- This will start the local server.
- Automatically open your default browser to `http://localhost:8080`.

---

## 👨‍💻 Credits & Author

<div align="center">

**Created with ❤️ by**

### **Jyoti Karmakar**

[![GitHub](https://img.shields.io/badge/GitHub-DARKBOYJYOTI-181717?style=for-the-badge&logo=github)](https://github.com/DARKBOYJYOTI)
[![Website](https://img.shields.io/badge/Website-darkboyjyoti.github.io-blue?style=for-the-badge&logo=google-chrome)](https://darkboyjyoti.github.io)
[![YouTube](https://img.shields.io/badge/YouTube-Subscribe-red?style=for-the-badge&logo=youtube)](https://www.youtube.com/karmakarjyoti777)
[![Email](https://img.shields.io/badge/Email-Contact_Me-EA4335?style=for-the-badge&logo=gmail)](mailto:karmakarjyoti777@gmail.com)

*"Coding the future, one script at a time."*

</div>

---

<div align="center">
© 2024 EasyWinGet. Open Source Community.
</div>
