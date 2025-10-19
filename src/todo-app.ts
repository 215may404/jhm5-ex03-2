export type Todo = {
  id: string;
  text: string;
  done?: boolean;
};

const TODO_KEY = 'todos.json';

export async function getTodos(env: Env): Promise<Todo[]> {
  if (!env.TODO_KV) return [];
  const raw = await env.TODO_KV.get(TODO_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Todo[];
  } catch {
    return [];
  }
}

export async function saveTodos(env: Env, todos: Todo[]): Promise<void> {
  if (!env.TODO_KV) throw new Error('沒有配置 TODO_KV');
  await env.TODO_KV.put(TODO_KEY, JSON.stringify(todos));
}

export async function handleTodoApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  try {
    if (request.method === 'GET') {
      const todos = await getTodos(env);
      return new Response(JSON.stringify(todos), { headers: { 'content-type': 'application/json; charset=utf-8' } });
    }

    if (request.method === 'POST' || request.method === 'PUT') {
      const body = await request.json();
      // Expecting an array or a single todo
      const todos = Array.isArray(body) ? body : await getTodos(env);
      // If single todo provided, append or replace by id
      let newTodos: any[];
      if (Array.isArray(body)) newTodos = body;
      else {
        const incoming = body as Todo;
        const old = await getTodos(env);
        const idx = old.findIndex(t => t.id === incoming.id);
        if (idx >= 0) {
          old[idx] = incoming;
          newTodos = old;
        } else {
          newTodos = [...old, incoming];
        }
      }
      await saveTodos(env, newTodos as Todo[]);
      return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
    }

    if (request.method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) return new Response(JSON.stringify({ error: '需要 id' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } });
      const old = await getTodos(env);
      const newTodos = old.filter(t => t.id !== id);
      await saveTodos(env, newTodos);
      return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
    }

    return new Response('不支援的 HTTP 方法', { status: 405 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } });
  }
}
