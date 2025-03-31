"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { BatchTranslationDialog } from "@/components/batch-translation-dialog"
import { Upload } from "lucide-react"

const FileUpload = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [fileName, setFileName] = useState("")
  const [progress, setProgress] = useState(0)
  const [translatedFileUrl, setTranslatedFileUrl] = useState<string>()

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setIsDialogOpen(true)
    setProgress(0)
    setTranslatedFileUrl(undefined)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/translate-excel", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Translation failed")
      }

      // Create a blob from the response
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setTranslatedFileUrl(url)
      setProgress(100)
    } catch (error) {
      console.error("Error uploading file:", error)
      setProgress(0)
    }
  }

  return (
    <>
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2 text-gray-500" />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">Excel files only</p>
          </div>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      <BatchTranslationDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        fileName={fileName}
        progress={progress}
        translatedFileUrl={translatedFileUrl}
      />
    </>
  )
}

export default FileUpload 