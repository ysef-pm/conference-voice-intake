'use client'

import { Attendee } from '@/types/database'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface AttendeeTableProps {
  attendees: Attendee[]
}

const statusColors: Record<string, string> = {
  imported: 'bg-gray-500',
  contacted: 'bg-blue-500',
  scheduled: 'bg-yellow-500',
  clicked: 'bg-purple-500',
  in_progress: 'bg-orange-500',
  completed: 'bg-green-500',
  matched: 'bg-pink-500',
}

export function AttendeeTable({ attendees }: AttendeeTableProps) {
  return (
    <div className="rounded-lg border border-gray-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-800 hover:bg-gray-900">
            <TableHead className="text-gray-400">Name</TableHead>
            <TableHead className="text-gray-400">Email</TableHead>
            <TableHead className="text-gray-400">Phone</TableHead>
            <TableHead className="text-gray-400">Status</TableHead>
            <TableHead className="text-gray-400">Scheduled</TableHead>
            <TableHead className="text-gray-400">Completed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendees.map((attendee) => (
            <TableRow key={attendee.id} className="border-gray-800 hover:bg-gray-900">
              <TableCell className="text-white">
                {attendee.name || '-'}
              </TableCell>
              <TableCell className="text-gray-400">
                {attendee.email}
              </TableCell>
              <TableCell className="text-gray-400">
                {attendee.phone ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    </svg>
                    {attendee.phone}
                  </span>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </TableCell>
              <TableCell>
                <Badge className={`${statusColors[attendee.status]} text-white`}>
                  {attendee.status}
                </Badge>
              </TableCell>
              <TableCell className="text-gray-400">
                {attendee.scheduled_at
                  ? new Date(attendee.scheduled_at).toLocaleDateString()
                  : '-'}
              </TableCell>
              <TableCell className="text-gray-400">
                {attendee.completed_at
                  ? new Date(attendee.completed_at).toLocaleDateString()
                  : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
