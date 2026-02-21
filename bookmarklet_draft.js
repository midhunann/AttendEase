(function () {
    const css = `
        .amrita-widget {
            position: fixed !important;
            top: 10px !important;
            right: 10px !important;
            width: 220px !important;
            max-height: 80vh !important;
            background: #fff !important;
            border-radius: 12px !important;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4) !important;
            z-index: 999999 !important;
            font-family: sans-serif !important;
            overflow: hidden !important;
            border: 1px solid #ddd !important;
            transition: height 0.3s ease !important;
            touch-action: none !important;
        }
        .amrita-widget.min {
            height: 42px !important;
        }
        .widget-header {
            background: linear-gradient(135deg, #bf0d4f, #8a0636) !important;
            color: #fff !important;
            padding: 10px !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            cursor: move !important;
            font-size: 12px !important;
            user-select: none !important;
        }
        .widget-content {
            padding: 8px !important;
            overflow-y: auto !important;
            max-height: calc(80vh - 42px) !important;
        }
        .subject-card {
            border-radius: 10px !important;
            padding: 10px !important;
            margin-bottom: 8px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 5px !important;
            border-left: 4px solid #ddd !important;
            background: #f9f9f9 !important;
        }
        .status-safe {
            border-left-color: #28a745 !important;
            background: linear-gradient(135deg, #f8fff9, #e8f5e8) !important;
        }
        .status-warning {
            border-left-color: #ffc107 !important;
            background: linear-gradient(135deg, #fffef8, #fff8e1) !important;
        }
        .status-danger {
            border-left-color: #dc3545 !important;
            background: linear-gradient(135deg, #fff8f8, #ffebee) !important;
        }
        .course-code {
            font-weight: 700 !important;
            font-size: 11px !important;
        }
        .fraction {
            font-weight: 600 !important;
            font-size: 11px !important;
            color: #666 !important;
        }
        .bunk-row {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            background: rgba(255, 255, 255, 0.7) !important;
            padding: 4px 8px !important;
            border-radius: 6px !important;
        }
        .b-num {
            font-size: 16px !important;
            font-weight: 800 !important;
        }
    `;

    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);

    const t = document.getElementById('home_tab') || document.querySelector('table[class*="attendance"]');
    if (!t) return;

    const rows = Array.from(t.querySelectorAll('tr')).slice(1);
    let html = '';

    rows.forEach(r => {
        const c = r.querySelectorAll('th');
        if (c.length < 9) return;
        const tot = parseInt(c[4].textContent) || 0;
        if (tot === 0) return;
        const pre = parseInt(c[5].textContent) || 0;
        const dl = parseInt(c[6].textContent) || 0;
        const eff = pre + dl;
        const p = (eff / tot) * 100;
        const status = p >= 80 ? 'safe' : (p >= 75 ? 'warning' : 'danger');

        let b = 0, m = 0;
        if (p >= 75) {
            let tmp = tot;
            while ((eff / ++tmp) * 100 >= 75) b++;
        } else {
            let tt = tot, tp = eff;
            while ((tp / tt) * 100 < 75) {
                tt++;
                tp++;
                m++;
            }
        }

        html += `
            <div class="subject-card status-${status}">
                <div class="course-code">${c[2].innerText.split('\n')[0]}</div>
                <div class="fraction">${eff}/${tot} (${p.toFixed(1)}%)</div>
                <div class="bunk-row">
                    <b>${b > 0 ? 'Bunk' : 'Attend'}</b>
                    <span class="b-num">${b || m}</span>
                </div>
            </div>
        `;
    });

    const w = document.createElement('div');
    w.id = 'amrita-ae-mobile';
    w.className = 'amrita-widget';
    w.innerHTML = `
        <div class="widget-header" id="ae-hd">
            <span>AttendEase</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor:pointer; padding: 5px;">×</span>
        </div>
        <div class="widget-content">${html}</div>
    `;
    document.body.appendChild(w);

    let ix, iy, ox = 0, oy = 0;
    const hd = document.getElementById('ae-hd');

    hd.ontouchstart = function (e) {
        ix = e.touches[0].clientX - ox;
        iy = e.touches[0].clientY - oy;
    };

    hd.ontouchmove = function (e) {
        e.preventDefault();
        ox = e.touches[0].clientX - ix;
        oy = e.touches[0].clientY - iy;
        w.style.transform = 'translate3d(' + ox + 'px,' + oy + 'px,0)';
    };

    hd.onclick = function (e) {
        if (e.target.innerText !== '×') {
            w.classList.toggle('min');
        }
    };
})();
