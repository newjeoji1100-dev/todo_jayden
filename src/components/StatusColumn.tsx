import TaskCard from './TaskCard'
import type { Status, Task } from '../types'
import { statusLabel } from '../types'

type Props = { status: Status; tasks: Task[]; onOpen: (task: Task) => void }

export default function StatusColumn({ status, tasks, onOpen }: Props) {
  return (
    <section className="status-column" aria-labelledby={`${status}-heading`}>
      <header className="column-header">
        <h2 id={`${status}-heading`}>{statusLabel[status]}</h2>
        <span className="count tabular">{tasks.length}</span>
      </header>
      <div className="task-stack">
        {tasks.length ? tasks.map((task) => <TaskCard key={task.id} task={task} onOpen={onOpen} />) : (
          <div className="empty-column"><span aria-hidden="true">□</span><p>등록된 작업이 없습니다.</p></div>
        )}
      </div>
    </section>
  )
}
