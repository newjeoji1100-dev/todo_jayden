import type { Task } from '../types'
import { mediaLabel } from '../types'

type Props = {
  task: Task
  onOpen: (task: Task) => void
}

export default function TaskCard({ task, onOpen }: Props) {
  return (
    <button className="task-card press" onClick={() => onOpen(task)} aria-label={`${task.title} 상세 보기`}>
      <div className="task-card__top">
        <span className={`type-badge ${task.media_type}`}>{task.media_type === 'photo' ? '▣' : '▶'} {mediaLabel[task.media_type]}</span>
        {task.is_important && <span className="important-mark" title="중요 작업">★ 중요</span>}
      </div>
      <strong>{task.title}</strong>
      <p>{task.memo || '촬영 메모가 없습니다.'}</p>
      <span className="task-id tabular">작업 #{String(task.id).padStart(3, '0')}</span>
    </button>
  )
}
