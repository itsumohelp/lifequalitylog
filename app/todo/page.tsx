'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Plus, Circle } from 'lucide-react';
import Modal from '../ui/Modal';

// 型定義
type Task = {
  id: string;
  title: string;
  isCompleted: boolean;
  accumulatedSeconds: number; // 過去の計測時間の合計
  lastStartTime: number | null; // 現在計測中の開始時間 (nullなら停止中)
};

// 型定義
interface Todo {
  id: string;
  title: string;
  status: number;
  userId: string;
  createdAt: string;
  cost: number;
  name: string;
  record: {
    id: string;
    status: number;
  };
};

export default function TodoTimeTracker() {
  // 状態管理
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [todos, setTodos] = useState<Todo[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const timerIdRef = useRef<number | null>(null);

  const handleSave = () => {
    if (!name) return; // 空なら何もしない（必要に応じてバリデーション追加）

    // 有効期限30日、パスはサイト全体に有効
    document.cookie = `username=${encodeURIComponent(
      name
    )}; max-age=2592000; path=/`;
    setOpen(false);
  };



  useEffect(() => {
    getAllTodoData(); 
    if(!checkCookieExists('username')) {
      setOpen(true)
    } else if(name === "") {
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('username='))
        ?.split('=')[1];
      if (cookieValue) {
        setName(decodeURIComponent(cookieValue));
      }
    }
  }, []);

    const pushTimer = (todoId: string, isActive: boolean) => {
      if (isActive) {
        if (timerIdRef.current !== null) return;
            timerIdRef.current = window.setInterval(() => {
      setTodos(todos => todos.map(todo => todo.id === todoId ? { ...todo, cost: todo.cost + 1 } : todo) )}
    , 60000); // 1分ごと
        } else {
    if (timerIdRef.current !== null) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
      }
  };
    function checkCookieExists(cookieName: string): boolean {
      const cookies = document.cookie.split(';');
      return cookies.some(cookie => cookie.trim().startsWith(`${cookieName}=`));
    }

      const getAllTodoData = async () => {
        let response;
        response = await fetch(`/api/todo`);
        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status}`);
        }
        const responseBody = await response.json();
        setTodos(responseBody);
    };


  // タスク追加
  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTodo: Todo = {
      id: '',
      title: newTaskTitle,
      status: 0,
      userId: '',
      createdAt: new Date().toISOString(),
      cost: 0,
      name: name,
      record: {
        id: '',
        status: 0
      }
    };

    const res = await fetch('/api/todo/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(newTodo),
    })
    if (!res.ok) return null;
    newTodo.id = (await res.json()).id;

    setTodos([...todos, newTodo]);
    setNewTaskTitle('');
  };

  const toggleTimer = async (todoId: string, currentStatus: number) => {
    const method = currentStatus === 2 ? 'PUT' : 'POST';
      const res = await fetch('/api/record/', {
          method: method,
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ todoId: todoId, status: currentStatus }),
      })
      if (!res.ok) return null;
      let resCost = (await res.json()).cost;
      if(resCost === undefined) resCost = todos.find((todo) => todo.id === todoId)?.cost ?? 0;
      setTodos(todos => todos.map(todo => todo.id === todoId ? { ...todo, cost: resCost, record:{ id: todo.record.id, status: currentStatus } } : todo) )
      if(currentStatus === 1) {
        pushTimer(todoId, true);
      } else {
        pushTimer(todoId, false);
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* ヘッダー */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800">My Task & Time</h1>
          <p className="text-gray-500 mt-2">タスクごとの作業時間を計測しましょう</p>
        </header>

        {/* タスク入力フォーム */}
        <form onSubmit={addTask} className="mb-8 flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="新しいタスクを入力..."
            className="flex-1 p-4 rounded-lg border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            追加
          </button>
        </form>

        {/* タスクリスト */}

        <div className="space-y-4">
          {todos.length === 0 && (
            <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
              タスクがありません。追加してください。
            </div>
          )}
          {todos.map(todo => (
            <div key={todo.id}>

                        <div 
              key={todo.id} 
              className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between transition-all`}
            >
              {/* 左側: チェックボックスとタイトル */}
              <div className="flex items-center gap-4 flex-1">
                <button
                  className="text-gray-400 hover:text-green-500 transition-colors"
                >
                    <Circle size={24} />
                </button>
                <span className={`text-gray-700}`}><span className={`text-gray-500`}>{todo.name}</span>{todo.title}</span>
              </div>

              {/* 右側: タイマー操作と削除 */}
              <div className="flex items-center gap-4">
                {/* 時間表示 */}
                <div className={`font-mono text-xl w-28 text-right text-gray-600}`}>
                  {todo.cost}  分
                </div>

                {/* 再生/停止ボタン */}
                { todo.record.status != 1 ? (
                <button
                  onClick={() => toggleTimer(todo.id, 1)}
                  className={`p-2 rounded-full transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100`} 
                >
                   <Play size={20} fill="currentColor" />
                </button>
                ):(
                <button
                  onClick={() => toggleTimer(todo.id, 2)}
                  className={`p-2 rounded-full transition-colors bg-yellow-100 text-yellow-700 hover:bg-yellow-200`}
                >
                   <Pause size={20} fill="currentColor" />
                </button>
                )}

              </div>
            </div>
            </div>
          ))}
        </div>
      </div>

    <div className="p-8">
      <Modal open={open} onClose={() => setOpen(false)}>
        <h2 className="text-xl font-bold mb-4">あなたの名前を教えてください</h2>

        <label className="block text-sm mb-1" htmlFor="name-input">
          名前
        </label>
        <input
          id="name-input"
          type="text"
          className="border rounded px-3 py-2 w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 山田太郎"
        />

        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          onClick={handleSave}
        >
          保存して閉じる
        </button>
      </Modal>
    </div>
    </div>
  );
}