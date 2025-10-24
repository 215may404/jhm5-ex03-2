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

     let electiveCount = 0;

    addElectiveBtn.addEventListener('click', () => {
        if (electiveCount >= 6) { alert('最多只能添加 6 科選修科目'); return; }
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