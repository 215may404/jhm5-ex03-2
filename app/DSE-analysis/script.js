document.addEventListener('DOMContentLoaded', () => {
    const dseForm = document.getElementById('dseForm');
    const electivesContainer = document.getElementById('electives-container');
    const addElectiveBtn = document.getElementById('add-elective-btn');
    const resetBtn = document.getElementById('reset-btn');
    const resultsSection = document.getElementById('analysis-results');

    // 級別分數轉換
    const scoreMap = {
        '5**': 7, '5*': 6, '5': 5,
        '4': 4, '3': 3, '2': 2, '1': 1,
        'U': 0, 'A': 0
    };

    const electiveSubjects = [
        '中國文學','英國文學', '歷史', '中國歷史','地理',
        '物理', '化學', '生物','經濟', '企業、會計與財務概論',
        '數學延伸部分(M1)', '數學延伸部分(M2)',
        '體育', '音樂','視覺藝術','資訊及通訊科技', '科技與生活',
        '倫理與宗教', '旅遊與款待', '設計與應用科技', '健康管理與社會關懷'
    ];

    const percentileData = [
        { score: 35, percentile: 99.5, rank: '頂尖 0.5%', desc: '極頂尖成績' },
        { score: 28, percentile: 90, rank: '約 Top 10%', desc: '穩入港大/中大高競爭力學科' },
        { score: 23, percentile: 75, rank: '約 Top 25%', desc: '有望入讀熱門學士課程' },
        { score: 20, percentile: 60, rank: '約 Top 40%', desc: '穩入八大資助學士課程' },
        { score: 14, percentile: 45, rank: '約 Top 55%', desc: '達到學士最低要求' },
        { score: 10, percentile: 30, rank: '約 Top 70%', desc: '達到高級文憑/副學士基礎要求' },
        { score: 5, percentile: 10, rank: '約 Top 90% 以下', desc: '建議考慮其他進修途徑' }
    ];

    // CSV 來源資料（稍後載入）
    const subjectData = {}; // subject -> { headerKey: value }

    // 解析簡單 CSV（非嚴格：不處理包含逗號的雙引號欄位）
    function parseCSV(text) {
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        const rows = lines.map(l => l.split(',').map(s => s.trim()));
        const header = rows[0];
        const data = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const obj = {};
            for (let j = 0; j < header.length; j++) obj[header[j]] = row[j] || '';
            data.push(obj);
        }
        return data;
    }

    async function loadCSVData() {
        try {
            const [aTxt, csdTxt] = await Promise.all([
                fetch('2024DSE(A).csv').then(r => r.text()),
                fetch('2024DSE(CSD).csv').then(r => r.text())
            ]);
            const aRows = parseCSV(aTxt);
            const csdRows = parseCSV(csdTxt);
            // 建立以科目為 key 的彙整，優先取 (性別 包含 '總' 且 類別 包含 '百分') 的行
            function ingest(rows) {
                for (const r of rows) {
                    const subj = r['\u79d1\u76ee'] || r['科目'] || r['科目_2'] || r['subject'] || '';
                    if (!subj) continue;
                    const sex = (r['性別'] || r['\u6027\u5225'] || '').toString();
                    const cate = (r['類別'] || r['\u985e\u5225'] || r['category'] || '').toString();

                    // 優先：總數 & 百分比
                    if (sex.includes('總') && cate.includes('百分')) {
                        subjectData[subj] = r;
                        continue;
                    }
                    // 次優先：任何百分比行
                    if (cate.includes('百分')) {
                        // 若尚未有總數百分比，使用此行
                        if (!subjectData[subj] || !( (subjectData[subj]['性別']||'').toString().includes('總') && (subjectData[subj]['類別']||'').toString().includes('百分') )) {
                            subjectData[subj] = r;
                        }
                        continue;
                    }
                    // 否則首次出現的資料行作為備援（通常是人數）
                    if (!subjectData[subj]) subjectData[subj] = r;
                }
            }

            ingest(aRows);
            ingest(csdRows);
        } catch (e) {
            console.warn('無法讀取 CSV：', e);
        }
    }

    function normalizeHeader(h) {
        return (h || '').toString().replace(/\s+/g, '').replace(/\uFEFF/g, '').toLowerCase();
    }

    // 更可靠的等級 -> CSV 欄位候選映射（依 csv 表頭命名慣例）
    const gradeToHeaders = {
        '5**': ['5**','5**'],
        '5*': ['5*+','5*'],
        '5': ['5+','5'],
        '4': ['4+','4'],
        '3': ['3+','3'],
        '2': ['2+','2'],
        '1': ['1+','1'],
        'U': ['U']
    };

    function findPercentForRow(row, grade) {
        if (!row) return null;
        const keys = Object.keys(row || {});

        // normalize key map for faster lookup
        const normMap = {};
        for (const k of keys) {
            const nk = normalizeHeader(k);
            normMap[nk] = k;
        }

        // try headers by grade candidates first
        const candidates = gradeToHeaders[grade] || [];
        for (const cand of candidates) {
            // try exact includes in normalized keys
            for (const nk of Object.keys(normMap)) {
                if (nk.includes(cand.replace(/\s+/g,'').toLowerCase())) {
                    const raw = row[normMap[nk]];
                    const v = parsePercent(raw);
                    if (v !== null) return v;
                }
            }
        }

        // fallback: search any header that contains '表現' 或 '%' 或 'percent' 再提取數字
        for (const k of keys) {
            if (/表現|percent|%/i.test(k)) {
                const raw = row[k];
                const v = parsePercent(raw);
                if (v !== null) return v;
            }
        }

        // 最後嘗試任意欄位解析出百分比數字
        for (const k of keys) {
            const raw = row[k];
            const v = parsePercent(raw);
            if (v !== null) return v;
        }

        return null;
    }

    function parsePercent(raw) {
        if (raw === undefined || raw === null) return null;
        const s = raw.toString().replace(/\uFEFF/g,'').trim();
        // match number with optional percent sign
        const m = s.match(/([0-9]+(\.[0-9]+)?)\s*%?/);
        if (!m) return null;
        const num = parseFloat(m[1]);
        if (isNaN(num)) return null;
        // Heuristic: if looks like a percentage (0-100), accept it.
        if (num >= 0 && num <= 100) return num;
        return null;
    }

    function estimatePercentileFor(subject, grade) {
        const row = subjectData[subject];
        if (!row) return null;
        // use findPercentForRow
        const val = findPercentForRow(row, grade);
        return val; // percentage number or null
    }

    let electiveCount = 0

    addElectiveBtn.addEventListener('click', () => {
        if (electiveCount >= 4) { alert('最多只能添加 4 科選修科目'); return; }
        electiveCount++;
        const div = document.createElement('div');
        div.className = 'input-group';
        div.innerHTML = `
            <label for="elective-${electiveCount}">選修科目 ${electiveCount}：</label>
            <select id="elective-${electiveCount}" name="elective-${electiveCount}">
                <option value="">請選擇科目</option>
                ${electiveSubjects.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
            <select id="grade-${electiveCount}" name="grade-${electiveCount}">
                <option value="">請選擇成績</option>
                <option value="5**">5**</option>
                <option value="5*">5*</option>
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
                <option value="1">1</option>
                <option value="U">U (不予評級)</option>
            </select>
            <button type="button" class="remove-elective-btn">移除</button>
        `;
        electivesContainer.appendChild(div);
        div.querySelector('.remove-elective-btn').addEventListener('click', () => { div.remove(); electiveCount--; });
    });

    function getRankAndPercentile(total) {
        for (const d of percentileData) if (total >= d.score) return { rankText: d.rank, percentileText: `約 ${d.percentile} 百分位 (${d.desc})` };
        return { rankText: '未達標', percentileText: '低於 10 百分位' };
    }

    // preload CSV data
    loadCSVData();

    dseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // collect core grades
        const coreGrades = {
            chi: document.getElementById('chi').value,
            eng: document.getElementById('eng').value,
            math: document.getElementById('math').value,
            csd: document.getElementById('csd').value
        };

        // collect electives
        const electiveGrades = [];
        for (let i = 1; i <= electiveCount; i++) {
            const subj = document.getElementById(`elective-${i}`)?.value;
            const grade = document.getElementById(`grade-${i}`)?.value;
            if (subj && grade) electiveGrades.push({ subject: subj, grade });
        }

        // build scores: core (chi, eng, math) + electives
        const allScores = [ scoreMap[coreGrades.chi] || 0, scoreMap[coreGrades.eng] || 0, scoreMap[coreGrades.math] || 0 ];
        electiveGrades.forEach(e => allScores.push(scoreMap[e.grade] || 0));

        const sorted = allScores.slice().sort((a,b)=>b-a);
        const bestFive = sorted.slice(0,5);
        const bestFiveTotal = bestFive.reduce((s,v)=>s+v,0);

    const { rankText, percentileText } = getRankAndPercentile(bestFiveTotal);

        // HD check: chi & eng >=2 and at least 5 subjects >=2 (include core+electives considered in bestFive?)
        const chiPass = (scoreMap[coreGrades.chi] || 0) >= 2;
        const engPass = (scoreMap[coreGrades.eng] || 0) >= 2;
        const level2Count = sorted.filter(s=>s>=2).length; // count among all available scores
        const cslAttained = coreGrades.csd === 'A';
        const isHDQualified = chiPass && engPass && level2Count >= 5;

        // display
        document.getElementById('result-best5').textContent = bestFiveTotal;
        document.getElementById('result-rank').textContent = rankText;
        document.getElementById('result-percentile').textContent = percentileText;
        let hdText = isHDQualified ? '✓ 達到基礎要求 (五科 2 級)' : 'X 未達到基礎要求 (需五科 2 級)';
        hdText += cslAttained ? ' | 公民科：達標' : ' | 公民科：不達標';
        document.getElementById('result-hd-req').textContent = hdText;
        resultsSection.style.display = 'block';

        // CSV-based estimate: map each subject+grade to an estimated percentile (if CSV data exists)
        const csvEstimateEl = document.getElementById('result-csv-estimate');
        const breakdown = document.getElementById('result-breakdown');
        if (csvEstimateEl && breakdown) {
            const subjects = [
                { name: '中國文學', grade: coreGrades.chi },
                { name: '英國文學', grade: coreGrades.eng },
                { name: '數學', grade: coreGrades.math }
            ];
            electiveGrades.forEach(e => subjects.push({ name: e.subject, grade: e.grade }));

            breakdown.innerHTML = '';
            const pctValues = [];
            for (const s of subjects) {
                const pct = estimatePercentileFor(s.name, s.grade);
                const div = document.createElement('div');
                if (pct !== null && pct !== undefined) {
                    pctValues.push(pct);
                    div.textContent = `${s.name} (${s.grade})：估計百分比 ${pct}%`;
                } else if (subjectData[s.name]) {
                    div.textContent = `${s.name} (${s.grade})：CSV 有資料，但無法解析出百分比`;
                } else {
                    div.textContent = `${s.name} (${s.grade})：無 CSV 資料`;
                }
                breakdown.appendChild(div);
            }
            if (pctValues.length > 0) {
                const avg = Math.round(pctValues.reduce((a,b)=>a+b,0)/pctValues.length*10)/10;
                csvEstimateEl.textContent = `基於 ${pctValues.length} 科的估計百分位：${avg}%`;
            } else {
                csvEstimateEl.textContent = `無足夠 CSV 百分比資料進行估計`;
            }
        }
    });

    resetBtn.addEventListener('click', () => {
        dseForm.reset();
        electivesContainer.innerHTML = '';
        electiveCount = 0;
        resultsSection.style.display = 'none';
        document.getElementById('result-best5').textContent = '';
        document.getElementById('result-rank').textContent = '';
        document.getElementById('result-percentile').textContent = '';
        document.getElementById('result-hd-req').textContent = '';
    });
});