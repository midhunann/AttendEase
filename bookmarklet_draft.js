(function () {
    // 1. Minified CSS (Simplified)
    const css = `.amrita-widget{position:fixed!important;top:20px!important;right:20px!important;width:420px!important;max-height:80vh!important;background:#fff!important;border-radius:16px!important;box-shadow:0 15px 40px rgba(0,0,0,.25)!important;z-index:999999!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif!important;font-size:14px!important;line-height:1.4!important;border:1px solid #e1e5e9!important;overflow:hidden!important;transition:opacity .3s ease!important;transform:translate3d(0,0,0);backdrop-filter:blur(10px)!important}.amrita-widget.hidden{opacity:0!important;pointer-events:none!important}.amrita-widget.minimized{height:50px!important;overflow:hidden!important}.amrita-widget.minimized .widget-content{display:none!important}.widget-header{background:linear-gradient(135deg,#bf0d4f 0%,#bf0d4f 100%)!important;color:#fff!important;padding:12px 16px!important;display:flex!important;justify-content:space-between!important;align-items:center!important;cursor:move!important;user-select:none!important}.widget-title{display:flex!important;align-items:center!important;font-weight:600!important;font-size:16px!important;gap:8px!important}.widget-controls{display:flex!important;gap:8px!important;align-items:center!important;height:28px!important}.min-attendance-select{height:28px!important;padding:0 8px!important;border:1px solid rgba(255,255,255,.1)!important;border-radius:14px!important;font-size:11px!important;font-weight:600!important;cursor:pointer!important;background-color:rgba(255,255,255,.2)!important;color:#fff!important;outline:none!important;appearance:none!important}.ml-toggle-container{display:flex!important;align-items:center!important;position:relative!important;height:28px!important}.ml-toggle{display:none!important}.ml-toggle-label{width:56px!important;height:28px!important;background:rgba(255,255,255,.2)!important;border-radius:14px!important;cursor:pointer!important;position:relative!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;border:1px solid rgba(255,255,255,.1)!important}.ml-toggle-label::before{content:''!important;position:absolute!important;width:24px!important;height:24px!important;border-radius:50%!important;background:#fff!important;top:1px!important;left:1px!important;transition:all .3s ease!important}.ml-toggle:checked+.ml-toggle-label::before{transform:translateX(28px)!important}.ml-text{font-size:11px!important;font-weight:700!important;position:absolute;right:8px;color:#fff}.control-btn{background:rgba(255,255,255,.2)!important;border:none!important;color:#fff!important;width:28px!important;height:28px!important;border-radius:50%!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:14px!important}.widget-content{padding:16px!important;max-height:calc(80vh - 50px)!important;overflow-y:auto!important}.subjects-list{display:flex!important;flex-direction:column!important;gap:12px!important}.subject-card{border-radius:12px!important;padding:8px 8px 0!important;border-left:4px solid #ddd!important;background:#fafafa!important;margin-bottom:8px!important;position:relative!important;overflow:hidden!important}.subject-card.status-safe{border-left-color:#28a745!important;background:linear-gradient(135deg,#f8fff9 0%,#e8f5e8 100%)!important}.subject-card.status-warning{border-left-color:#ffc107!important;background:linear-gradient(135deg,#fffef8 0%,#fff8e1 100%)!important}.subject-card.status-danger{border-left-color:#dc3545!important;background:linear-gradient(135deg,#fff8f8 0%,#ffebee 100%)!important}.subject-card-content{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:8px!important}.subject-left{flex:1!important;display:flex!important;flex-direction:column!important;gap:2px!important}.course-code{font-weight:700!important;font-size:13px!important;color:#333!important}.course-name{font-size:10px!important;color:#666!important}.attendance-fraction{font-weight:600!important;font-size:11px!important;color:#555!important}.progress-bottom-border{position:relative!important;height:6px!important;background:rgba(0,0,0,.1)!important;margin-top:4px!important;overflow:hidden!important}.progress-fill{height:100%!important;position:absolute!important;left:0!important;top:0!important}.progress-fill.safe{background:#28a745!important}.progress-fill.warning{background:#ffc107!important}.progress-fill.danger{background:#dc3545!important}.attendance-percentage-text{position:absolute!important;right:8px!important;top:50%!important;transform:translateY(-50%)!important;font-weight:900!important;font-size:8px!important;color:#333!important;z-index:4!important}.bunk-section{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;min-width:70px!important;background:rgba(255,255,255,.8)!important;border-radius:6px!important;padding:4px!important}.bunk-text-top,.bunk-text-bottom{font-size:7px!important;font-weight:600!important;color:#666;text-transform:uppercase}.bunk-number{font-size:18px!important;font-weight:700!important;color:#333}`;

    // Inject CSS
    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    // 2. Logic (AmritaAttendanceTracker)
    class AmritaAttendanceTracker {
        constructor() {
            this.MIN_ATTENDANCE = 75;
            this.tableData = [];
            this.widget = null;
            this.includeMedical = false;
            this.widgetPosition = { x: window.innerWidth - 440, y: 85 };
            this.init();
        }

        init() {
            this.loadPreferences();
            this.startTableDetection();
        }

        loadPreferences() {
            const prefs = JSON.parse(localStorage.getItem('attendease_prefs') || '{}');
            this.includeMedical = prefs.includeMedical || false;
            this.MIN_ATTENDANCE = prefs.minAttendance || 75;
            if (prefs.widgetPosition) this.widgetPosition = prefs.widgetPosition;
        }

        savePreferences() {
            localStorage.setItem('attendease_prefs', JSON.stringify({
                includeMedical: this.includeMedical,
                minAttendance: this.MIN_ATTENDANCE,
                widgetPosition: this.widgetPosition
            }));
        }

        startTableDetection() {
            this.waitForTable().then(() => {
                this.scrapeAttendanceData();
                this.createFloatingWidget();
            }).catch(() => {
                setTimeout(() => this.startTableDetection(), 3000);
            });
        }

        waitForTable() {
            return new Promise((resolve, reject) => {
                let attempts = 0;
                const check = () => {
                    attempts++;
                    const table = document.getElementById('home_tab') || document.querySelector('table[class*="attendance"]');
                    if (table && table.querySelectorAll('tr').length > 1) {
                        this.attendanceTable = table;
                        resolve();
                    } else if (attempts < 20) {
                        setTimeout(check, 500);
                    } else reject();
                };
                check();
            });
        }

        scrapeAttendanceData() {
            const table = this.attendanceTable;
            const rows = Array.from(table.querySelectorAll('tr')).slice(1);
            this.tableData = [];
            rows.forEach((row, index) => {
                const cells = row.querySelectorAll('th');
                if (cells.length < 9) return;

                const total = parseInt(cells[4].textContent) || 0;
                if (total === 0) return;

                const present = parseInt(cells[5].textContent) || 0;
                const dutyLeave = parseInt(cells[6].textContent) || 0;
                const absent = parseInt(cells[7].textContent) || 0;
                const medical = parseInt(cells[9].textContent) || 0;
                const courseInfo = cells[2].innerHTML.split('<br>');
                const courseCode = courseInfo[0].trim();
                const courseName = courseInfo[1] ? courseInfo[1].trim() : '';

                const effectivePresent = present + dutyLeave + (this.includeMedical ? medical : 0);
                const perc = (effectivePresent / total) * 100;

                this.tableData.push({
                    id: index,
                    serialNumber: cells[0].textContent.trim(),
                    courseCode,
                    courseName,
                    total,
                    present,
                    dutyLeave,
                    absent,
                    medical,
                    percentage: perc,
                    status: this.getStatus(perc),
                    calculations: this.calculateScenarios(total, effectivePresent)
                });
            });
        }

        calculateScenarios(total, effectivePresent) {
            let canBunk = 0, needToAttend = 0;
            if ((effectivePresent / total) * 100 >= this.MIN_ATTENDANCE) {
                let t = total;
                while ((effectivePresent / ++t) * 100 >= this.MIN_ATTENDANCE && canBunk < 100) canBunk++;
            } else {
                let t = total, p = effectivePresent;
                while ((p / t) * 100 < this.MIN_ATTENDANCE && needToAttend < 100) { t++; p++; needToAttend++; }
            }
            return { canBunk, needToAttend };
        }

        getStatus(p) { return p >= this.MIN_ATTENDANCE + 5 ? 'safe' : (p >= this.MIN_ATTENDANCE ? 'warning' : 'danger'); }

        createFloatingWidget() {
            if (this.widget) this.widget.remove();
            this.widget = document.createElement('div');
            this.widget.id = 'amrita-attendance-widget';
            this.widget.className = 'amrita-widget';
            this.widget.innerHTML = `
                <div class="widget-header">
                    <div class="widget-title">AttendEase</div>
                    <div class="widget-controls">
                        <select id="w-min-att" class="min-attendance-select">
                            ${[75, 80, 85, 90].map(v => `<option value="${v}" ${this.MIN_ATTENDANCE == v ? 'selected' : ''}>${v}%</option>`).join('')}
                        </select>
                        <div class="ml-toggle-container">
                            <input type="checkbox" id="ml-tog" class="ml-toggle" ${this.includeMedical ? 'checked' : ''}>
                            <label for="ml-tog" class="ml-toggle-label"><span class="ml-text">ML</span></label>
                        </div>
                        <button id="min-btn" class="control-btn">−</button>
                        <button id="cls-btn" class="control-btn">×</button>
                    </div>
                </div>
                <div class="widget-content"><div class="subjects-list">${this.generateCards()}</div></div>
            `;
            document.body.appendChild(this.widget);
            this.widget.style.transform = `translate3d(${this.widgetPosition.x}px, ${this.widgetPosition.y}px, 0)`;
            this.attachEvents();
        }

        generateCards() {
            return this.tableData.map(s => `
                <div class="subject-card status-${s.status}">
                    <div class="subject-card-content">
                        <div class="subject-left">
                            <div class="course-code">${s.serialNumber} | ${s.courseCode}</div>
                            <div class="course-name">${s.courseName}</div>
                            <div class="attendance-fraction">${s.present}${s.dutyLeave > 0 ? '+' + s.dutyLeave : ''}${this.includeMedical && s.medical > 0 ? '+' + s.medical : ''}/${s.total}</div>
                        </div>
                        <div class="bunk-section">
                            <div class="bunk-text-top">${s.calculations.canBunk > 0 ? 'Bunk' : 'Attend'}</div>
                            <div class="bunk-number">${s.calculations.canBunk || s.calculations.needToAttend}</div>
                            <div class="bunk-text-bottom">classes</div>
                        </div>
                    </div>
                    <div class="progress-bottom-border">
                        <div class="progress-fill ${s.status}" style="width: ${Math.min(s.percentage, 100)}%"></div>
                        <div class="attendance-percentage-text">${s.percentage.toFixed(1)}%</div>
                    </div>
                </div>
            `).join('');
        }

        attachEvents() {
            this.widget.querySelector('#w-min-att').onchange = (e) => { this.MIN_ATTENDANCE = parseInt(e.target.value); this.refresh(); };
            this.widget.querySelector('#ml-tog').onchange = (e) => { this.includeMedical = e.target.checked; this.refresh(); };
            this.widget.querySelector('#min-btn').onclick = () => this.widget.classList.toggle('minimized');
            this.widget.querySelector('#cls-btn').onclick = () => this.widget.remove();
            this.makeDraggable();
        }

        refresh() { this.savePreferences(); this.scrapeAttendanceData(); this.widget.querySelector('.subjects-list').innerHTML = this.generateCards(); }

        makeDraggable() {
            const h = this.widget.querySelector('.widget-header');
            let dragging = false, ox, oy;
            h.onmousedown = (e) => {
                if (e.target.tagName == 'SELECT' || e.target.tagName == 'INPUT' || e.target.tagName == 'BUTTON') return;
                dragging = true;
                ox = e.clientX - this.widgetPosition.x;
                oy = e.clientY - this.widgetPosition.y;
            };
            document.onmousemove = (e) => {
                if (!dragging) return;
                this.widgetPosition.x = e.clientX - ox;
                this.widgetPosition.y = e.clientY - oy;
                this.widget.style.transform = `translate3d(${this.widgetPosition.x}px, ${this.widgetPosition.y}px, 0)`;
            };
            document.onmouseup = () => { if (dragging) { dragging = false; this.savePreferences(); } };
        }
    }

    if (window.location.host.includes('students.amrita.edu')) {
        new AmritaAttendanceTracker();
    } else {
        alert('Please run this on the Amrita Attendance page.');
    }
})();
