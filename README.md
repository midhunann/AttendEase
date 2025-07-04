# ![AttendEase Logo](attend-ease-48.png) AttendEase 
Maximize your bunks! Skip as many classes as possible while maintaining at least 75% attendance.



[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/midhunann/amrita-attendease)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](/LICENSE)
[![Chrome Web Store – Not Published](https://img.shields.io/badge/Chrome%20Web%20Store-Not%20Published-lightgrey?logo=googlechrome)](#)
[![Firefox Add‑on – Not Published](https://img.shields.io/badge/Firefox%20Add--on-Not%20Published-lightgrey?logo=firefox)](#)
[![Edge Add‑on – Not Published](https://img.shields.io/badge/Edge%20Add--on-Not%20Published-lightgrey?logo=microsoftedge)](#)


---

| #   | Section                                                      |
| --- | ------------------------------------------------------------ |
| 1   | [Overview](#overview)                                        |
| 2   | [Motivation (Why)](#motivation-why)                          |
| 3   | [How It Works](#how-it-works)                                |
| 4   | [Key Features](#key-features)                                |
| 5   | [Installation](#installation)                                |
| 6   | [Releases](#releases)                                        |
| 7   | [Contributing](#contributing)                                |
| 8   | [License](#license)                                          |


---

## Overview

**AttendEase** is a browser extension designed for Amrita University students. It automatically scrapes attendance data from the official student portal and provides:

* **Bunkable Classes**: Maximum lectures you can skip while maintaining at least 75% attendance.
* **Recovery Classes**: Minimum lectures you need to attend if you’re below the threshold.

Access real-time stats through a floating widget or via the extension popup—no manual entry needed.

---

## Motivation (Why)

In my first year, I built a simple HTML/CSS/JS tool with my friend [Hemanth](https://github.com/hmnth-21) called [CampusCalc](https://github.com/midhunann/CampusCalc.git) to calculate attendance manually for any college. Although functional, it required manual entry for each course and was time-consuming.

**AttendEase** evolved from CampusCalc to:

1. Automatically scrape attendance data directly from our portal
2. Save significant time, so you can focus on studies or well-earned breaks
3. Eliminate human error with robust parsing and validation logic
4. Provide instant insights through an interactive floating widget and popup UI

---

## How It Works

<details>
<summary>1. Content Script Injection</summary>

* Targets URLs under `https://students.amrita.edu/client/class-attendance*`.
* Injects `content.js` and `styles.css` into the attendance page.

</details>

<details>
<summary>2. Data Extraction</summary>

* Robust Selectors: Multiple DOM queries plus `MutationObserver` to handle dynamic content.
* Table Parsing: Extracts course code/name, total, present, duty leave, absent, medical leave.
* Retry Logic: Polling and exponential backoff for slow-loading pages.

</details>

<details>
<summary>3. Calculations</summary>

* Attendance % = `(present + dutyLeave) / totalClasses * 100`
* Bunkable: Max classes you can skip to stay at or above 75%.
* Recovery: Classes needed to reach 75% if below threshold.

</details>

<details>
<summary>4. User Interfaces</summary>

* Floating Widget: Draggable, collapsible, remembers its position in `localStorage`.
* Extension Popup: Card-based summary with color codes:

  * Safe (75% or above)
  * Warning (70–75%)
  * Danger (below 70%)

</details>

<details>
<summary>5. Storage & Updates</summary>

* Caches parsed data in Chrome `storage.local` for instant popup rendering.
* On popup open, fetches fresh data via message passing from `content.js`.
* Designed for seamless updates—simply push new versions to respective extension stores.

</details>

---

## Key Features

| Feature                | Description                                                               |
| ---------------------- | ------------------------------------------------------------------------- |
| Automatic Scraping     | No manual entry—directly reads your portal’s attendance table.            |
| Real-Time Calculations | Instant bunkable and recovery numbers for each course.                    |
| Floating Dashboard     | Widget stays on-page, draggable and collapsible.                          |
| Extension Popup        | Quick summary in a popup UI with progress bars and status badges.         |
| Minimal Permissions    | Only requests `activeTab`, `storage`, and host access to Amrita’s portal. |
| Cross-Browser Ready    | Architecture supports Chrome, Edge, and Firefox (pending publication).    |

---

## Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/midhunann/amrita-attendease.git
   ```

2. **Load Unpacked Extension**:

   * **Chrome / Edge**:

     1. Navigate to `chrome://extensions` (or `edge://extensions`).
     2. Enable Developer mode.
     3. Click Load unpacked and select the project folder.

   * **Firefox**:

     1. Go to `about:debugging#/runtime/this-firefox`.
     2. Click Load Temporary Add-on.
     3. Select any file in the folder (e.g., `manifest.json`).

3. **Open** the Amrita attendance page—AttendEase will auto-activate.

---

## Releases

Yet to publish in:

<p align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/8/87/Google_Chrome_icon_%282011%29.png" alt="Chrome" width="32" />
  &nbsp;&nbsp;
  <img src="https://upload.wikimedia.org/wikipedia/commons/9/98/Microsoft_Edge_logo_%282019%29.svg" alt="Edge" width="32" />
  &nbsp;&nbsp;
  <img src="https://upload.wikimedia.org/wikipedia/commons/a/a0/Firefox_logo%2C_2019.svg" alt="Firefox" width="32" />
</p>


---

## Contributing

Contributions are welcome! You can:

* Report bugs or suggest new features via [Issues](https://github.com/midhunann/AttendEase/issues).
* Submit pull requests for enhancements—improve scraping logic, UI, accessibility, etc.
* Enhance documentation with examples or clarify edge cases.
---

## License

This project is licensed under the MIT License—see the [LICENSE](/LICENSE) file for details.

© 2025 Midhunan Vijendra Prabhaharan
