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
		if (url.pathname === "/todo.html" && request.method === "GET") {
			const kvValue = await env.TODO_KV.get("todo.html");
			if (kvValue) {
				return new Response(kvValue, {
					headers: { "content-type": "text/html; charset=utf-8" }
				});
			}
			// KV 没有则回退到静态资源
			return env.ASSETS.fetch(request);
		}
		// 处理 todo.html 的 PUT 请求：写入 KV
		if (url.pathname === "/todo.html" && request.method === "PUT") {
			const body = await request.text();
			await env.TODO_KV.put("todo.html", body);
			return new Response("todo.html updated in KV", { status: 200 });
		}
		// 其他请求走静态资源
		return env.ASSETS.fetch(request);
	},
} satisfies ExportedHandler<Env>;
