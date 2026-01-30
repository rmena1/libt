import { TaskList } from './task-list'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
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
        </div>
      </div>

      {/* Task List - data comes from Zero */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '16px 24px 140px' }}>
        <TaskList />
      </div>
    </div>
  )
}
