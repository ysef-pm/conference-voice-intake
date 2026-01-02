'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, FileSpreadsheet } from 'lucide-react'

interface CSVUploadProps {
  eventId: string
  onUploadComplete: () => void
}

export function CSVUpload({ eventId, onUploadComplete }: CSVUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`/api/events/${eventId}/import-csv`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      onUploadComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
      <FileSpreadsheet className="w-12 h-12 text-gray-600 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">Import Attendees</h3>
      <p className="text-sm text-gray-400 mb-4">
        Upload a CSV file with columns: email, name (optional), phone (optional)
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
        id="csv-upload"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="bg-pink-500 hover:bg-pink-600"
      >
        <Upload className="w-4 h-4 mr-2" />
        {uploading ? 'Uploading...' : 'Upload CSV'}
      </Button>
      {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
    </div>
  )
}
