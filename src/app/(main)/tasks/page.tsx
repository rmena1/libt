import { getTasks, getTaskStats } from '@/lib/actions/tasks'
import { TaskList } from './task-list'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const [taskGroups, stats] = await Promise.all([
    getTasks(),
    getTaskStats(),
  ])

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #fafafa 0%, #f5f5f7 100%)',
    }}>
      {/* Premium Header */}
      <div 
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'linear-gradient(180deg, rgba(250, 250, 250, 0.95) 0%, rgba(250, 250, 250, 0.88) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 24px 20px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 700,
            color: '#1a1a1a',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            margin: 0,
          }}>
            Tasks
          </h1>
          
          {/* Stats bar - pill-style badges */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '12px',
            flexWrap: 'wrap',
          }}>
            {stats.overdue > 0 && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#dc2626',
                backgroundColor: 'rgba(220, 38, 38, 0.08)',
                padding: '4px 10px 4px 8px',
                borderRadius: '20px',
              }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#dc2626',
                  flexShrink: 0,
                }} />
                {stats.overdue} overdue
              </span>
            )}
            {stats.dueToday > 0 && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                padding: '4px 10px 4px 8px',
                borderRadius: '20px',
              }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                  flexShrink: 0,
                }} />
                {stats.dueToday} today
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '16px 24px 140px' }}>
        <TaskList 
          overdue={taskGroups.overdue}
          pending={taskGroups.pending}
          completed={taskGroups.completed}
        />
      </div>
    </div>
  )
}
