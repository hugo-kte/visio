"use client"

import { useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { MicOff } from "lucide-react"

interface VideoDisplayProps {
  stream: MediaStream
  isMuted?: boolean
  isLocal?: boolean
}

export default function VideoDisplay({ stream, isMuted = false, isLocal = false }: VideoDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <Card className="relative overflow-hidden rounded-lg">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal || isMuted}
        className={`w-full h-full object-cover ${isLocal ? "transform scale-x-[-1]" : ""}`}
      />
      <div className="absolute bottom-2 left-2 flex items-center space-x-2 bg-black/50 text-white px-2 py-1 rounded-md text-sm">
        {isLocal ? "Vous" : "Participant"}
        {isMuted && !isLocal && <MicOff className="h-4 w-4 text-red-500" />}
      </div>
    </Card>
  )
}
