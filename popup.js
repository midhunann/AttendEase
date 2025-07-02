/**
 * Amrita AttendEase - Popup Script
 * Handles the extension popup interface
 */

class PopupManager {
  constructor() {
    this.attendanceData = [];
    this.init();
  }

  async init() {
    try {
      // Load data from storage first
      await this.loadStoredData();
      
      // Try to get fresh data from content script
      await this.requestDataFromContentScript();
      
      this.setupEventListeners();
    } catch (error) {
      console.error('Popup initialization error:', error);
      this.showError();
    }
  }

  async loadStoredData() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['attendanceData', 'lastUpdated'], (result) => {
          if (result.attendanceData && result.attendanceData.length > 0) {
            this.attendanceData = result.attendanceData;
            this.renderData();
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async requestDataFromContentScript() {
    try {
      console.log('[AttendEase Popup] Requesting data from content script...');
      
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        throw new Error('Chrome APIs not available');
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('[AttendEase Popup] Current tab:', tab?.url);
      
      if (!tab || !tab.url || !tab.url.includes('students.amrita.edu/client/class-attendance')) {
        throw new Error('Not on attendance page');
      }

      console.log('[AttendEase Popup] Sending message to content script...');
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getAttendanceData' });
      console.log('[AttendEase Popup] Response received:', response);
      
      if (response && response.data && response.data.length > 0) {
        console.log('[AttendEase Popup] Data received:', response.data.length, 'subjects');
        this.attendanceData = response.data;
        this.renderData();
      } else if (this.attendanceData.length === 0) {
        console.log('[AttendEase Popup] No data in response');
        throw new Error('No data available');
      }
    } catch (error) {
      console.error('[AttendEase Popup] Error:', error);
      if (this.attendanceData.length === 0) {
        this.showError();
      }
    }
  }

  renderData() {
    if (this.attendanceData.length === 0) {
      this.showError();
      return;
    }

    this.hideLoading();
    this.showContent();
    this.renderOverallStats();
    this.renderSubjects();
  }

  renderOverallStats() {
    const stats = this.calculateOverallStats();
    
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const safeCount = document.getElementById('safe-count');
    const totalSubjects = document.getElementById('total-subjects');

    // Update status
    statusIndicator.textContent = this.getStatusIcon(stats.status);
    statusText.textContent = stats.statusText;
    statusText.className = `status-text status-${stats.status}`;

    // Update counts
    safeCount.textContent = stats.safeCount;
    totalSubjects.textContent = this.attendanceData.length;
  }

  renderSubjects() {
    const subjectList = document.getElementById('subject-list');
    
    if (this.attendanceData.length === 0) {
      subjectList.innerHTML = '<div class="no-data">No subjects found</div>';
      return;
    }

    subjectList.innerHTML = this.attendanceData.map(subject => `
      <div class="subject-item ${subject.status}">
        <div class="subject-header">
          <div class="subject-info">
            <div class="subject-code">${subject.courseCode}</div>
            <div class="subject-name">${subject.courseName}</div>
          </div>
          <div class="subject-percentage status-${subject.status}">
            ${subject.percentage.toFixed(1)}%
          </div>
        </div>
        <div class="subject-message">
          ${this.getStatusIcon(subject.status)} ${subject.calculations.message}
        </div>
      </div>
    `).join('');
  }

  calculateOverallStats() {
    const safeCount = this.attendanceData.filter(s => s.status === 'safe').length;
    const warningCount = this.attendanceData.filter(s => s.status === 'warning').length;
    const dangerCount = this.attendanceData.filter(s => s.status === 'danger').length;

    let status, statusText;
    if (dangerCount > 0) {
      status = 'danger';
      statusText = `${dangerCount} subjects need attention!`;
    } else if (warningCount > 0) {
      status = 'warning';
      statusText = `${warningCount} subjects need care`;
    } else {
      status = 'safe';
      statusText = 'All subjects are safe!';
    }

    return { safeCount, warningCount, dangerCount, status, statusText };
  }

  getStatusIcon(status) {
    switch (status) {
      case 'safe': return '✅';
      case 'warning': return '⚠️';
      case 'danger': return '🚨';
      default: return '❓';
    }
  }

  setupEventListeners() {
    // Toggle widget button
    document.getElementById('toggle-widget').addEventListener('click', async () => {
      try {
        if (typeof chrome === 'undefined' || !chrome.tabs) {
          alert('Chrome APIs not available');
          return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url && tab.url.includes('students.amrita.edu/client/class-attendance')) {
          chrome.tabs.sendMessage(tab.id, { action: 'toggleWidget' });
          window.close();
        } else {
          alert('Please visit the attendance page first');
        }
      } catch (error) {
        alert('Error: Please visit the attendance page first');
      }
    });

    // Refresh data button
    document.getElementById('refresh-data').addEventListener('click', async () => {
      this.showLoading();
      await this.requestDataFromContentScript();
    });
  }

  showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('content').style.display = 'none';
    document.getElementById('error').style.display = 'none';
  }

  showContent() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    document.getElementById('error').style.display = 'none';
  }

  showError() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    
    // Set up the go to attendance button listener
    this.setupGoToAttendanceListener();
  }

  setupGoToAttendanceListener() {
    const goToAttendanceBtn = document.getElementById('go-to-attendance');
    if (goToAttendanceBtn && !goToAttendanceBtn.hasAttribute('data-listener-set')) {
      goToAttendanceBtn.setAttribute('data-listener-set', 'true');
      goToAttendanceBtn.addEventListener('click', async () => {
        try {
          if (typeof chrome !== 'undefined' && chrome.tabs) {
            await chrome.tabs.create({ 
              url: 'https://students.amrita.edu/client/class-attendance',
              active: true 
            });
            window.close();
          } else {
            // Fallback for when chrome APIs aren't available
            window.open('https://students.amrita.edu/client/class-attendance', '_blank');
          }
        } catch (error) {
          console.error('Error opening attendance page:', error);
          // Fallback
          window.open('https://students.amrita.edu/client/class-attendance', '_blank');
        }
      });
    }
  }

  hideLoading() {
    document.getElementById('loading').style.display = 'none';
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
