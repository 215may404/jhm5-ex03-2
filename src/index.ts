import { handleTodoApi } from './todo-app';
/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */


export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		// 处理 todo.html 的 GET 请求：优先从 KV 读取
			const path = url.pathname;

			// tictactoe 使用既有 assets（僅用 env.ASSETS）
			if (path === '/tictactoe.html') {
				if (env.ASSETS) return env.ASSETS.fetch(request);
				return new Response('tictactoe not found', { status: 404 });
			}

			// todo.html 保留舊的 TODO_KV 儲存（若存在），並支援 jhm5 的 JHM5_TODO_KV 作為回退/替代
			if (path === '/todo.html') {
				if (request.method === 'GET') {
					let html = null as string | null;
					if (env.TODO_KV) html = await env.TODO_KV.get('todo.html');
					// 不使用 JHM5_TODO_KV 作為回退；僅使用 TODO_KV
					if (html) return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
					if (env.ASSETS) return env.ASSETS.fetch(request);
					return new Response('todo.html not found', { status: 404 });
				}
				if (request.method === 'PUT') {
					const body = await request.text();
					if (env.TODO_KV) {
						await env.TODO_KV.put('todo.html', body);
						return new Response('todo.html 已儲存於 TODO_KV', { status: 200 });
					}
					return new Response('沒有配置 TODO_KV', { status: 500 });
				}
			}

			// math-rushs: 使用新的 JHM5_MATH_KV 儲存；若無則回退到 assets
			if (path.startsWith('/maths-rushs')) {
				const key = path === '/maths-rushs/maths.html' ? 'maths-rushs/maths.html' : path;
				if (request.method === 'GET') {
					if (env.MATH_KV) {
						const html = await env.MATH_KV.get(key);
						if (html) return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
					}
					if (env.ASSETS) return env.ASSETS.fetch(request);
					return new Response('maths-rushs not found', { status: 404 });
				}
				if (request.method === 'PUT') {
					if (!env.MATH_KV) return new Response('沒有配置 MATH_KV', { status: 500 });
					const body = await request.text();
					await env.MATH_KV.put(key, body);
					return new Response('maths-rushs 頁面已儲存於 MATH_KV', { status: 200 });
				}
			}

			// DSE 分析器：簡單的 API 端點示範，實際應改以 D1 存取
			if (path === '/api/dse' && request.method === 'POST') {
				// 這裡示範接收 JSON，並回傳假資料。部署時請接入 D1。
				try {
					const body = await request.json();
					// TODO: 實作 D1 查詢與儲存。這裡回傳簡潔的回應。
					const response = { message: '已收到 DSE 分析請求（示範）', received: body };
					return new Response(JSON.stringify(response), { headers: { 'content-type': 'application/json; charset=utf-8' } });
				} catch (e) {
					return new Response(JSON.stringify({ error: '無效的 JSON' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } });
				}
			}

			// DSE CSV-based 分析 API：接收 JSON { chi, eng, math, csd, electives: [{subject, grade}, ...] }
			if (path === '/api/dse-estimate' && request.method === 'POST') {
					if (!env.ASSETS) return new Response(JSON.stringify({ error: 'ASSETS 未配置，無法讀取 CSV' }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } });
					try {
						const body = await request.json() as any;
						// body: { chi, eng, math, csd, electives: [{subject, grade}] }
						const scoreMap: Record<string, number> = { '5**':7,'5*':6,'5':5,'4':4,'3':3,'2':2,'1':1,'U':0,'A':0 };

						// helper: fetch CSV text from assets, try several likely paths
						async function fetchCsvText(name: string) {
							const candidates = [
								`/DSE-analysis/${name}`,
								`/app/DSE-analysis/${name}`,
								`/app/DSE-analysis/${name.replace(/^\//,'')}`
							];
							for (const p of candidates) {
								try {
									const r = await env.ASSETS.fetch(new Request(p));
									if (r.ok) return await r.text();
								} catch (e) {
									// ignore and try next
								}
							}
							throw new Error('找不到 CSV 檔案: ' + name);
						}

						function parseCSV(text: string) {
							const lines = text.split(/\r?\n/).filter(l => l.trim());
							const rows = lines.map(l => l.split(',').map(s => s.trim()));
							const header = rows[0];
							const data: Record<string,string>[] = [];
							for (let i = 1; i < rows.length; i++) {
								const row = rows[i];
								const obj: Record<string,string> = {};
								for (let j = 0; j < header.length; j++) obj[header[j]] = row[j] || '';
								data.push(obj);
							}
							return data;
						}

						function normalizeHeader(h: string) {
							return (h || '').toString().replace(/\s+/g,'').replace(/\uFEFF/g,'').toLowerCase();
						}

						const gradeToHeaders: Record<string,string[]> = {
							'5**':['5**','5**'], '5*':['5*+','5*'], '5':['5+','5'], '4':['4+','4'], '3':['3+','3'], '2':['2+','2'], '1':['1+','1'], 'U':['U']
						};

						function parsePercent(raw: any) {
							if (raw === undefined || raw === null) return null;
							const s = raw.toString().replace(/\uFEFF/g,'').trim();
							const m = s.match(/([0-9]+(\.[0-9]+)?)\s*%?/);
							if (!m) return null;
							const num = parseFloat(m[1]);
							if (isNaN(num)) return null;
							if (num >= 0 && num <= 100) return num;
							return null;
						}

						function findPercentForRow(row: Record<string,string>, grade: string | undefined) {
							if (!row) return null;
							const keys = Object.keys(row);
							const normMap: Record<string,string> = {};
							for (const k of keys) normMap[normalizeHeader(k)] = k;
							const candidates = grade ? (gradeToHeaders[grade] || []) : [];
							for (const cand of candidates) {
								for (const nk of Object.keys(normMap)) {
									if (nk.includes(cand.replace(/\s+/g,'').toLowerCase())) {
										const raw = row[normMap[nk]];
										const v = parsePercent(raw);
										if (v !== null) return v;
									}
								}
							}
							for (const k of keys) {
								if (/表現|percent|%/i.test(k)) {
									const v = parsePercent(row[k]);
									if (v !== null) return v;
								}
							}
							for (const k of keys) {
								const v = parsePercent(row[k]);
								if (v !== null) return v;
							}
							return null;
						}

						// ingest rows into subjectData map, prefer 總數 + 百分比
						function buildSubjectMap(rows: Record<string,string>[]) {
							const map: Record<string, Record<string,string>> = {};
							for (const r of rows) {
								const subj = (r['科目'] || r['科目_2'] || r['subject'] || '').toString();
								if (!subj) continue;
								const sex = (r['性別'] || '').toString();
								const cate = (r['類別'] || '').toString();
								if (sex.includes('總') && cate.includes('百分')) { map[subj] = r; continue; }
								if (cate.includes('百分')) {
									if (!map[subj] || !((map[subj]['性別']||'').toString().includes('總') && (map[subj]['類別']||'').toString().includes('百分'))) map[subj] = r;
									continue;
								}
								if (!map[subj]) map[subj] = r;
							}
							return map;
						}

						// load CSVs
						const [aText, csdText] = await Promise.all([fetchCsvText('2024DSE(A).csv'), fetchCsvText('2024DSE(CSD).csv')]);
						const aRows = parseCSV(aText);
						const csdRows = parseCSV(csdText);
						const subjectMap = { ...buildSubjectMap(aRows), ...buildSubjectMap(csdRows) };

						// prepare subjects to evaluate
						const subjects: { name: string; grade: string | undefined }[] = [];
						if (body.chi) subjects.push({ name: '中國文學', grade: body.chi });
						if (body.eng) subjects.push({ name: '英國文學', grade: body.eng });
						if (body.math) subjects.push({ name: '數學', grade: body.math });
						if (Array.isArray(body.electives)) {
							for (const e of body.electives) subjects.push({ name: e.subject, grade: e.grade });
						}

						const perSubject: any[] = [];
						const pctValues: number[] = [];
						for (const s of subjects) {
							const row = subjectMap[s.name];
							const pct = row ? findPercentForRow(row, s.grade) : null;
							perSubject.push({ subject: s.name, grade: s.grade, percent: pct, hasRow: !!row });
							if (pct !== null && pct !== undefined) pctValues.push(pct as number);
						}

						const avg = pctValues.length ? Math.round(pctValues.reduce((a,b)=>a+b,0)/pctValues.length*10)/10 : null;

						// compute Best5-like score (using provided grades and scoreMap)
						const scores: number[] = [];
						if (body.chi) scores.push(scoreMap[body.chi] ?? 0);
						if (body.eng) scores.push(scoreMap[body.eng] ?? 0);
						if (body.math) scores.push(scoreMap[body.math] ?? 0);
						if (Array.isArray(body.electives)) for (const e of body.electives) scores.push(scoreMap[e.grade] ?? 0);
						scores.sort((a,b)=>b-a);
						const bestFive = scores.slice(0,5).reduce((a,b)=>a+b,0);

						return new Response(JSON.stringify({
							bestFiveScore: bestFive,
							perSubject,
							averagePercent: avg,
							subjectsAvailable: Object.keys(subjectMap).length
						}), { headers: { 'content-type': 'application/json; charset=utf-8' } });
					} catch (e: any) {
						return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } });
					}
				}

			// todo API
			if (path === '/api/todo') {
				return handleTodoApi(request, env);
			}

			// 其他所有請求回退到 assets
			if (env.ASSETS) return env.ASSETS.fetch(request);
			return new Response('not found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;
