'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface EventTabsProps {
  eventId: string
}

const tabs = [
  { href: '', label: 'Overview' },
  { href: '/attendees', label: 'Attendees' },
  { href: '/questions', label: 'Questions' },
  { href: '/conversations', label: 'Conversations' },
  { href: '/matches', label: 'Matches' },
  { href: '/analytics', label: 'Analytics' },
]

export function EventTabs({ eventId }: EventTabsProps) {
  const pathname = usePathname()
  const basePath = `/dashboard/events/${eventId}`

  return (
    <div className="border-b border-gray-800">
      <nav className="flex gap-4">
        {tabs.map((tab) => {
          const href = `${basePath}${tab.href}`
          const isActive = pathname === href ||
            (tab.href === '' && pathname === basePath)

          return (
            <Link
              key={tab.href}
              href={href}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-pink-500 text-pink-500'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
