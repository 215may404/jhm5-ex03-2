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
import { handleTodoApi } from './todo-app';
import { handleMathsApi } from './maths-rushs';

interface Env {
 ASSETS: Fetcher;
 TODO_KV: KVNamespace;
}
export default {
 async fetch(request: Request, env: Env): Promise<Response> {
 const url = new URL(request.url);
 const path = url.pathname;
 // API 路由
 if (path.startsWith('/api/')) {
 const corsHeaders = {
 'Access-Control-Allow-Origin': '*',
 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
 'Access-Control-Allow-Headers': 'Content-Type',
 };
 if (request.method === 'OPTIONS') {
 return new Response(null, { headers: corsHeaders });
 }
 try {
 // Todo Cloud API
 if (path.startsWith('/api/todo/')) {
 const userId = path.split('/')[3] || 'default';
 const key = `jhm5_ex03_2_todo_${userId}`;
 if (request.method === 'GET') {
 const todos = await env.TODO_KV.get(key);
 return new Response(todos || '[]', {
 headers: { ...corsHeaders, 'Content-Type': 'application/json' },
 });
 }
 if (request.method === 'POST' || request.method === 'PUT') {
 const body = await request.text();
 await env.TODO_KV.put(key, body);
 return new Response(body, {
 headers: { ...corsHeaders, 'Content-Type': 'application/json' },
 });
 }
 if (request.method === 'DELETE') {
 await env.TODO_KV.delete(key);
 return new Response('[]', {
 headers: { ...corsHeaders, 'Content-Type': 'application/json' },
 });
 }
 }
 // Math Game API
 if (path === '/api/mathsrushs/scores') {
 const key = 'jhm5_ex03_2_mathsrushs_scores';
 if (request.method === 'GET') {
 const scores = await env.TODO_KV.get(key);
 return new Response(scores || '[]', {
 headers: { ...corsHeaders, 'Content-Type': 'application/json' },
 });
 }
 if (request.method === 'POST') {
 const scoresData = await env.TODO_KV.get(key);
 const scores = scoresData ? JSON.parse(scoresData) : [];
 await env.TODO_KV.put(key, JSON.stringify(scores));
 return new Response(JSON.stringify(scores), {
 headers: { ...corsHeaders, 'Content-Type': 'application/json' },
 });
 }
 }
 return new Response('Not Found', { status: 404, headers: corsHeaders });
 } catch (error) {
 return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
 status: 500,
 headers: { ...corsHeaders, 'Content-Type': 'application/json' },
 });
 }
 }
 // 靜態資源服務
 return env.ASSETS.fetch(request);
 },
};