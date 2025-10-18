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

			// 靜態資源優先：assets 目錄
			// 針對需要從 KV 回傳的文件，先嘗試從 KV 讀取
			if (path === '/todo.html') {
				if (request.method === 'GET') {
					const html = await env.JHM5_TODO_KV.get('todo.html');
					if (html) return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
					return env.JHM5_ASSETS.fetch(request);
				}
				if (request.method === 'PUT') {
					const body = await request.text();
					await env.JHM5_TODO_KV.put('todo.html', body);
					return new Response('todo.html 已儲存於 KV', { status: 200 });
				}
			}

			// math-rushs: 以 /maths-rushs/maths.html 作為示例
			if (path.startsWith('/maths-rushs')) {
				// GET: 優先從 KV 取回特定頁面
				if (request.method === 'GET') {
					const key = path === '/maths-rushs/maths.html' ? 'maths-rushs/maths.html' : path;
					const html = await env.JHM5_MATH_KV.get(key);
					if (html) return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
					return env.JHM5_ASSETS.fetch(request);
				}
				if (request.method === 'PUT') {
					const body = await request.text();
					const key = path === '/maths-rushs/maths.html' ? 'maths-rushs/maths.html' : path;
					await env.JHM5_MATH_KV.put(key, body);
					return new Response('maths-rushs 頁面已儲存於 KV', { status: 200 });
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

			// 其他所有請求回退到 assets
			return env.JHM5_ASSETS.fetch(request);
	},
} satisfies ExportedHandler<Env>;
