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

			// todo API
			if (path === '/api/todo') {
				return handleTodoApi(request, env);
			}

			// 其他所有請求回退到 assets
			if (env.ASSETS) return env.ASSETS.fetch(request);
			return new Response('not found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;
