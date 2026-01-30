'use client'

import { useState, useMemo } from 'react'
import { useZero, useQuery } from '@rocicorp/zero/react'
import type { ZeroPage } from '@/zero/hooks'
import { TaskItem } from './task-item'
import { today, addDays } from '@/lib/utils'

export function TaskList() {
  const z = useZero()
  const todayStr = today()
  
  // Single query for all tasks (reactive via Zero)
  const [allTasks] = useQuery(
    z.query.page
      .where('isTask', true)
      .orderBy('taskDate', 'asc')
      .orderBy('createdAt', 'desc')
  )
  
  // Split into sections via useMemo
  const { overdue, todayTasks, upcomingTasks, completed } = useMemo(() => {
    const upcoming3Days = addDays(todayStr, 3)
    const overdue: ZeroPage[] = []
    const todayTasks: ZeroPage[] = []
    const upcomingTasks: ZeroPage[] = []
    const completed: ZeroPage[] = []
    
    for (const task of allTasks as ZeroPage[]) {
      if (task.taskCompleted) {
        completed.push(task)
      } else if (task.taskDate && task.taskDate < todayStr) {
        overdue.push(task)
      } else if (task.taskDate === todayStr) {
        todayTasks.push(task)
      } else if (task.taskDate && task.taskDate > todayStr && task.taskDate <= upcoming3Days) {
        upcomingTasks.push(task)
      }
    }
    
    return { overdue, todayTasks, upcomingTasks, completed }
  }, [allTasks, todayStr])

  const isEmpty = overdue.length === 0 && todayTasks.length === 0 && upcomingTasks.length === 0

  if (isEmpty) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '100px 32px',
      }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.12) 0%, rgba(52, 199, 89, 0.06) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '24px', boxShadow: '0 2px 8px rgba(52, 199, 89, 0.1)',
        }}>
          <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
            <path d="M9 12.75L11.25 15 15 9.75" stroke="#34c759" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="9" stroke="#34c759" strokeWidth={1.5} opacity={0.5} />
          </svg>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px', letterSpacing: '-0.02em' }}>All caught up!</h2>
        <p style={{ fontSize: '15px', color: '#8e8e93', textAlign: 'center', lineHeight: 1.6, maxWidth: '280px' }}>
          Create tasks in your daily notes by typing{' '}
          <code style={{ backgroundColor: 'rgba(0, 0, 0, 0.04)', padding: '3px 8px', borderRadius: '6px', fontSize: '13px', fontFamily: 'SF Mono, Menlo, Consolas, monospace', color: '#1a1a1a', fontWeight: 500 }}>[]</code>
        </p>
      </div>
    )
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white', borderRadius: '16px',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)',
    overflow: 'hidden',
  }

  // No-op handlers since Zero reactivity handles updates
  const noop = () => {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {overdue.length > 0 && (
        <TaskSection label="Overdue" color="#dc2626" count={overdue.length} cardStyle={cardStyle}>
          {overdue.map((task, index) => (
            <TaskItem key={task.id} task={task as any} onUpdate={noop} onDelete={noop} isOverdue isLast={index === overdue.length - 1} />
          ))}
        </TaskSection>
      )}

      {todayTasks.length > 0 && (
        <TaskSection label="Today" color="#2563eb" count={todayTasks.length} cardStyle={cardStyle}>
          {todayTasks.map((task, index) => (
            <TaskItem key={task.id} task={task as any} onUpdate={noop} onDelete={noop} isLast={index === todayTasks.length - 1} />
          ))}
        </TaskSection>
      )}

      {upcomingTasks.length > 0 && (
        <TaskSection label="Upcoming" color="#8b5cf6" count={upcomingTasks.length} cardStyle={cardStyle}>
          {upcomingTasks.map((task, index) => (
            <TaskItem key={task.id} task={task as any} onUpdate={noop} onDelete={noop} isLast={index === upcomingTasks.length - 1} />
          ))}
        </TaskSection>
      )}

      {completed.length > 0 && (
        <section style={{ marginTop: '16px', opacity: 0.7 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 4px', color: '#9ca3af', fontSize: '12px', fontWeight: 500 }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {completed.length} completed
          </div>
        </section>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function TaskSection({ label, color, count, cardStyle, children }: {
  label: string; color: string; count: number; cardStyle: React.CSSProperties; children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(true)
  
  return (
    <section>
      <button onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: isOpen ? '12px' : '0', padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 0 3px ${color}20` }} />
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2.5}
          style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <h2 style={{ fontSize: '12px', fontWeight: 700, color, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{label}</h2>
        <span style={{ fontSize: '12px', fontWeight: 600, color, opacity: 0.6 }}>{count}</span>
      </button>
      {isOpen && <div style={{ ...cardStyle, animation: 'fadeIn 150ms ease' }}>{children}</div>}
    </section>
  )
}
