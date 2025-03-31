import { NextResponse } from 'next/server'

const INFINI_API_URL = 'https://cloud.infini-ai.com/maas/v1/chat/completions'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    if (!body.message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const language = body.language || 'en'
    const systemPrompt = `You are a professional translator, high proficiency in ${language}. Translate user input into ${language}. Output only the translation`

    const response = await fetch(INFINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INFINI_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-v3",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: body.message
          }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Infini API error:', error)
      return NextResponse.json(
        { error: 'Failed to get AI response' },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Format the response to match what the frontend expects
    return NextResponse.json({
      messages: [
        {
          role: 'user',
          content: body.message
        },
        {
          role: 'assistant',
          content: data.choices[0]?.message?.content || ''
        }
      ]
    })
  } catch (error) {
    console.error('Error in chat:', error)
    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    )
  }
} 