## jhm5 — Cloudflare Worker 專案

這個專案是一個以 Cloudflare Workers 部署的靜態資源與簡易後端 API 解決方案。
主要特色：
- 使用 asset-directory (`public/`) 提供靜態資源
- 使用 Cloudflare KV 儲存特定應用頁面（todo、math-rushs）
- 提供一個示範的 D1 API 端點 (`/api/dse`)，可延伸為真實 D1 實作
- 所有應用程式介面為繁體中文

包含的應用：
- `index.html` — 主要登入 / 入口頁
- App 1: tictactoe（井字遊戲） — 支援單人 AI 與雙人模式
- App 2: todo-app（雲端待辦） — 使用 Cloudflare KV（API 範例）
- App 3: DSE analysis（DSE 分析器） — 使用 Cloudflare D1
- App 4: maths-rushs（限時數學遊戲） — 使用 Cloudflare KV

開發規範重點：
1. 程式碼風格：簡潔、極簡、乾淨
2. 專案名稱：`jhm5-ex03-2`
3. 主要登陸頁風格：以白色、淺藍、淺綠為主

---

## 快速部署與設定指南
前置條件
你需要在 Codespace/终端已安裝 Node.js 與 npm（repo 的 devDependencies 含 wrangler，但最好全局或本地可用）。
需要有 Cloudflare 帳號並已登入 wrangler（或使用 API token）。若未登入，請使用：
這會在瀏覽器開啟授權頁。

如果你想使用 API token（例如 CI），請在 Dashboard 建立 token 並在本地設定環境變數或使用 wrangler secret／wrangler config。

1) 建立 KV 命名空間
在專案根目錄（或任意終端）執行以下命令建立命名空間：
'''
# 建立 todo KV
npx wrangler kv namespace create "jhm5_todo_kv"

# 建立 math KV
npx wrangler kv namespace create "jhm5_math_kv"
'''

執行後，wrangler 會輸出類似：

name: jhm5_todo_kv
id: e1c75ccb561344a3becb5d207c94d376
把上述 id 分別複製並填入 wrangler.jsonc 中 kv_namespaces 對應 JHM5_TODO_KV / JHM5_MATH_KV 的 id 欄位。

範例：
'''
"kv_namespaces": [
  {
    "binding": "JHM5_TODO_KV",
    "id": "e1c75ccb561344a3becb5d207c94d376"
  },
  {
    "binding": "JHM5_MATH_KV",
    "id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
]
'''

2) 建立 D1 資料庫（若需要）
若想使用 D1，可以使用 Wrangler（若你的 wrangler 版本/帳戶支援）：
'''
npx wrangler d1 create jhm5_d1
'''

成功後會回傳 database_name（或你在 Dashboard 可看到該名稱）。把該名稱填入 wrangler.jsonc：
'''"d1_databases": [
  {
    "binding": "JHM5_D1",
    "database_name": "jhm5_d1"
  }
]
'''

如果你的組織或帳戶無法透過 CLI 建立 D1，請在 Cloudflare Dashboard → D1 頁面手動建立並記下名稱。

3) 驗證 / 本地測試
完成以上步驟並填入 wrangler.jsonc 後：
'''
# 安裝依賴（如果尚未）
npm install

# 本地 dev（可於瀏覽器檢查靜態頁面與 API）
npm run dev
'''

開啟 http://localhost:8787 測試：

訪問 /todo.html（若你把 todo.html 存入 KV，Worker 會優先讀 KV）
嘗試 PUT /todo.html（可用 curl/postman）上傳內容到 KV，然後再 GET /todo.html 驗證
範例 PUT：
'''
curl -X PUT http://localhost:8787/todo.html -d @public/todo-app/todo.html
'''

（或用 JS fetch 在前端呼叫）

4) 正式部署
本地測試無誤後：
'''
npm run deploy
'''

部署完成後，使用你在 Cloudflare 上的 Worker URL 測試相同路由