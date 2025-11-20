/**
 * Amrita AttendEase - Content Script
 * Injected into the attendance page to scrape data and show floating widget
 */

class AmritaAttendanceTracker {
  constructor() {
    this.MIN_ATTENDANCE = 75;
    this.tableData = [];
    this.widget = null;
    this.isWidgetVisible = false;
    this.includeMedical = false; // Initialize medical leave toggle state

    // Simulation Mode State
    this.isSimulationMode = false;
    this.simulationChanges = {}; // Stores delta: { subjectId: { attended: 0, missed: 0 } }

    this.init();
  }

  init() {
    // console.log('[AttendEase] Content script initializing...');

    // Load preferences (medical toggle and min attendance) from storage
    this.loadPreferences().then(() => {
      // Start with immediate check
      this.startTableDetection();

      // Also set up a MutationObserver to watch for dynamic content loading
      this.setupMutationObserver();
    });
  }

  async loadPreferences() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['includeMedical', 'minAttendance']);
        this.includeMedical = result.includeMedical || false;
        this.MIN_ATTENDANCE = result.minAttendance || 75;
        // console.log('[AttendEase] Loaded preferences - ML toggle:', this.includeMedical, 'Min Attendance:', this.MIN_ATTENDANCE);
      }
    } catch (error) {
      console.error('[AttendEase] Failed to load preferences:', error);
      this.includeMedical = false;
      this.MIN_ATTENDANCE = 75;
    }
  }

  async saveMLToggleState() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ includeMedical: this.includeMedical });
        // console.log('[AttendEase] Saved ML toggle state:', this.includeMedical);
      }
    } catch (error) {
      console.error('[AttendEase] Failed to save medical leave toggle state:', error);
    }
  }

  startTableDetection() {
    // Wait for table to load
    this.waitForTable().then(() => {
      // console.log('[AttendEase] Table found, scraping data...');
      this.scrapeAttendanceData();
      // console.log('[AttendEase] Data scraped:', this.tableData.length, 'subjects');
      this.createFloatingWidget();
      this.saveDataToStorage();
    }).catch(error => {
      console.error('[AttendEase] Error during initialization:', error);
      // Fallback: try again after a longer delay
      setTimeout(() => {
        // console.log('[AttendEase] Retrying after delay...');
        this.startTableDetection();
      }, 5000);
    });
  }

  setupMutationObserver() {
    // Watch for changes in the DOM that might indicate data loading
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any added nodes contain table data
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              if (node.tagName === 'TR' || node.querySelector('tr') ||
                node.tagName === 'TABLE' || node.querySelector('table')) {
                shouldCheck = true;
              }
            }
          });
        }
      });

      if (shouldCheck && this.tableData.length === 0) {
        // console.log('[AttendEase] DOM changes detected, checking for attendance data...');
        setTimeout(() => {
          this.checkAndUpdateData();
        }, 1000);
      }
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  checkAndUpdateData() {
    // Quick check if we now have data
    const table = document.getElementById('home_tab') ||
      document.querySelector('table[class*="attendance"]') ||
      document.querySelector('table.table') ||
      document.querySelector('.table-responsive table');

    if (table) {
      const rows = table.querySelectorAll('tr');
      const dataRows = Array.from(rows).filter((row, index) => {
        // Skip header row (index 0) and check if row has sufficient cells
        if (index === 0) return false;
        const cells = row.querySelectorAll('td, th');
        return cells.length >= 5;
      });

      if (dataRows.length > 0 && this.tableData.length === 0) {
        // console.log('[AttendEase] New data detected, processing...');
        this.scrapeAttendanceData();
        if (this.tableData.length > 0) {
          this.createFloatingWidget();
          this.saveDataToStorage();
        }
      }
    }
  }

  waitForTable() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 40; // 20 seconds max (increased timeout)

      const checkTable = () => {
        attempts++;
        // console.log(`[AttendEase] Looking for table, attempt ${attempts}/${maxAttempts}`);

        // Try multiple possible table selectors
        let table = document.getElementById('home_tab');

        // If home_tab doesn't exist, try other common table IDs/classes
        if (!table) {
          table = document.querySelector('table[class*="attendance"]') ||
            document.querySelector('table.table') ||
            document.querySelector('.table-responsive table') ||
            document.querySelector('#attendance_table') ||
            document.querySelector('[id*="tab"] table');
        }

        // console.log('[AttendEase] Table element found:', !!table);

        if (table) {
          // Check for data rows - be more flexible about the structure
          // Amrita uses th elements for all cells, not just headers
          const rows = table.querySelectorAll('tr');
          const dataRows = Array.from(rows).filter((row, index) => {
            // Skip the first row (header) and check if row has sufficient cells
            if (index === 0) return false; // Skip header row
            const cells = row.querySelectorAll('td, th');
            return cells.length >= 5; // At least 5 columns for attendance data
          });

          // console.log('[AttendEase] Total rows found:', rows.length);
          // console.log('[AttendEase] Data rows with sufficient columns:', dataRows.length);

          if (dataRows.length > 0) {
            // console.log('[AttendEase] Table ready with data!');
            // Store the table reference for later use
            this.attendanceTable = table;
            resolve();
            return;
          }
        }

        if (attempts >= maxAttempts) {
          console.error('[AttendEase] Table not found after maximum attempts');
          // console.log('[AttendEase] Available tables on page:');
          const allTables = document.querySelectorAll('table');
          allTables.forEach((t, i) => {
            // console.log(`Table ${i + 1}:`, t.id || t.className || 'no id/class', 'rows:', t.querySelectorAll('tr').length);
          });
          reject(new Error('Table not found'));
          return;
        }

        setTimeout(checkTable, 500);
      };
      checkTable();
    });
  }

  scrapeAttendanceData() {
    // Use the table we found in waitForTable, or try to find it again
    const table = this.attendanceTable || document.getElementById('home_tab') ||
      document.querySelector('table[class*="attendance"]') ||
      document.querySelector('table.table') ||
      document.querySelector('.table-responsive table');

    if (!table) {
      console.error('[AttendEase] Table not found during scraping');
      return;
    }

    // console.log('[AttendEase] Using table:', table.id || table.className || 'unnamed table');

    // Get all rows - Amrita table structure has all rows directly under table
    const allRows = table.querySelectorAll('tr');

    // Skip the first row (header row) and process data rows
    const rows = Array.from(allRows).slice(1);

    // console.log('[AttendEase] Found', rows.length, 'data rows to process');

    this.tableData = [];

    rows.forEach((row, index) => {
      // Amrita uses th elements for all cells, not td
      const cells = row.querySelectorAll('th');
      // console.log(`[AttendEase] Row ${index + 1}: ${cells.length} cells`);

      if (cells.length < 9) {
        console.warn(`[AttendEase] Row ${index + 1} has insufficient cells (${cells.length}), skipping`);
        return;
      }

      // Log the cell contents to understand the structure
      // console.log(`[AttendEase] Row ${index + 1} cells:`, Array.from(cells).map((cell, i) => `${i}: "${cell.textContent.trim()}"`));

      // Based on the table structure:
      // 0: Sl No, 1: Class Name, 2: Course (Code<br>Name), 3: Faculty, 
      // 4: Total, 5: Present, 6: Duty Leave, 7: Absent, 8: Percentage, 9: Medical

      const slNo = cells[0].textContent.trim();
      const className = cells[1].textContent.trim();
      const courseInfo = cells[2].innerHTML; // Contains course code and name
      const faculty = cells[3].textContent.trim();
      const total = parseInt(cells[4].textContent.trim()) || 0;
      const present = parseInt(cells[5].textContent.trim()) || 0;
      const dutyLeave = parseInt(cells[6].textContent.trim()) || 0;
      const absent = parseInt(cells[7].textContent.trim()) || 0;
      const percentage = parseFloat(cells[8].textContent.trim()) || 0;
      const medical = parseInt(cells[9].textContent.trim()) || 0;

      // Extract course code and name from the course info cell
      let courseCode = '';
      let courseName = '';

      if (courseInfo.includes('<br>')) {
        const parts = courseInfo.split('<br>');
        courseCode = parts[0].trim();
        courseName = parts[1] ? parts[1].trim() : 'Unknown Course';
      } else {
        courseCode = courseInfo.replace(/<[^>]*>/g, '').trim();
        courseName = 'Unknown Course';
      }

      // Skip rows with zero total (like the LSE211-Grp1 row)
      if (total === 0) {
        // console.log(`[AttendEase] Skipping row ${index + 1}: ${courseCode} (zero total classes)`);
        return;
      }

      // Calculate effective attendance including medical leave if toggle is on
      const effectivePresent = present + dutyLeave + (this.includeMedical ? medical : 0);
      const effectiveAttendance = (effectivePresent / total) * 100;

      // Debug: Log the attendance calculation
      // console.log(`[AttendEase] ${courseCode}: Present=${present}, DutyLeave=${dutyLeave}, Medical=${medical}, Total=${total}, ML=${this.includeMedical}, Calculated=${effectiveAttendance.toFixed(1)}%`);

      const subjectData = {
        id: index,
        serialNumber: slNo,
        courseCode: courseCode.substring(0, 20),
        courseName: courseName.substring(0, 50),
        className,
        faculty,
        total,
        present,
        dutyLeave,
        absent,
        medical,
        percentage: effectiveAttendance,
        status: this.getStatus(effectiveAttendance),
        calculations: this.calculateScenarios(total, present, dutyLeave, medical, effectiveAttendance)
      };

      // console.log(`[AttendEase] Processed subject:`, subjectData);
      this.tableData.push(subjectData);
    });

    // console.log('[AttendEase] Final scraped data:', this.tableData);
  }

  calculateScenarios(total, present, dutyLeave, medical, currentPercentage) {
    const results = {};
    const effectivePresent = present + dutyLeave + (this.includeMedical ? medical : 0);

    // Safety check for edge cases
    if (total <= 0) {
      results.canBunk = 0;
      results.needToAttend = 0;
      results.message = 'No classes recorded';
      return results;
    }

    // Validate input data consistency
    if (effectivePresent > total) {
      console.warn(`[AttendEase] Data consistency check: Present=${present}, DutyLeave=${dutyLeave}, Medical=${medical}, Total=${total}`);
      results.canBunk = 0;
      results.needToAttend = 0;
      results.message = 'Data inconsistency detected';
      return results;
    }

    // Calculate actual percentage including medical leave if enabled
    const actualPercentage = (effectivePresent / total) * 100;

    if (actualPercentage >= this.MIN_ATTENDANCE) {
      // Calculate how many classes can be bunked while maintaining 75%
      let canBunk = 0;
      let testTotal = total;

      while (canBunk < 1000) { // Safety limit
        testTotal++; // Test bunking one more class
        const newPercentage = (effectivePresent / testTotal) * 100;

        if (newPercentage >= this.MIN_ATTENDANCE) {
          canBunk++;
        } else {
          break;
        }
      }

      results.canBunk = Math.max(0, canBunk);
      results.message = results.canBunk > 0
        ? `You can bunk ${results.canBunk} more classes and stay ≥75%`
        : 'Cannot bunk any more classes';
    } else {
      // Calculate how many classes needed to reach 75%
      let needToAttend = 0;
      let futureTotal = total;
      let futureEffectivePresent = effectivePresent;

      // Use mathematical approach for better accuracy
      const minAttendMath = Math.ceil((this.MIN_ATTENDANCE / 100 * total - effectivePresent) / (1 - this.MIN_ATTENDANCE / 100));

      // Use iterative approach for validation
      while ((futureEffectivePresent / futureTotal) * 100 < this.MIN_ATTENDANCE && needToAttend < 1000) {
        futureTotal++;
        futureEffectivePresent++; // Attending increases effective present
        needToAttend++;
      }

      // Use the more conservative result
      results.needToAttend = Math.max(needToAttend, minAttendMath, 0);
      results.message = `Attend ${results.needToAttend} consecutive classes to reach 75%`;
    }

    // Additional safety checks
    results.canBunk = Math.max(0, results.canBunk || 0);
    results.needToAttend = Math.max(0, results.needToAttend || 0);

    return results;
  }

  getStatus(percentage) {
    const warningThreshold = this.MIN_ATTENDANCE + 5;
    if (percentage >= warningThreshold) return 'safe';
    if (percentage >= this.MIN_ATTENDANCE) return 'warning';
    return 'danger';
  }

  getBunkContent(subject) {
    if (subject.calculations.canBunk > 0) {
      return `
        <div class="bunk-section">
          <div class="bunk-text-top">Go Bunk</div>
          <div class="bunk-number">${subject.calculations.canBunk}</div>
          <div class="bunk-text-bottom">classes</div>
        </div>
      `;
    } else if (subject.status === 'danger') {
      return `
        <div class="bunk-section">
          <div class="bunk-text-top">Attend</div>
          <div class="bunk-number">${subject.calculations.needToAttend}</div>
          <div class="bunk-text-bottom">classes</div>
        </div>
      `;
    } else {
      return `
        <div class="bunk-section">
          <div class="bunk-text-top">Can Bunk</div>
          <div class="bunk-number">0</div>
          <div class="bunk-text-bottom">classes</div>
        </div>
      `;
    }
  }

  createFloatingWidget() {
    // Remove existing widget if any
    if (this.widget) {
      this.widget.remove();
    }

    this.widget = document.createElement('div');
    this.widget.id = 'amrita-attendance-widget';
    this.widget.className = 'amrita-widget hidden';

    this.widget.innerHTML = `
      <div class="widget-header">
        <div class="widget-title">
          <span class="widget-icon">AttendEase</span>
          <span class="divider">|</span>
          <svg class="github-icon" width="16" height="16" xmlns="http://www.w3.org/2000/svg" onclick="window.open('https://github.com/midhunann/AttendEase', '_blank')">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M8 0C3.58 0 0 3.65 0 8.163c0 3.608 2.289 6.673 5.471 7.753.4.08.544-.176.544-.391 0-.19-.013-.84-.013-1.516-2.228.485-2.689-.976-2.689-.976-.357-.947-.89-1.198-.89-1.198-.726-.498.053-.498.053-.498.813.054 1.24.84 1.24.84.714 1.243 1.87.896 2.333.678.067-.528.28-.896.507-1.098-1.777-.189-3.646-.896-3.646-4.036 0-.896.318-1.626.826-2.195-.08-.203-.357-1.043.08-2.171 0 0 .677-.217 2.2.84.64-.176 1.327-.271 2.007-.271.677 0 1.366.095 2.007.271 1.523-1.057 2.2-.84 2.2-.84.437 1.128.16 1.968.08 2.171.508.569.826 1.299.826 2.195 0 3.14-1.869 3.833-3.656 4.036.294.257.544.744.544 1.516 0 1.098-.013 1.977-.013 2.248 0 .216.143.474.544.393C13.71 14.836 16 11.771 16 8.163 16 3.65 12.42 0 8 0z" fill="#fff"/>
          </svg>
        </div>
        <div class="widget-controls">
          <div class="min-attendance-container" title="Minimum Attendance Target">
            <select id="widget-min-attendance" class="min-attendance-select">
              <option value="75" style="color: #333;">75%</option>
              <option value="80" style="color: #333;">80%</option>
              <option value="85" style="color: #333;">85%</option>
              <option value="90" style="color: #333;">90%</option>
              <option value="95" style="color: #333;">95%</option>
            </select>
          </div>
          <div class="ml-toggle-container" title="Include Medical Leave">
            <input type="checkbox" id="ml-toggle" class="ml-toggle" ${this.includeMedical ? 'checked' : ''}>
            <label for="ml-toggle" class="ml-toggle-label">
              <span class="ml-text">ML</span>
            </label>
          </div>
          <div class="sim-toggle-container" title="Toggle Simulator Mode">
            <input type="checkbox" id="sim-toggle" class="sim-toggle" ${this.isSimulationMode ? 'checked' : ''}>
            <label for="sim-toggle" class="sim-toggle-label">
              <span class="sim-text">SIM</span>
            </label>
          </div>
          <button id="refresh-btn" class="control-btn" title="Refresh Data">↻</button>
          <button id="minimize-btn" class="control-btn" title="Minimize">−</button>
          <button id="close-btn" class="control-btn" title="Close">×</button>
        </div>
      </div>
      
      <div class="widget-content">
        <div class="subjects-list">
          ${this.generateSubjectCards()}
        </div>
      </div>
    `;

    document.body.appendChild(this.widget);
    this.attachEventListeners();

    // Show widget after a brief delay
    setTimeout(() => {
      this.showWidget();
    }, 1000);
  }

  attachEventListeners() {
    const refreshBtn = this.widget.querySelector('#refresh-btn');
    const minimizeBtn = this.widget.querySelector('#minimize-btn');
    const closeBtn = this.widget.querySelector('#close-btn');
    const mlToggle = this.widget.querySelector('#ml-toggle');
    const minAttendanceSelect = this.widget.querySelector('#widget-min-attendance');

    // Ensure the toggle state is properly synchronized
    this.syncMLToggleState();

    if (minAttendanceSelect) {
      minAttendanceSelect.value = this.MIN_ATTENDANCE;
      minAttendanceSelect.addEventListener('change', async (e) => {
        const newMinAttendance = parseInt(e.target.value);
        this.MIN_ATTENDANCE = newMinAttendance;

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.set({ minAttendance: newMinAttendance });
        }

        this.updateWithTransition();
      });
    }

    mlToggle.addEventListener('change', async () => {
      this.includeMedical = mlToggle.checked;
      await this.saveMLToggleState();
      this.updateWithTransition();
    });

    const simToggle = this.widget.querySelector('#sim-toggle');
    if (simToggle) {
      simToggle.addEventListener('change', () => {
        this.isSimulationMode = simToggle.checked;
        this.simulationChanges = {}; // Reset changes on toggle
        this.updateWithTransition();
      });
    }

    // Delegated listener for simulator buttons
    this.widget.addEventListener('click', (e) => {
      if (e.target.classList.contains('sim-btn')) {
        const btn = e.target;
        const id = parseInt(btn.dataset.id);
        const type = btn.dataset.type; // 'attended' or 'missed'
        const isPlus = btn.classList.contains('plus');

        if (!this.simulationChanges[id]) {
          this.simulationChanges[id] = { attended: 0, missed: 0 };
        }

        if (isPlus) {
          this.simulationChanges[id][type]++;
        } else {
          this.simulationChanges[id][type]--;
        }

        this.updateWidgetContent();
      }
    });

    refreshBtn.addEventListener('click', () => {
      this.updateWithTransition();
    });

    minimizeBtn.addEventListener('click', () => {
      this.widget.classList.toggle('minimized');
    });

    closeBtn.addEventListener('click', () => {
      this.hideWidget();
    });

    this.makeDraggable();
  }

  makeDraggable() {
    const header = this.widget.querySelector('.widget-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    // Add visual feedback for draggable area
    header.style.cursor = 'move';

    header.addEventListener('mousedown', (e) => {
      // Don't start dragging if clicking on control buttons or GitHub icon
      if (e.target.classList.contains('control-btn') ||
        e.target.classList.contains('github-icon') ||
        e.target.closest('.github-icon')) return;

      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === header || header.contains(e.target)) {
        isDragging = true;
        header.style.cursor = 'grabbing';
        this.widget.style.zIndex = '1000000'; // Bring to front while dragging

        // Add dragging class for visual feedback
        this.widget.classList.add('dragging');
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        // Keep widget within viewport bounds
        const rect = this.widget.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;

        currentX = Math.max(0, Math.min(currentX, maxX));
        currentY = Math.max(0, Math.min(currentY, maxY));

        xOffset = currentX;
        yOffset = currentY;

        this.widget.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
        header.style.cursor = 'move';
        this.widget.style.zIndex = '999999'; // Reset z-index

        // Remove dragging class
        this.widget.classList.remove('dragging');

        // Save position to localStorage for persistence
        this.saveWidgetPosition(currentX, currentY);
      }
    });

    // Load saved position
    this.loadWidgetPosition();
  }

  saveWidgetPosition(x, y) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('attendease-widget-position', JSON.stringify({ x, y }));
    }
  }

  loadWidgetPosition() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('attendease-widget-position');
      if (saved) {
        try {
          const { x, y } = JSON.parse(saved);
          this.widget.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        } catch (e) {
          // If parsing fails, use default position
          console.warn('Failed to parse saved widget position');
        }
      }
    }
  }

  showWidget() {
    this.widget.classList.remove('hidden');
    this.isWidgetVisible = true;
  }

  hideWidget() {
    this.widget.classList.add('hidden');
    this.isWidgetVisible = false;
  }

  toggleWidget() {
    if (this.isWidgetVisible) {
      this.hideWidget();
    } else {
      this.showWidget();
    }
  }

  calculateProjectedStatus(subject, changes) {
    const newPresent = subject.present + changes.attended;
    const newAbsent = subject.absent + changes.missed;
    const newTotal = subject.total + changes.attended + changes.missed;

    // Recalculate percentage
    const effectivePresent = newPresent + subject.dutyLeave + (this.includeMedical ? subject.medical : 0);
    const newPercentage = (effectivePresent / newTotal) * 100;

    return {
      ...subject,
      present: newPresent,
      absent: newAbsent,
      total: newTotal,
      percentage: newPercentage,
      status: this.getStatus(newPercentage),
      calculations: this.calculateScenarios(newTotal, newPresent, subject.dutyLeave, subject.medical, newPercentage)
    };
  }

  generateSubjectCards() {
    return this.tableData.map(subject => {
      let displaySubject = subject;
      let simControls = '';

      if (this.isSimulationMode) {
        const changes = this.simulationChanges[subject.id] || { attended: 0, missed: 0 };
        displaySubject = this.calculateProjectedStatus(subject, changes);

        simControls = `
          <div class="sim-controls">
            <div class="sim-control-group">
              <span class="sim-label">Attend</span>
              <button class="sim-btn minus" data-id="${subject.id}" data-type="attended">−</button>
              <span class="sim-count">${changes.attended}</span>
              <button class="sim-btn plus" data-id="${subject.id}" data-type="attended">+</button>
            </div>
            <div class="sim-control-group">
              <span class="sim-label">Miss</span>
              <button class="sim-btn minus" data-id="${subject.id}" data-type="missed">−</button>
              <span class="sim-count">${changes.missed}</span>
              <button class="sim-btn plus" data-id="${subject.id}" data-type="missed">+</button>
            </div>
          </div>
        `;
      }

      const bunkContent = this.getBunkContent(displaySubject);
      const attendance = displaySubject.dutyLeave > 0 ?
        `${displaySubject.present}+${displaySubject.dutyLeave}${this.includeMedical && displaySubject.medical > 0 ? '+' + displaySubject.medical : ''}/${displaySubject.total}` :
        `${displaySubject.present}${this.includeMedical && displaySubject.medical > 0 ? '+' + displaySubject.medical : ''}/${displaySubject.total}`;

      return `
        <div class="subject-card status-${displaySubject.status} ${this.isSimulationMode ? 'simulation-mode' : ''}">
          <div class="subject-card-content">
            <div class="subject-left">
              <div class="course-code">
                <span class="percentage-badge ${displaySubject.status}">${displaySubject.percentage.toFixed(1)}%</span>
                <span class="code-text">${displaySubject.courseCode}</span>
              </div>
              <div class="course-name">${displaySubject.courseName}</div>
              <div class="attendance-fraction">${attendance}</div>
              <div class="absent-count">${displaySubject.absent} absent</div>
              ${simControls}
            </div>
            <div class="subject-right">
              ${bunkContent}
            </div>
          </div>
          <div class="progress-bottom-border">
            <div class="progress-fill ${displaySubject.status}" style="width: ${Math.min(displaySubject.percentage, 100)}%"></div>
            <div class="progress-target" style="left: ${this.MIN_ATTENDANCE}%">
              <span style="position: absolute; top: -16px; left: -12px; font-size: 8px; color: #666; font-weight: 600; background: rgba(255,255,255,0.9); padding: 1px 3px; border-radius: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); white-space: nowrap;">${this.MIN_ATTENDANCE}%</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  updateWidgetContent() {
    const subjectsList = this.widget.querySelector('.subjects-list');
    if (!subjectsList) return;

    subjectsList.innerHTML = this.generateSubjectCards();
  }

  updateWithTransition() {
    const subjectsList = this.widget.querySelector('.subjects-list');
    if (!subjectsList) return;

    subjectsList.style.transition = 'opacity 0.3s ease';
    subjectsList.style.opacity = '0';

    setTimeout(() => {
      this.scrapeAttendanceData();
      this.updateWidgetContent();
      subjectsList.style.opacity = '1';
      this.saveDataToStorage();
    }, 300);
  }

  syncMLToggleState() {
    const mlToggle = this.widget.querySelector('#ml-toggle');
    if (mlToggle) {
      mlToggle.checked = this.includeMedical;
      // console.log('[AttendEase] Synchronized ML toggle state:', this.includeMedical);
    }
  }

  saveDataToStorage() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        attendanceData: this.tableData,
        includeMedical: this.includeMedical,
        minAttendance: this.MIN_ATTENDANCE,
        lastUpdated: new Date().toISOString()
      });
    }
  }
}

// Initialize the tracker when page loads
let attendanceTracker;

function initializeTracker() {
  attendanceTracker = new AmritaAttendanceTracker();
  window.attendanceTracker = attendanceTracker;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTracker);
} else {
  initializeTracker();
}

// Listen for messages from popup
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log('[AttendEase] Received message:', request);

    if (request.action === 'getAttendanceData') {
      try {
        const tracker = window.attendanceTracker;
        const data = tracker ? tracker.tableData : [];
        // console.log('[AttendEase] Sending data to popup:', data.length, 'subjects');
        sendResponse({ data });
      } catch (error) {
        console.error('[AttendEase] Error getting attendance data:', error);
        sendResponse({ data: [] });
      }
    } else if (request.action === 'toggleWidget') {
      try {
        const tracker = window.attendanceTracker;
        if (tracker) {
          // console.log('[AttendEase] Toggling widget');
          tracker.toggleWidget();
        }
        sendResponse({ success: true });
      } catch (error) {
        console.error('[AttendEase] Error toggling widget:', error);
        sendResponse({ success: false });
      }
    }
    return true; // Keep the message channel open for async response
  });
}
