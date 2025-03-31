"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import LanguageSelector, { languages } from './language-selector'
import { Upload, Download } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import React from "react"

interface Message {
  role: 'user' | 'assistant'
  content: string
  type?: 'text' | 'excel' | 'progress'
  progress?: number
  fileName?: string
  translatedFileUrl?: string
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage, type: 'text' }])

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          language: selectedLanguage
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      // Only add the AI's response message
      const aiMessage = data.messages[data.messages.length - 1]
      setMessages(prev => [...prev, { ...aiMessage, type: 'text' }])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an error processing your request.',
        type: 'text'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" && 
        file.type !== "application/vnd.ms-excel") {
      alert("Please upload an Excel file (.xlsx or .xls)")
      return
    }

    // Add file upload message
    setMessages(prev => [...prev, {
      role: 'user',
      content: `Uploaded file: ${file.name}`,
      type: 'excel',
      fileName: file.name
    }])

    // Add progress message
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Translating Excel file to ${languages.find(l => l.code === selectedLanguage)?.native || selectedLanguage}...`,
      type: 'progress',
      progress: 0
    }])

    const formData = new FormData()
    formData.append("file", file)
    formData.append("language", selectedLanguage)

    try {
      const response = await fetch("/api/translate-excel", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Translation failed")
      }

      // Update progress to 100%
      setMessages(prev => prev.map(msg => 
        msg.type === 'progress' ? { ...msg, progress: 100 } : msg
      ))

      // Create a blob from the response
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      // Add download message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Translation complete!',
        type: 'text',
        translatedFileUrl: url
      }])
    } catch (error) {
      console.error("Error uploading file:", error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an error processing your Excel file.',
        type: 'text'
      }])
    } finally {
      // Reset the file input so it can accept another file
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto px-4 py-8">
        <Card className="flex-1 shadow-lg flex flex-col">
          <div className="p-4 border-b">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">AI Translator</h1>
                <LanguageSelector 
                  value={selectedLanguage} 
                  onValueChange={setSelectedLanguage} 
                />
              </div>
              <div className="text-sm text-gray-600 space-y-2">
                <h2 className="font-semibold">How to use:</h2>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Select your target language from the dropdown menu</li>
                  <li>Type text directly in the chat for instant translation</li>
                  <li>Or upload an Excel file for batch translation:
                    <ul className="list-circle pl-5 mt-1 space-y-1">
                      <li>File must be in .xlsx or .xls format</li>
                      <li>Text to translate should be in the first column</li>
                      <li>Translated text will be added as a new column</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex-1 p-4 flex flex-col">
            <ScrollArea className="flex-1 min-h-[600px] pr-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  {message.type === 'progress' ? (
                    <div className="inline-block p-3 rounded-lg bg-gray-100 text-gray-900">
                      <p className="mb-2">{message.content}</p>
                      <Progress value={message.progress} className="w-[200px]" />
                    </div>
                  ) : message.type === 'excel' ? (
                    <div className="inline-block p-3 rounded-lg bg-blue-500 text-white">
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        <span>{message.content}</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`inline-block p-3 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="flex flex-col">
                        {message.content}
                        {message.translatedFileUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full bg-white hover:bg-gray-50"
                            onClick={() => window.open(message.translatedFileUrl, "_blank")}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Translated File
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </ScrollArea>
            
            <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1"
              />
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="flex items-center gap-2 px-3"
                  onClick={handleUploadClick}
                  disabled={isLoading}
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Upload Excel</span>
                </Button>
                <Button type="submit" disabled={isLoading}>
                  Send
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Chat 