import Chat from "@/components/chat"

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-between min-h-screen p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-center">AI Translator</h1>
          <p className="text-center text-muted-foreground">
            Chat with the AI translator or upload an Excel file for batch translation
          </p>
        </div>
        <Chat />
      </div>
    </main>
  )
}
