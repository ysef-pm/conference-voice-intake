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
