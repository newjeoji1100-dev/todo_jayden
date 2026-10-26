import { useEffect, useMemo, useState } from 'react'
import { api } from './lib/api'
import type { Filter, ShootTodo } from './types'
import { mediaLabel } from './types'

const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: '전체' }, { id: 'photo', label: '사진' }, { id: 'video', label: '영상' },
  { id: '2470', label: '2470' }, { id: '70200', label: '70200' },
]

export default function App() {
  const [todos, setTodos] = useState<ShootTodo[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState<number | null>(null)

  const load = async () => {
    setLoading(true); setError('')
    try {
      const response = await api('shoot-todos')
      if (!response.ok) throw new Error()
      setTodos(await response.json())
    } catch { setError('촬영 목록을 불러오지 못했어요.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const visibleTodos = useMemo(() => todos.filter((todo) => {
    if (filter === 'all') return true
    if (filter === '2470' || filter === '70200') return todo.camera_tag === filter
    return todo.media_type === filter
  }), [todos, filter])
  const completedCount = todos.filter((todo) => todo.completed).length
  const progress = todos.length ? Math.round((completedCount / todos.length) * 100) : 0

  const toggleTodo = async (todo: ShootTodo) => {
    if (updating) return
    setUpdating(todo.id)
    try {
      const response = await api(`shoot-todos/${todo.id}/completion`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed }),
      })
      if (!response.ok) throw new Error()
      const saved: ShootTodo = await response.json()
      setTodos((items) => items.map((item) => item.id === saved.id ? saved : item).sort((a, b) => Number(a.completed) - Number(b.completed) || a.sequence - b.sequence))
    } catch { setError('상태 변경에 실패했어요. 다시 시도해 주세요.') }
    finally { setUpdating(null) }
  }

  return <main className="todo-app">
    <header className="app-header">
      <p className="kicker">JEJU RETREAT · SHOOT LIST</p>
      <div className="title-row"><div><h1>촬영 체크리스트</h1><p>오늘의 장면을 하나씩 담아보세요.</p></div><span className="count-badge tabular">{completedCount}/{todos.length}</span></div>
      <section className="progress-card" aria-label={`전체 진행률 ${progress}%`}>
        <div><strong>전체 진행률</strong><span className="tabular">{progress}%</span></div>
        <div className="progress-track"><div className="progress-value" style={{ width: `${progress}%` }} /></div>
      </section>
    </header>

    <nav className="filter-tabs" aria-label="촬영 목록 필터">
      {filters.map((item) => <button key={item.id} className={filter === item.id ? 'filter-tab active' : 'filter-tab'} onClick={() => setFilter(item.id)}>{item.label}</button>)}
    </nav>

    <section className="todo-list" aria-live="polite">
      {loading ? <p className="state-message">촬영 목록을 준비하고 있어요.</p> : error ? <div className="state-message"><p>{error}</p><button onClick={load}>다시 시도</button></div> : visibleTodos.length === 0 ? <p className="state-message">선택한 조건의 촬영 항목이 없어요.</p> : visibleTodos.map((todo, index) => {
        const previous = visibleTodos[index - 1]
        const showSection = !previous || previous.section !== todo.section
        return <div key={todo.id}>{showSection && <h2 className="section-label">{todo.section}</h2>}<article className={todo.completed ? 'todo-item completed' : 'todo-item'}>
          <button className="check-button" onClick={() => toggleTodo(todo)} disabled={updating === todo.id} aria-label={`${todo.title} ${todo.completed ? '완료 취소' : '완료 처리'}`}>
            {todo.completed && <span>✓</span>}
          </button>
          <div className="todo-content">
            <div className="todo-meta"><span>{String(todo.sequence).padStart(2, '0')}</span><span>{mediaLabel[todo.media_type]}</span><span className="camera-tag">{todo.camera_tag}</span>{todo.is_required && <span className="required-tag">필수</span>}</div>
            <h3>{todo.title}</h3>
            {todo.detail && <p>{todo.detail}</p>}
          </div>
        </article></div>
      })}
    </section>
  </main>
}
