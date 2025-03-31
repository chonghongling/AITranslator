import { Chat } from "@/components/chat"
import { Sidebar } from "@/components/sidebar"

export default function Home() {
  return (
    <main className="flex h-full">
      <Sidebar />
      <div className="flex-1">
        <Chat />
      </div>
    </main>
  )
}
