"use client"

import { Mic, MicOff, Video, VideoOff } from "lucide-react"

interface Participant {
  id: string
  name: string
  isLocal?: boolean
  isMuted?: boolean
  isVideoOff?: boolean
}

interface ParticipantsListProps {
  participants: Participant[]
}

export default function ParticipantsList({ participants }: ParticipantsListProps) {
  return (
    <div className="w-80 border-l bg-white flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold">Participants ({participants.length})</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {participants.map((participant) => (
          <div key={participant.id} className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                {participant.name.charAt(0)}
              </div>
              <span>
                {participant.name} {participant.isLocal && "(Vous)"}
              </span>
            </div>

            <div className="flex space-x-2">
              {participant.isMuted ? (
                <MicOff className="h-4 w-4 text-red-500" />
              ) : (
                <Mic className="h-4 w-4 text-gray-500" />
              )}

              {participant.isVideoOff ? (
                <VideoOff className="h-4 w-4 text-red-500" />
              ) : (
                <Video className="h-4 w-4 text-gray-500" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
