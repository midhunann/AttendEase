/**
 * Amrita AttendEase - Mobile Bookmarklet
 * A portable version of the AttendEase extension for mobile browsers.
 */
(function () {
    // 1. CSS for the compact mobile widget
    const css = `
        .amrita-widget {
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            width: 250px !important;
            max-height: 85vh !important;
            background: #ffffff !important;
            border-radius: 16px !important;
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4) !important;
            z-index: 1000000 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            border: 1px solid #e1e5e9 !important;
            overflow: hidden !important;
            transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            touch-action: none !important;
            user-select: none !important;
        }

        .amrita-widget.min {
            height: 48px !important;
        }

        .widget-header {
            background: linear-gradient(135deg, #bf0d4f 0%, #8a0636 100%) !important;
            color: white !important;
            padding: 12px 16px !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            cursor: move !important;
            font-weight: 700 !important;
            font-size: 14px !important;
        }

        .header-actions {
            display: flex !important;
            gap: 12px !important;
            font-size: 20px !important;
            line-height: 1 !important;
        }

        .header-actions span {
            cursor: pointer !important;
            padding: 0 4px !important;
        }

        .controls-row {
            background: #f8f9fa !important;
            padding: 8px 12px !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-bottom: 1px solid #eee !important;
        }

        .controls-row select {
            padding: 4px 8px !important;
            border-radius: 6px !important;
            border: 1px solid #ccc !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            background: white !important;
            outline: none !important;
        }

        .ml-toggle-label {
            display: flex !important;
            align-items: center !important;
            gap: 6px !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            color: #555 !important;
            cursor: pointer !important;
        }

        .widget-content {
            padding: 12px !important;
            overflow-y: auto !important;
            max-height: calc(85vh - 90px) !important;
            background: #ffffff !important;
            scrollbar-width: thin !important;
            -webkit-overflow-scrolling: touch !important;
        }

        .subject-card {
            border-radius: 12px !important;
            padding: 12px !important;
            margin-bottom: 12px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 8px !important;
            border-left: 5px solid #ddd !important;
            background: #f9f9f9 !important;
            box-shadow: 0 2px 6px rgba(0,0,0,0.05) !important;
        }

        .status-safe { border-left-color: #28a745 !important; background: linear-gradient(135deg, #f8fff9, #e8f5e8) !important; }
        .status-warning { border-left-color: #ffc107 !important; background: linear-gradient(135deg, #fffef8, #fff8e1) !important; }
        .status-danger { border-left-color: #dc3545 !important; background: linear-gradient(135deg, #fff8f8, #ffebee) !important; }

        .course-code { font-weight: 800 !important; font-size: 12px !important; color: #333 !important; }
        .attendance-fraction { font-weight: 600 !important; font-size: 12px !important; color: #666 !important; }

        .bunk-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: baseline !important;
            background: rgba(255, 255, 255, 0.7) !important;
            padding: 6px 10px !important;
            border-radius: 8px !important;
            margin-top: 4px !important;
        }

        .bunk-label { font-size: 9px !important; font-weight: 700 !important; color: #555 !important; text-transform: uppercase !important; }
        .bunk-number { font-size: 18px !important; font-weight: 900 !important; color: #333 !important; }
    `;

    // 2. Inject Styles
    if (!document.getElementById('attendease-mobile-styles')) {
        const style = document.createElement('style');
        style.id = 'attendease-mobile-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // 3. Application State and Logic
    class AttendEaseMobile {
        constructor() {
            this.targetPercentage = 75;
            this.includeMedical = false;
            this.widget = null;
            this.xOffset = 0;
            this.yOffset = 0;
            this.init();
        }

        init() {
            const table = document.getElementById('home_tab') || document.querySelector('table[class*="attendance"]');
            if (!table || table.querySelectorAll('tr').length <= 1) {
                alert('Attendance table not found! Please make sure you are logged in and on the Attendance page.');
                return;
            }

            this.createWidget();
            this.renderAttendance();
            this.setupDraggable();
        }

        createWidget() {
            if (document.getElementById('attendease-mobile-widget')) {
                document.getElementById('attendease-mobile-widget').remove();
            }

            this.widget = document.createElement('div');
            this.widget.id = 'attendease-mobile-widget';
            this.widget.className = 'amrita-widget';

            this.widget.innerHTML = `
                <div class="widget-header" id="ae-mobile-header">
                    <span>AttendEase</span>
                    <div class="header-actions">
                        <span id="ae-minimize-btn">−</span >
                        <span id="ae-close-btn">×</span>
                    </div>
                </div>
                <div class="controls-row">
                    <select id="ae-target-select">
                        <option value="75">Target: 75%</option>
                        <option value="80">Target: 80%</option>
                        <option value="85">Target: 85%</option>
                        <option value="90">Target: 90%</option>
                    </select>
                    <label class="ml-toggle-label">
                        <input type="checkbox" id="ae-ml-toggle" ${this.includeMedical ? 'checked' : ''}>
                        ML
                    </label>
                </div>
                <div class="widget-content" id="ae-mobile-content"></div>
            `;

            document.body.appendChild(this.widget);

            // Event Listeners for Controls
            this.widget.querySelector('#ae-target-select').onchange = (e) => {
                this.targetPercentage = parseInt(e.target.value);
                this.renderAttendance();
            };

            this.widget.querySelector('#ae-ml-toggle').onchange = (e) => {
                this.includeMedical = e.target.checked;
                this.renderAttendance();
            };

            this.widget.querySelector('#ae-minimize-btn').onclick = (e) => {
                e.stopPropagation();
                this.widget.classList.toggle('min');
            };

            this.widget.querySelector('#ae-close-btn').onclick = (e) => {
                e.stopPropagation();
                this.widget.remove();
            };

            // Minimize on header click too
            this.widget.querySelector('#ae-mobile-header').onclick = (e) => {
                if (e.target.tagName !== 'SPAN') {
                    this.widget.classList.toggle('min');
                }
            };
        }

        renderAttendance() {
            const table = document.getElementById('home_tab') || document.querySelector('table[class*="attendance"]');
            const rows = Array.from(table.querySelectorAll('tr')).slice(1);
            const content = this.widget.querySelector('#ae-mobile-content');

            let html = '';
            rows.forEach(row => {
                const cells = row.querySelectorAll('th');
                if (cells.length < 9) return;

                const total = parseInt(cells[4].textContent) || 0;
                if (total === 0) return;

                const present = parseInt(cells[5].textContent) || 0;
                const dutyLeave = parseInt(cells[6].textContent) || 0;
                const medical = this.includeMedical ? (parseInt(cells[9].textContent) || 0) : 0;

                const effectivePresent = present + dutyLeave + medical;
                const percentage = (effectivePresent / total) * 100;

                // Status Calculation
                const status = percentage >= this.targetPercentage + 5 ? 'safe' :
                    (percentage >= this.targetPercentage ? 'warning' : 'danger');

                // Bunk/Attend Calculation
                let canBunk = 0;
                let needToAttend = 0;

                if (percentage >= this.targetPercentage) {
                    let tempTotal = total;
                    while (((effectivePresent) / ++tempTotal) * 100 >= this.targetPercentage && canBunk < 100) {
                        canBunk++;
                    }
                } else {
                    let tempTotal = total;
                    let tempPresent = effectivePresent;
                    while ((tempPresent / tempTotal) * 100 < this.targetPercentage && needToAttend < 100) {
                        tempTotal++;
                        tempPresent++;
                        needToAttend++;
                    }
                }

                const courseCode = cells[2].innerText.split('\n')[0];

                html += `
                    <div class="subject-card status-${status}">
                        <div class="course-code">${courseCode}</div>
                        <div class="attendance-fraction">${effectivePresent}/${total} (${percentage.toFixed(1)}%)</div>
                        <div class="bunk-row">
                            <div class="bunk-label">${canBunk > 0 ? 'Go Bunk' : 'Attend'}</div>
                            <div class="bunk-number">${canBunk || needToAttend}</div>
                            <div class="bunk-label">classes</div>
                        </div>
                    </div>
                `;
            });

            content.innerHTML = html;
        }

        setupDraggable() {
            const header = this.widget.querySelector('#ae-mobile-header');
            let isDragging = false;
            let initialX, initialY;

            const dragStart = (e) => {
                const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
                const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

                initialX = clientX - this.xOffset;
                initialY = clientY - this.yOffset;

                if (e.target === header || header.contains(e.target)) {
                    isDragging = true;
                }
            };

            const dragEnd = () => {
                isDragging = false;
            };

            const drag = (e) => {
                if (isDragging) {
                    e.preventDefault();
                    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
                    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

                    this.xOffset = clientX - initialX;
                    this.yOffset = clientY - initialY;

                    this.widget.style.transform = `translate3d(${this.xOffset}px, ${this.yOffset}px, 0)`;
                }
            };

            header.addEventListener('touchstart', dragStart, { passive: false });
            header.addEventListener('mousedown', dragStart);

            document.addEventListener('touchend', dragEnd);
            document.addEventListener('mouseup', dragEnd);

            document.addEventListener('touchmove', drag, { passive: false });
            document.addEventListener('mousemove', drag);
        }
    }

    // Execute
    new AttendEaseMobile();
})();
