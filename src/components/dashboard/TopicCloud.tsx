'use client'

import { useState } from 'react'

interface TopicCount {
  topic: string
  count: number
}

interface TopicCloudProps {
  topics: TopicCount[]
  maxTopics?: number
}

export function TopicCloud({ topics, maxTopics = 30 }: TopicCloudProps) {
  const [hoveredTopic, setHoveredTopic] = useState<string | null>(null)

  // Limit to maxTopics
  const displayTopics = topics.slice(0, maxTopics)

  if (displayTopics.length === 0) {
    return null
  }

  // Calculate min and max for scaling
  const maxCount = Math.max(...displayTopics.map(t => t.count))
  const minCount = Math.min(...displayTopics.map(t => t.count))
  const countRange = maxCount - minCount || 1

  // Calculate size based on count (scale from 0.75 to 2)
  const getSize = (count: number): number => {
    const normalized = (count - minCount) / countRange
    return 0.75 + (normalized * 1.25)
  }

  // Get color intensity based on count
  const getColorClass = (count: number): string => {
    const normalized = (count - minCount) / countRange
    if (normalized > 0.8) return 'bg-pink-500 text-white'
    if (normalized > 0.6) return 'bg-pink-600 text-white'
    if (normalized > 0.4) return 'bg-pink-700 text-white'
    if (normalized > 0.2) return 'bg-pink-800 text-pink-100'
    return 'bg-pink-900 text-pink-200'
  }

  return (
    <div className="relative">
      {/* Tag Cloud View */}
      <div className="flex flex-wrap gap-2 justify-center py-4">
        {displayTopics.map((item) => {
          const size = getSize(item.count)
          const isHovered = hoveredTopic === item.topic

          return (
            <div
              key={item.topic}
              className={`
                relative px-3 py-1.5 rounded-full cursor-pointer
                transition-all duration-200 ease-out
                ${getColorClass(item.count)}
                ${isHovered ? 'ring-2 ring-pink-400 ring-offset-2 ring-offset-gray-900 scale-110 z-10' : ''}
              `}
              style={{
                fontSize: `${size}rem`,
              }}
              onMouseEnter={() => setHoveredTopic(item.topic)}
              onMouseLeave={() => setHoveredTopic(null)}
            >
              <span className="capitalize font-medium whitespace-nowrap">
                {item.topic}
              </span>

              {/* Tooltip */}
              {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-sm rounded shadow-lg whitespace-nowrap z-20 pointer-events-none">
                  {item.count} mention{item.count !== 1 ? 's' : ''}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Horizontal Bar Chart (alternative view for top topics) */}
      <div className="mt-6 pt-6 border-t border-gray-800">
        <h4 className="text-sm font-medium text-gray-400 mb-4">Topic Frequency</h4>
        <div className="space-y-2">
          {displayTopics.slice(0, 15).map((item) => {
            const percentage = (item.count / maxCount) * 100
            const isHovered = hoveredTopic === item.topic

            return (
              <div
                key={`bar-${item.topic}`}
                className={`
                  flex items-center gap-3 group cursor-pointer
                  transition-opacity duration-200
                  ${hoveredTopic && !isHovered ? 'opacity-50' : 'opacity-100'}
                `}
                onMouseEnter={() => setHoveredTopic(item.topic)}
                onMouseLeave={() => setHoveredTopic(null)}
              >
                <span className="text-sm text-gray-300 w-32 truncate capitalize group-hover:text-white transition-colors">
                  {item.topic}
                </span>
                <div className="flex-1 h-6 bg-gray-800 rounded-md overflow-hidden">
                  <div
                    className={`
                      h-full rounded-md transition-all duration-300 flex items-center justify-end px-2
                      ${isHovered ? 'bg-pink-400' : 'bg-gradient-to-r from-pink-600 to-pink-500'}
                    `}
                    style={{ width: `${percentage}%` }}
                  >
                    <span className="text-xs text-white font-medium">
                      {item.count}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
