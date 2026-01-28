'use client'

import { useState, useMemo } from 'react'
import { type Page } from '@/lib/db'
import { TaskItem } from './task-item'
import { today, addDays } from '@/lib/utils'

interface TaskListProps {
  overdue: Page[]
  pending: Page[]
  completed: Page[]
}

export function TaskList({ overdue: initialOverdue, pending: initialPending, completed: initialCompleted }: TaskListProps) {
  const [overdue, setOverdue] = useState(initialOverdue)
  const [pending, setPending] = useState(initialPending)
  const [completed, setCompleted] = useState(initialCompleted)
  
  // Collapsible section states
  const [showOverdue, setShowOverdue] = useState(true)
  const [showToday, setShowToday] = useState(true)
  const [showUpcoming, setShowUpcoming] = useState(true)

  // Split pending into Today and Upcoming (next 3 days)
  const { todayTasks, upcomingTasks } = useMemo(() => {
    const todayStr = today()
    const upcoming3Days = addDays(todayStr, 3)
    
    const todayTasks: Page[] = []
    const upcomingTasks: Page[] = []
    
    for (const task of pending) {
      if (task.taskDate === todayStr) {
        todayTasks.push(task)
      } else if (task.taskDate && task.taskDate > todayStr && task.taskDate <= upcoming3Days) {
        upcomingTasks.push(task)
      }
      // Tasks without dates or beyond 3 days are not shown in these sections
    }
    
    return { todayTasks, upcomingTasks }
  }, [pending])

  const handleTaskUpdate = (updatedTask: Page) => {
    const todayStr = today()
    const removeFromList = (list: Page[], taskId: string) => 
      list.filter(t => t.id !== taskId)
    
    setOverdue(prev => removeFromList(prev, updatedTask.id))
    setPending(prev => removeFromList(prev, updatedTask.id))
    setCompleted(prev => removeFromList(prev, updatedTask.id))
    
    if (updatedTask.taskCompleted) {
      setCompleted(prev => [updatedTask, ...prev])
    } else if (updatedTask.taskDate && updatedTask.taskDate < todayStr) {
      setOverdue(prev => [updatedTask, ...prev])
    } else {
      setPending(prev => [updatedTask, ...prev])
    }
  }

  const handleTaskDelete = (taskId: string) => {
    setOverdue(prev => prev.filter(t => t.id !== taskId))
    setPending(prev => prev.filter(t => t.id !== taskId))
    setCompleted(prev => prev.filter(t => t.id !== taskId))
  }

  const isEmpty = overdue.length === 0 && todayTasks.length === 0 && upcomingTasks.length === 0

  if (isEmpty) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '100px 32px',
      }}>
        {/* Beautiful empty state icon */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.12) 0%, rgba(52, 199, 89, 0.06) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(52, 199, 89, 0.1)',
        }}>
          <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
            <path 
              d="M9 12.75L11.25 15 15 9.75" 
              stroke="#34c759" 
              strokeWidth={2} 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <circle 
              cx="12" 
              cy="12" 
              r="9" 
              stroke="#34c759" 
              strokeWidth={1.5}
              opacity={0.5}
            />
          </svg>
        </div>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 600,
          color: '#1a1a1a',
          marginBottom: '8px',
          letterSpacing: '-0.02em',
        }}>All caught up!</h2>
        <p style={{
          fontSize: '15px',
          color: '#8e8e93',
          textAlign: 'center',
          lineHeight: 1.6,
          maxWidth: '280px',
        }}>
          Create tasks in your daily notes by typing{' '}
          <code style={{
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '13px',
            fontFamily: 'SF Mono, Menlo, Consolas, monospace',
            color: '#1a1a1a',
            fontWeight: 500,
          }}>[]</code>
        </p>
      </div>
    )
  }

  // Card container styles
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '16px',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)',
    overflow: 'hidden',
  }

  // Section header button styles
  const sectionButtonStyle = (isOpen: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: isOpen ? '12px' : '0',
    padding: '8px 4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 150ms ease',
    width: '100%',
  })

  const dotStyle = (color: string): React.CSSProperties => ({
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: color,
    boxShadow: `0 0 0 3px ${color}20`,
    transition: 'transform 150ms ease',
  })

  const labelStyle = (color: string): React.CSSProperties => ({
    fontSize: '12px',
    fontWeight: 700,
    color: color,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  })

  const chevronStyle = (isOpen: boolean): React.CSSProperties => ({
    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
    transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Overdue Section */}
      {overdue.length > 0 && (
        <section>
          <button
            onClick={() => setShowOverdue(!showOverdue)}
            style={sectionButtonStyle(showOverdue)}
          >
            <div style={dotStyle('#dc2626')} />
            <svg 
              width="12" 
              height="12" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="#dc2626" 
              strokeWidth={2.5}
              style={chevronStyle(showOverdue)}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <h2 style={labelStyle('#dc2626')}>
              Overdue
            </h2>
            <span style={{ 
              fontSize: '12px', 
              fontWeight: 600, 
              color: '#dc2626',
              opacity: 0.6,
            }}>
              {overdue.length}
            </span>
          </button>
          
          {showOverdue && (
            <div style={{
              ...cardStyle,
              animation: 'fadeIn 150ms ease',
            }}>
              {overdue.map((task, index) => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onUpdate={handleTaskUpdate}
                  onDelete={handleTaskDelete}
                  isOverdue
                  isLast={index === overdue.length - 1}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Today Section */}
      {todayTasks.length > 0 && (
        <section>
          <button
            onClick={() => setShowToday(!showToday)}
            style={sectionButtonStyle(showToday)}
          >
            <div style={dotStyle('#2563eb')} />
            <svg 
              width="12" 
              height="12" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="#2563eb" 
              strokeWidth={2.5}
              style={chevronStyle(showToday)}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <h2 style={labelStyle('#2563eb')}>
              Today
            </h2>
            <span style={{ 
              fontSize: '12px', 
              fontWeight: 600, 
              color: '#2563eb',
              opacity: 0.6,
            }}>
              {todayTasks.length}
            </span>
          </button>
          
          {showToday && (
            <div style={{
              ...cardStyle,
              animation: 'fadeIn 150ms ease',
            }}>
              {todayTasks.map((task, index) => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onUpdate={handleTaskUpdate}
                  onDelete={handleTaskDelete}
                  isLast={index === todayTasks.length - 1}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Upcoming Section (next 3 days) */}
      {upcomingTasks.length > 0 && (
        <section>
          <button
            onClick={() => setShowUpcoming(!showUpcoming)}
            style={sectionButtonStyle(showUpcoming)}
          >
            <div style={dotStyle('#8b5cf6')} />
            <svg 
              width="12" 
              height="12" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="#8b5cf6" 
              strokeWidth={2.5}
              style={chevronStyle(showUpcoming)}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <h2 style={labelStyle('#8b5cf6')}>
              Upcoming
            </h2>
            <span style={{ 
              fontSize: '12px', 
              fontWeight: 600, 
              color: '#8b5cf6',
              opacity: 0.6,
            }}>
              {upcomingTasks.length}
            </span>
          </button>
          
          {showUpcoming && (
            <div style={{
              ...cardStyle,
              animation: 'fadeIn 150ms ease',
            }}>
              {upcomingTasks.map((task, index) => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onUpdate={handleTaskUpdate}
                  onDelete={handleTaskDelete}
                  isLast={index === upcomingTasks.length - 1}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Completed Section */}
      {completed.length > 0 && (
        <section style={{ marginTop: '16px', opacity: 0.7 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 4px',
            color: '#9ca3af',
            fontSize: '12px',
            fontWeight: 500,
          }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {completed.length} completed
          </div>
        </section>
      )}

      {/* Fade-in animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
