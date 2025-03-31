"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface BatchTranslationDialogProps {
  isOpen: boolean
  onClose: () => void
  fileName: string
  progress: number
  translatedFileUrl?: string
}

export function BatchTranslationDialog({
  isOpen,
  onClose,
  fileName,
  progress,
  translatedFileUrl,
}: BatchTranslationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Batch Translation Progress</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">File: {fileName}</p>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {progress < 100 ? "Translating..." : "Translation complete!"}
            </p>
          </div>
          {translatedFileUrl && (
            <Button
              className="w-full"
              onClick={() => window.open(translatedFileUrl, "_blank")}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Translated File
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 