"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

export function Sidebar() {
  return (
    <div className="w-[300px] h-full bg-slate-50 border-r">
      <div className="flex flex-col h-full">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">AI Translator</h2>
            <Button variant="outline" size="sm">
              New Chat
            </Button>
          </div>
        </div>
        <Separator />
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start text-left" size="sm">
              Chat 1
            </Button>
            <Button variant="ghost" className="w-full justify-start text-left" size="sm">
              Chat 2
            </Button>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
} 