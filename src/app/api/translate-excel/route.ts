import { NextResponse } from "next/server"
import { OpenAI } from "openai"
import * as XLSX from "xlsx"

// Verify API key is available
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.error("OpenAI API key is not configured")
}

const openai = new OpenAI({
  apiKey: apiKey,
})

// Remove edge runtime config as it might be causing issues
// export const config = {
//   runtime: 'edge',
//   maxDuration: 60,
// }

export async function POST(req: Request) {
  try {
    console.log("Starting Excel translation process...")
    
    // Validate API key first
    if (!apiKey) {
      console.error("OpenAI API key missing")
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      )
    }

    console.log("Parsing form data...")
    const formData = await req.formData()
    const file = formData.get("file") as File
    const language = formData.get("language") as string

    console.log(`Received file: ${file?.name}, size: ${file?.size}, language: ${language}`)

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Check file size (limit to 5MB for safety)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Please upload a file smaller than 5MB" },
        { status: 400 }
      )
    }

    console.log("Reading Excel file...")
    // Read the Excel file using a more compatible approach
    const buffer = await file.arrayBuffer()
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' }) // Changed from 'array' to 'buffer'
      
      if (!workbook.SheetNames.length) {
        console.error("No sheets found in Excel file")
        return NextResponse.json(
          { error: "Invalid Excel file or no sheets found" },
          { status: 400 }
        )
      }
      
      console.log(`Excel file parsed successfully. Sheets: ${workbook.SheetNames.join(", ")}`)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]
      console.log(`Found ${data.length} rows in Excel file`)

      // Limit number of rows to translate (to avoid timeouts)
      const MAX_ROWS = 50 // Reduced from 100 to 50 for faster processing
      const truncatedData = data.slice(0, MAX_ROWS)
      
      if (data.length > MAX_ROWS) {
        console.warn(`File has ${data.length} rows, but only processing first ${MAX_ROWS} rows due to time constraints`)
      }

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
      console.log(`Translating to: ${targetLanguage}`)

      // Process rows sequentially instead of in parallel to avoid rate limits
      const translatedData: string[][] = []
      
      for (let i = 0; i < truncatedData.length; i++) {
        const row = truncatedData[i]
        console.log(`Processing row ${i+1}/${truncatedData.length}`)
        
        try {
          const textToTranslate = row[0] // Get first column value
          if (!textToTranslate || typeof textToTranslate !== 'string') {
            translatedData.push(['', '']) // Handle empty or non-string rows
            continue
          }

          // Limit text length to prevent API issues
          const maxLength = 500 // Reduced from 1000 to 500
          const truncatedText = textToTranslate.substring(0, maxLength)
          if (textToTranslate.length > maxLength) {
            console.warn(`Row ${i} truncated from ${textToTranslate.length} to ${maxLength} characters`)
          }

          console.log(`Calling OpenAI API for row ${i+1}...`)
          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: `Translate the following text to ${targetLanguage}. Output ONLY the translated text.`,
              },
              {
                role: "user",
                content: truncatedText,
              },
            ],
            max_tokens: 500, // Reduced from 1000 to 500
            temperature: 0.3,
          })

          const translatedText = completion.choices[0]?.message?.content || 'Translation error'
          console.log(`Row ${i+1} translated successfully`)
          
          translatedData.push([
            textToTranslate,  // original text
            translatedText    // translation
          ])
        } catch (error) {
          console.error(`Error translating row ${i}:`, error)
          translatedData.push([row[0] || '', 'Translation error'])
        }
      }

      console.log("Creating output Excel file...")
      // Create a new workbook with translated data
      const newWorkbook = XLSX.utils.book_new()
      const newWorksheet = XLSX.utils.aoa_to_sheet(translatedData)
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Translated")

      // Generate buffer with a different approach
      console.log("Generating Excel buffer...")
      const outputBuffer = XLSX.write(newWorkbook, { type: "buffer", bookType: "xlsx" })
      console.log("Excel buffer generated successfully, size:", outputBuffer.byteLength)

      console.log("Translation complete, returning file...")
      // Return the translated file
      return new NextResponse(outputBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="translated_${file.name}"`,
        },
      })
    } catch (xlsxError: unknown) {
      console.error("XLSX parsing error:", xlsxError)
      let errorMessage = "Failed to parse Excel file";
      if (xlsxError instanceof Error) {
        errorMessage = `Failed to parse Excel file: ${xlsxError.message}`;
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }
  } catch (error) {
    // Detailed error logging
    console.error("Error processing Excel file:", error)
    
    // Return more specific error message if possible
    let errorMessage = "Error processing Excel file"
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack)
      errorMessage = `Error: ${error.message}`
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
} 