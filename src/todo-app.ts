// 待辦事項 API 模組
interface Env {
 TODO_KV: KVNamespace;
}
export async function handleTodoApi(request: Request, env: Env): Promise<Response> {
 const url = new URL(request.url);
 const path = url.pathname;
 const corsHeaders = {
 'Access-Control-Allow-Origin': '*',
 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
 'Access-Control-Allow-Headers': 'Content-Type',
 };
 if (request.method === 'OPTIONS') {
 return new Response(null, { headers: corsHeaders });
 }
 try {
 const userId = path.split('/')[3] || 'default';
 const key = `jhm5_todo_${userId}`;
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
 return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
 } catch (error) {
 return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
 status: 500,
 headers: { ...corsHeaders, 'Content-Type': 'application/json' },
 });
 }
}
