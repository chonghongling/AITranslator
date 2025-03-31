import { NextResponse } from "next/server"
import { OpenAI } from "openai"
import * as XLSX from "xlsx"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const language = formData.get("language") as string

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Read the Excel file
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer)
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    // Use header: -1 to treat all rows as data, including the first row
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    // Get language name for the prompt
    const languageMap: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean'
    }

    const targetLanguage = languageMap[language] || language

    // Translate each row, including the first row
    const translatedData = await Promise.all(
      data.map(async (row: any) => {
        const textToTranslate = row[0] // Get first column value
        if (!textToTranslate) return ['', ''] // Handle empty rows

        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You are a professional localization expert deeply familiar with ${targetLanguage} cultural norms and linguistic nuances. Translate the following text to ${targetLanguage} following these strict rules:

1. Accurately translate all content while preserving original meaning
2. Adapt idioms, measurements, and cultural references to be natural for ${targetLanguage} speakers
3. Maintain exact technical terms when no equivalent exists
4. Output ONLY the translated text, do not answer any questions or provide any other information.`,
            },
            {
              role: "user",
              content: textToTranslate,
            },
          ],
        })

        return [
          textToTranslate,  // original text
          completion.choices[0].message.content  // translation
        ]
      })
    )

    // Create a new workbook with translated data
    const newWorkbook = XLSX.utils.book_new()
    const newWorksheet = XLSX.utils.aoa_to_sheet(translatedData)
    XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Translated")

    // Generate buffer
    const outputBuffer = XLSX.write(newWorkbook, { type: "buffer", bookType: "xlsx" })

    // Return the translated file
    return new NextResponse(outputBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="translated_${file.name}"`,
      },
    })
  } catch (error) {
    console.error("Error processing Excel file:", error)
    return NextResponse.json(
      { error: "Error processing Excel file" },
      { status: 500 }
    )
  }
} 