import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db, pages } from '@/lib/db'
import { eq, and, desc, sql } from 'drizzle-orm'
import { generateId, today } from '@/lib/utils'

async function generateSummary(apiKey: string, transcriptionText: string): Promise<{
  titulo: string
  resumen: string
  detalle: string
  accionables: string[]
} | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Eres un asistente que resume reuniones en español.

Dada esta transcripción de una reunión, genera un JSON con exactamente esta estructura:
{
  "titulo": "Título breve de la reunión (máx 6 palabras)",
  "resumen": "Un párrafo general de qué se trató la reunión",
  "detalle": "Historia cronológica corta de lo que se habló, en orden, con énfasis en los puntos importantes. Como una historia corta.",
  "accionables": ["Nombre: tarea específica", "Nombre: otra tarea"]
}`,
          },
          {
            role: 'user',
            content: `Transcripción:\n${transcriptionText}`,
          },
        ],
      }),
    })

    if (!res.ok) {
      console.error('GPT-4o summary error:', await res.text())
      return null
    }

    const data = await res.json()
    const parsed = JSON.parse(data.choices[0].message.content)
    return parsed
  } catch (err) {
    console.error('Summary generation failed:', err)
    return null
  }
}

function pageRow(userId: string, todayDate: string, content: string, indent: number, order: number, now: number) {
  return {
    id: generateId(),
    userId,
    content,
    indent,
    dailyDate: todayDate,
    parentPageId: null,
    folderId: null,
    order,
    isTask: false,
    taskCompleted: false,
    taskCompletedAt: null,
    taskDate: null,
    taskPriority: null,
    starred: false,
    createdAt: now,
    updatedAt: now,
  }
}

async function saveSummaryPages(
  userId: string,
  todayDate: string,
  meetingsOrder: number,
  meetingStartTime: string,
  summary: { titulo: string; resumen: string; detalle: string; accionables: string[] },
  apiKey: string
) {
  const now = Date.now()

  // Find all pages under meetings to locate the right time block
  const allPages = await db
    .select({ id: pages.id, order: pages.order, indent: pages.indent, content: pages.content })
    .from(pages)
    .where(
      and(
        eq(pages.userId, userId),
        eq(pages.dailyDate, todayDate),
        sql`${pages.parentPageId} IS NULL`,
        sql`${pages.order} > ${meetingsOrder}`
      )
    )
    .orderBy(pages.order)

  // Find the time block and update its title
  let foundTime = false
  let insertAfterOrder = -1
  let timePageId: string | null = null
  for (const p of allPages) {
    if ((p.indent ?? 0) === 0) break // left meetings section
    if ((p.indent ?? 0) === 1 && p.content === meetingStartTime) {
      foundTime = true
      timePageId = p.id
      insertAfterOrder = p.order ?? -1
      continue
    }
    if (foundTime) {
      if ((p.indent ?? 0) <= 1) break // next time block or section
      insertAfterOrder = p.order ?? insertAfterOrder
    }
  }

  // Update the timestamp line to include the meeting title (e.g., "10:07 - Reunión de prueba")
  if (timePageId && summary.titulo) {
    await db.execute(sql`
      UPDATE pages SET content = ${meetingStartTime + ' - ' + summary.titulo}, updated_at = ${now}
      WHERE id = ${timePageId}
    `)
  }

  if (insertAfterOrder < 0) {
    console.error('Could not find meeting time block for summary insertion')
    return
  }

  // Build summary pages: summary(2), resumen(3), detalle(3), accionables(3), items(4)
  const summaryPages = [
    { content: 'summary', indent: 2 },
    { content: summary.resumen, indent: 3 },
    { content: summary.detalle, indent: 3 },
    { content: 'accionables', indent: 3 },
    ...summary.accionables.map(a => ({ content: `- ${a}`, indent: 4 })),
  ]

  const insertOrder = insertAfterOrder + 1
  const shiftCount = summaryPages.length

  // Shift pages to make room
  await db.execute(sql`
    UPDATE pages SET "order" = "order" + ${shiftCount}
    WHERE user_id = ${userId} AND daily_date = ${todayDate}
    AND parent_page_id IS NULL AND "order" >= ${insertOrder}
  `)

  // Insert summary pages
  for (let i = 0; i < summaryPages.length; i++) {
    await db.insert(pages).values(
      pageRow(userId, todayDate, summaryPages[i].content, summaryPages[i].indent, insertOrder + i, now)
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Read audio
    const formData = await request.formData()
    const audioFile = formData.get('audio') as Blob | null
    if (!audioFile) {
      return NextResponse.json({ success: false, error: 'No audio file' }, { status: 400 })
    }

    // 3. Call Whisper API
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const whisperForm = new FormData()
    whisperForm.append('file', audioFile, 'recording.webm')
    whisperForm.append('model', 'whisper-1')
    whisperForm.append('language', 'es')

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: whisperForm,
    })

    if (!whisperRes.ok) {
      const err = await whisperRes.text()
      console.error('Whisper API error:', err)
      return NextResponse.json({ success: false, error: 'Whisper API failed' }, { status: 502 })
    }

    const { text } = await whisperRes.json()
    if (!text || !text.trim()) {
      return NextResponse.json({ success: false, error: 'No speech detected' }, { status: 400 })
    }

    // 4. Create notes in DB
    const todayDate = today()
    const userId = session.id
    const now = Date.now()

    const isChunk = formData.get('isChunk') === 'true'
    const isFinal = formData.get('isFinal') === 'true'
    const meetingStartTime = formData.get('meetingStartTime') as string | null

    if (isChunk && meetingStartTime) {
      // Append to existing transcription for this meeting
      const existingMeetings = await db
        .select()
        .from(pages)
        .where(
          and(
            eq(pages.userId, userId),
            eq(pages.dailyDate, todayDate),
            eq(pages.content, 'meetings'),
            eq(pages.indent, 0),
            sql`${pages.parentPageId} IS NULL`
          )
        )
        .limit(1)

      if (existingMeetings.length > 0) {
        const meetingsOrder = existingMeetings[0].order ?? 0
        const childPages = await db
          .select({ id: pages.id, order: pages.order, indent: pages.indent, content: pages.content })
          .from(pages)
          .where(
            and(
              eq(pages.userId, userId),
              eq(pages.dailyDate, todayDate),
              sql`${pages.parentPageId} IS NULL`,
              sql`${pages.order} > ${meetingsOrder}`
            )
          )
          .orderBy(pages.order)

        // Find the transcription text page (indent 3, after "transcription" label at indent 2)
        let transcriptionPageId: string | null = null
        let transcriptionContent: string | null = null
        let foundTime = false
        let foundTranscriptionLabel = false
        for (const p of childPages) {
          if ((p.indent ?? 0) === 0) break
          if ((p.indent ?? 0) === 1 && p.content === meetingStartTime) {
            foundTime = true
            continue
          }
          if (foundTime && (p.indent ?? 0) === 2 && p.content === 'transcription') {
            foundTranscriptionLabel = true
            continue
          }
          if (foundTranscriptionLabel && (p.indent ?? 0) === 3) {
            transcriptionPageId = p.id
            transcriptionContent = p.content
            break
          }
          if (foundTime && (p.indent ?? 0) <= 1) break
        }

        if (transcriptionPageId && transcriptionContent !== null) {
          const fullText = transcriptionContent + ' ' + text.trim()
          await db
            .update(pages)
            .set({ content: fullText, updatedAt: now })
            .where(eq(pages.id, transcriptionPageId))

          // If final, generate summary async
          if (isFinal) {
            generateSummary(apiKey, fullText).then(async (summary) => {
              if (summary) {
                try {
                  await saveSummaryPages(userId, todayDate, meetingsOrder, meetingStartTime, summary, apiKey)
                } catch (err) {
                  console.error('Failed to save summary pages:', err)
                }
              }
            }).catch(err => console.error('Summary generation error:', err))
          }

          return NextResponse.json({ success: true, text: text.trim(), appended: true })
        }
      }
      // Fall through to create new
    }

    // Get current time in Santiago timezone
    const timeStr = meetingStartTime || new Date().toLocaleTimeString('en-GB', {
      timeZone: 'America/Santiago',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    // Find or create "meetings" heading
    const existingMeetings = await db
      .select()
      .from(pages)
      .where(
        and(
          eq(pages.userId, userId),
          eq(pages.dailyDate, todayDate),
          eq(pages.content, 'meetings'),
          eq(pages.indent, 0),
          sql`${pages.parentPageId} IS NULL`
        )
      )
      .limit(1)

    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${pages.order}), -1)` })
      .from(pages)
      .where(
        and(
          eq(pages.userId, userId),
          eq(pages.dailyDate, todayDate),
          sql`${pages.parentPageId} IS NULL`
        )
      )

    let insertOrder: number
    let meetingsOrder: number

    if (existingMeetings.length > 0) {
      meetingsOrder = existingMeetings[0].order ?? 0
      const allPages = await db
        .select({ id: pages.id, order: pages.order, indent: pages.indent })
        .from(pages)
        .where(
          and(
            eq(pages.userId, userId),
            eq(pages.dailyDate, todayDate),
            sql`${pages.parentPageId} IS NULL`,
            sql`${pages.order} > ${meetingsOrder}`
          )
        )
        .orderBy(pages.order)

      let lastChildOrder = meetingsOrder
      for (const p of allPages) {
        if ((p.indent ?? 0) > 0) {
          lastChildOrder = p.order ?? lastChildOrder
        } else {
          break
        }
      }
      insertOrder = lastChildOrder + 1

      // Shift: HH:MM(1) + transcription(2) + text(3) = 3 pages
      await db.execute(sql`
        UPDATE pages SET "order" = "order" + 3
        WHERE user_id = ${userId} AND daily_date = ${todayDate}
        AND parent_page_id IS NULL AND "order" >= ${insertOrder}
      `)
    } else {
      const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1
      meetingsOrder = nextOrder
      await db.insert(pages).values(pageRow(userId, todayDate, 'meetings', 0, nextOrder, now))
      insertOrder = nextOrder + 1
    }

    // Create HH:MM (indent 1)
    await db.insert(pages).values(pageRow(userId, todayDate, timeStr, 1, insertOrder, now))

    // Create "transcription" label (indent 2)
    await db.insert(pages).values(pageRow(userId, todayDate, 'transcription', 2, insertOrder + 1, now))

    // Create transcription text (indent 3)
    await db.insert(pages).values(pageRow(userId, todayDate, text.trim(), 3, insertOrder + 2, now))

    // If final (non-chunked or single recording), generate summary async
    if (isFinal) {
      generateSummary(apiKey, text.trim()).then(async (summary) => {
        if (summary) {
          try {
            await saveSummaryPages(userId, todayDate, meetingsOrder, timeStr, summary, apiKey)
          } catch (err) {
            console.error('Failed to save summary pages:', err)
          }
        }
      }).catch(err => console.error('Summary generation error:', err))
    }

    return NextResponse.json({ success: true, text: text.trim() })
  } catch (error) {
    console.error('Transcribe error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
