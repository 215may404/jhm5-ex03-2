document.addEventListener('DOMContentLoaded', () => {
    const todoInput = document.getElementById('todo-input');
    const addTodoBtn = document.getElementById('add-todo-btn');
    const todoList = document.getElementById('todo-list');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    let todos = []; // 存储待办事项的数组

    // --- 1. 加载和保存数据 ---
    function loadTodos() {
        const storedTodos = localStorage.getItem('todos');
        if (storedTodos) {
            todos = JSON.parse(storedTodos);
            renderTodos();
            updateProgressBar();
        }
    }

    function saveTodos() {
        localStorage.setItem('todos', JSON.stringify(todos));
    }

    // --- 2. 渲染待办事项到页面 ---
    function renderTodos() {
        todoList.innerHTML = ''; // 清空现有列表
        todos.forEach((todo, index) => {
            const listItem = document.createElement('li');
            listItem.classList.add('todo-item');
            if (todo.completed) {
                listItem.classList.add('completed');
            }

            listItem.innerHTML = `
                <input type="checkbox" data-index="${index}" ${todo.completed ? 'checked' : ''}>
                <span class="todo-text" contenteditable="true" data-index="${index}">${todo.text}</span>
                <div class="actions">
                    <button class="edit-btn" data-index="${index}">✏️</button>
                    <button class="delete-btn" data-index="${index}">🗑️</button>
                </div>
            `;
            todoList.appendChild(listItem);
        });
        updateProgressBar();
    }

    // --- 3. 更新进度条 ---
    function updateProgressBar() {
        const totalTodos = todos.length;
        const completedTodos = todos.filter(todo => todo.completed).length;
        let progressPercentage = 0;
        if (totalTodos > 0) {
            progressPercentage = (completedTodos / totalTodos) * 100;
        }
        progressBar.style.width = `${progressPercentage}%`;
        progressText.textContent = `${Math.round(progressPercentage)}% 完成`;
    }

    // --- 4. 添加待办事项 ---
    addTodoBtn.addEventListener('click', () => {
        const todoText = todoInput.value.trim();
        if (todoText !== '') {
            todos.push({ text: todoText, completed: false });
            todoInput.value = '';
            saveTodos();
            renderTodos();
        }
    });

    // 允许按回车键添加
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodoBtn.click();
        }
    });

    // --- 5. 处理列表事件 (编辑、删除、标记完成) ---
    todoList.addEventListener('click', (e) => {
        const target = e.target;

        // 标记完成/未完成
        if (target.type === 'checkbox') {
            const index = target.dataset.index;
            todos[index].completed = target.checked;
            saveTodos();
            renderTodos(); // 重新渲染以更新样式和进度条
        }

        // 删除待办事项
        if (target.classList.contains('delete-btn')) {
            const index = target.dataset.index;
            todos.splice(index, 1); // 从数组中删除
            saveTodos();
            renderTodos(); // 重新渲染列表
        }
    });

    // 处理编辑事件 (点击文本即可编辑)
    todoList.addEventListener('focusout', (e) => {
        if (e.target.classList.contains('todo-text')) {
            const index = e.target.dataset.index;
            const newText = e.target.textContent.trim();
            if (newText === '') { // 如果清空了文本，则删除该事项
                todos.splice(index, 1);
            } else {
                todos[index].text = newText;
            }
            saveTodos();
            renderTodos(); // 重新渲染以更新显示（如果需要）
        }
    });

    // 阻止 contenteditable 元素在按下回车时创建新行
    todoList.addEventListener('keypress', (e) => {
        if (e.target.classList.contains('todo-text') && e.key === 'Enter') {
            e.preventDefault(); // 阻止默认行为（换行）
            e.target.blur(); // 失去焦点，触发 focusout 事件
        }
    });

    // --- 初始加载 ---
    loadTodos();
});