// 數學遊戲 API 模組
interface Env {
 TODO_KV: KVNamespace;
}
export async function handleMathsApi(request: Request, env: Env): Promise<Response> {
 const corsHeaders = {
 'Access-Control-Allow-Origin': '*',
 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
 'Access-Control-Allow-Headers': 'Content-Type',
 };
 if (request.method === 'OPTIONS') {
 return new Response(null, { headers: corsHeaders });
 }
 try {
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
 return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
 } catch (error) {
 return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
 status: 500,
 headers: { ...corsHeaders, 'Content-Type': 'application/json' },
 });
 }
}