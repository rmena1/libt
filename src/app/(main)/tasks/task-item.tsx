'use client'

import { type Page } from '@/lib/db'
import { updatePage } from '@/lib/actions/pages'
import { getPriorityInfo, parseTaskDate, isOverdue } from '@/lib/utils'
import { useToast } from '@/components/providers/toast-provider'
import Link from 'next/link'

// Task detection regex - same as in page-line.tsx
const TASK_REGEX = /^\[([ xX]?)\]\s*/

function getTextContent(content: string): string {
  return content.replace(TASK_REGEX, '')
}

interface TaskItemProps {
  task: Page
  onUpdate: (task: Page) => void
  onDelete: (taskId: string) => void
  isOverdue?: boolean
  isCompleted?: boolean
  isLast?: boolean
}

export function TaskItem({ task, onUpdate, onDelete, isOverdue: overdueFlag, isCompleted, isLast }: TaskItemProps) {
  const { showError } = useToast()
  
  const textContent = getTextContent(task.content)
  const parsedDate = parseTaskDate(textContent)
  const priorityInfo = getPriorityInfo(task.taskPriority as 'low' | 'medium' | 'high' | null)
  
  const taskOverdue = overdueFlag || (task.taskDate && isOverdue(task.taskDate))
  
  const displayDate = task.taskDate 
    ? parsedDate.displayText || formatTaskDate(task.taskDate)
    : null

  const handleCheckboxToggle = async () => {
    const newCompleted = !task.taskCompleted
    
    try {
      const newCheckbox = newCompleted ? '[x] ' : '[] '
      const newContent = newCheckbox + textContent
      
      const updated = await updatePage(task.id, {
        content: newContent,
        taskCompleted: newCompleted,
      })
      
      onUpdate(updated)
    } catch (error) {
      console.error('Failed to toggle task:', error)
      showError('Failed to update task.')
    }
  }

  // Priority badge colors - softer, more premium
  const getPriorityStyle = () => {
    if (!priorityInfo || isCompleted) return null
    
    const styles: Record<string, React.CSSProperties> = {
      '!!!': {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        color: '#dc2626',
        border: '1px solid rgba(239, 68, 68, 0.15)',
      },
      '!!': {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        color: '#d97706',
        border: '1px solid rgba(245, 158, 11, 0.15)',
      },
      '!': {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        color: '#2563eb',
        border: '1px solid rgba(59, 130, 246, 0.15)',
      },
    }
    
    return styles[priorityInfo.label] || null
  }

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px',
        padding: '18px 20px',
        borderBottom: isLast ? 'none' : '1px solid rgba(0, 0, 0, 0.05)',
        opacity: isCompleted ? 0.5 : 1,
        transition: 'opacity 200ms ease, background-color 150ms ease',
        cursor: 'default',
        backgroundColor: 'transparent',
        minHeight: '56px',
      }}
    >
      {/* Apple-style Checkbox */}
      <div
        onClick={handleCheckboxToggle}
        style={{
          flexShrink: 0,
          width: '22px',
          height: '22px',
          borderRadius: '7px',
          border: task.taskCompleted 
            ? 'none' 
            : taskOverdue 
              ? '2px solid #ff3b30'
              : '2px solid #d1d5db',
          backgroundColor: task.taskCompleted ? '#34c759' : 'transparent',
          marginTop: '2px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: task.taskCompleted 
            ? '0 1px 3px rgba(52, 199, 89, 0.3)' 
            : 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
        }}
        role="checkbox"
        aria-checked={task.taskCompleted}
      >
        {task.taskCompleted && (
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path 
              d="M2.5 6.5L5.5 9.5L10.5 3.5" 
              stroke="white" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* First row: task text + priority badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          {/* Task text */}
          <span style={{
            fontSize: '16px',
            lineHeight: '24px',
            color: isCompleted ? '#9ca3af' : '#1f2937',
            textDecoration: isCompleted ? 'line-through' : 'none',
            wordBreak: 'break-word',
            fontWeight: 400,
            letterSpacing: '-0.01em',
            flex: 1,
          }}>
            {parsedDate.cleanedContent}
          </span>
          
          {/* Priority badge - inline with text */}
          {priorityInfo && !isCompleted && (
            <span style={{ 
              flexShrink: 0,
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              letterSpacing: '0.02em',
              marginTop: '3px',
              ...getPriorityStyle(),
            }}>
              {priorityInfo.label}
            </span>
          )}
        </div>
        
        {/* Second row: date and source */}
        {(displayDate || task.dailyDate) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginTop: '8px',
          }}>
            {displayDate && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: 500,
                padding: '3px 10px',
                borderRadius: '6px',
                color: taskOverdue && !isCompleted ? '#dc2626' : '#6b7280',
                backgroundColor: taskOverdue && !isCompleted 
                  ? 'rgba(220, 38, 38, 0.08)' 
                  : 'rgba(107, 114, 128, 0.08)',
                border: taskOverdue && !isCompleted
                  ? '1px solid rgba(220, 38, 38, 0.1)'
                  : '1px solid transparent',
              }}>
                {taskOverdue && !isCompleted && (
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                    <circle cx="12" cy="12" r="9" strokeWidth={2} />
                  </svg>
                )}
                {displayDate}
              </span>
            )}
            
            {task.dailyDate && (
              <Link 
                href={`/daily?date=${task.dailyDate}`}
                style={{
                  fontSize: '12px',
                  color: '#9ca3af',
                  textDecoration: 'none',
                  transition: 'color 150ms ease',
                  padding: '3px 0',
                }}
              >
                ↗ {task.dailyDate}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function formatTaskDate(dateStr: string): string {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  
  if (dateStr === today) return 'Today'
  
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  if (dateStr === tomorrowStr) return 'Tomorrow'
  
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
  if (dateStr === yesterdayStr) return 'Yesterday'
  
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    timeZone: 'America/Santiago'
  })
}
