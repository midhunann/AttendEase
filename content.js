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
    
    this.init();
  }

  init() {
    console.log('[AttendEase] Content script initializing...');
    console.log('[AttendEase] Current URL:', window.location.href);
    
    // Start with immediate check
    this.startTableDetection();
    
    // Also set up a MutationObserver to watch for dynamic content loading
    this.setupMutationObserver();
  }

  startTableDetection() {
    // Wait for table to load
    this.waitForTable().then(() => {
      console.log('[AttendEase] Table found, scraping data...');
      this.scrapeAttendanceData();
      console.log('[AttendEase] Data scraped:', this.tableData.length, 'subjects');
      this.createFloatingWidget();
      this.saveDataToStorage();
    }).catch(error => {
      console.error('[AttendEase] Error during initialization:', error);
      // Fallback: try again after a longer delay
      setTimeout(() => {
        console.log('[AttendEase] Retrying after delay...');
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
        console.log('[AttendEase] DOM changes detected, checking for attendance data...');
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
        console.log('[AttendEase] New data detected, processing...');
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
        console.log(`[AttendEase] Looking for table, attempt ${attempts}/${maxAttempts}`);
        
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
        
        console.log('[AttendEase] Table element found:', !!table);
        
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
          
          console.log('[AttendEase] Total rows found:', rows.length);
          console.log('[AttendEase] Data rows with sufficient columns:', dataRows.length);
          
          if (dataRows.length > 0) {
            console.log('[AttendEase] Table ready with data!');
            // Store the table reference for later use
            this.attendanceTable = table;
            resolve();
            return;
          }
        }
        
        if (attempts >= maxAttempts) {
          console.error('[AttendEase] Table not found after maximum attempts');
          console.log('[AttendEase] Available tables on page:');
          const allTables = document.querySelectorAll('table');
          allTables.forEach((t, i) => {
            console.log(`Table ${i + 1}:`, t.id || t.className || 'no id/class', 'rows:', t.querySelectorAll('tr').length);
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

    console.log('[AttendEase] Using table:', table.id || table.className || 'unnamed table');

    // Get all rows - Amrita table structure has all rows directly under table
    const allRows = table.querySelectorAll('tr');
    
    // Skip the first row (header row) and process data rows
    const rows = Array.from(allRows).slice(1);

    console.log('[AttendEase] Found', rows.length, 'data rows to process');
    
    this.tableData = [];

    rows.forEach((row, index) => {
      // Amrita uses th elements for all cells, not td
      const cells = row.querySelectorAll('th');
      console.log(`[AttendEase] Row ${index + 1}: ${cells.length} cells`);
      
      if (cells.length < 9) {
        console.warn(`[AttendEase] Row ${index + 1} has insufficient cells (${cells.length}), skipping`);
        return;
      }

      // Log the cell contents to understand the structure
      console.log(`[AttendEase] Row ${index + 1} cells:`, Array.from(cells).map((cell, i) => `${i}: "${cell.textContent.trim()}"`));

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
        console.log(`[AttendEase] Skipping row ${index + 1}: ${courseCode} (zero total classes)`);
        return;
      }

      // Calculate effective attendance using (present + dutyLeave) / total * 100
      const effectiveAttendance = ((present + dutyLeave) / total) * 100;
      
      // Debug: Log the difference between website percentage and calculated percentage
      console.log(`[AttendEase] ${courseCode}: Website=${percentage}%, Calculated=${effectiveAttendance.toFixed(1)}%, Present=${present}, DutyLeave=${dutyLeave}, Total=${total}`);
      
      const subjectData = {
        id: index,
        serialNumber: slNo,
        courseCode: courseCode.substring(0, 20), // Limit length
        courseName: courseName.substring(0, 50),
        className,
        faculty,
        total,
        present,
        dutyLeave,
        absent,
        medical,
        percentage: effectiveAttendance, // Use calculated effective attendance
        status: this.getStatus(effectiveAttendance),
        calculations: this.calculateScenarios(total, present, dutyLeave, effectiveAttendance)
      };

      console.log(`[AttendEase] Processed subject:`, subjectData);
      this.tableData.push(subjectData);
    });
    
    console.log('[AttendEase] Final scraped data:', this.tableData);
  }

  calculateScenarios(total, present, dutyLeave, currentPercentage) {
    const results = {};
    const effectivePresent = present + dutyLeave; // Include duty leave in attendance

    // Safety check for edge cases
    if (total <= 0) {
      results.canBunk = 0;
      results.needToAttend = 0;
      results.message = 'No classes recorded';
      return results;
    }

    // Validate input data consistency
    if (effectivePresent > total) {
      console.warn(`[AttendEase] Data inconsistency: effectivePresent (${effectivePresent}) > total (${total})`);
      results.canBunk = 0;
      results.needToAttend = 0;
      results.message = 'Data inconsistency detected';
      return results;
    }

    // Recalculate percentage to ensure accuracy
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
    if (percentage >= 80) return 'safe';
    if (percentage >= 75) return 'warning';
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
        </div>
        <div class="widget-controls">
          <button id="refresh-btn" class="control-btn" title="Refresh Data">↻</button>
          <button id="minimize-btn" class="control-btn" title="Minimize">−</button>
          <button id="close-btn" class="control-btn" title="Close">×</button>
        </div>
      </div>
      
      <div class="widget-content">
        <div class="subjects-list">
          ${this.tableData.map(subject => {
            const bunkContent = this.getBunkContent(subject);
            
            return `
              <div class="subject-card status-${subject.status}">
                <div class="subject-card-content">
                  <div class="subject-left">
                    <div class="course-code">${subject.serialNumber} | ${subject.courseCode}</div>
                    <div class="course-name">${subject.courseName}</div>
                    <div class="attendance-fraction">${subject.dutyLeave > 0 ? `${subject.present}+${subject.dutyLeave}` : subject.present}/${subject.total}</div>
                    <div class="absent-count">${subject.absent} absent</div>
                  </div>
                  <div class="subject-right">
                    ${bunkContent}
                  </div>
                </div>
                <div class="progress-bottom-border">
                  <div class="progress-fill ${subject.status}" style="width: ${Math.min(subject.percentage, 100)}%"></div>
                  <div class="progress-target"></div>
                  <div class="attendance-percentage-text ${subject.status}">${subject.percentage.toFixed(1)}%</div>
                </div>
              </div>
            `;
          }).join('')}
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

    refreshBtn.addEventListener('click', () => {
      this.scrapeAttendanceData();
      this.createFloatingWidget();
      this.saveDataToStorage();
    });

    minimizeBtn.addEventListener('click', () => {
      this.widget.classList.toggle('minimized');
    });

    closeBtn.addEventListener('click', () => {
      this.hideWidget();
    });

    // Make widget draggable
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
      // Don't start dragging if clicking on control buttons
      if (e.target.classList.contains('control-btn')) return;
      
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

  saveDataToStorage() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        attendanceData: this.tableData,
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
    console.log('[AttendEase] Received message:', request);
    
    if (request.action === 'getAttendanceData') {
      const tracker = window.attendanceTracker;
      const data = tracker ? tracker.tableData : [];
      console.log('[AttendEase] Sending data to popup:', data.length, 'subjects');
      sendResponse({ data });
    } else if (request.action === 'toggleWidget') {
      const tracker = window.attendanceTracker;
      if (tracker) {
        console.log('[AttendEase] Toggling widget');
        tracker.toggleWidget();
      }
    }
    return true;
  });
}
