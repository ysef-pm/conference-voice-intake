'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Question } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, GripVertical, Trash2, Save, Loader2 } from 'lucide-react'

export default function QuestionsPage() {
  const params = useParams()
  const eventId = params.id as string
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchQuestions = async () => {
      const { data } = await supabase
        .from('events')
        .select('questions')
        .eq('id', eventId)
        .single()

      if (data?.questions) {
        setQuestions(data.questions as Question[])
      }
      setLoading(false)
    }
    fetchQuestions()
  }, [eventId, supabase])

  const addQuestion = () => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      field: `question_${questions.length + 1}`,
      label: '',
      order: questions.length,
    }
    setQuestions([...questions, newQuestion])
    setHasChanges(true)
  }

  const updateQuestion = (id: string, label: string) => {
    setQuestions(questions.map(q =>
      q.id === id ? { ...q, label } : q
    ))
    setHasChanges(true)
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id).map((q, i) => ({
      ...q,
      order: i,
    })))
    setHasChanges(true)
  }

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= questions.length) return

    const newQuestions = [...questions]
    const temp = newQuestions[index]
    newQuestions[index] = newQuestions[newIndex]
    newQuestions[newIndex] = temp

    setQuestions(newQuestions.map((q, i) => ({ ...q, order: i })))
    setHasChanges(true)
  }

  const saveQuestions = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('events')
      .update({ questions })
      .eq('id', eventId)

    if (!error) {
      setHasChanges(false)
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="text-gray-400">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">Intake Questions</h3>
          <p className="text-sm text-gray-400">
            Customize the questions attendees answer during intake
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={addQuestion}
            variant="outline"
            className="border-gray-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
          <Button
            onClick={saveQuestions}
            disabled={!hasChanges || saving}
            className="bg-pink-500 hover:bg-pink-600"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">
            Questions ({questions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {questions.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No questions yet. Add your first question to get started.
            </p>
          ) : (
            questions.map((question, index) => (
              <div
                key={question.id}
                className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg"
              >
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveQuestion(index, 'up')}
                    disabled={index === 0}
                    className="text-gray-500 hover:text-white disabled:opacity-30"
                  >
                    <GripVertical className="w-4 h-4 rotate-180" />
                  </button>
                  <button
                    onClick={() => moveQuestion(index, 'down')}
                    disabled={index === questions.length - 1}
                    className="text-gray-500 hover:text-white disabled:opacity-30"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-pink-500 font-medium w-8">
                  {index + 1}.
                </span>
                <Input
                  value={question.label}
                  onChange={(e) => updateQuestion(question.id, e.target.value)}
                  placeholder="Enter your question..."
                  className="flex-1 bg-gray-900 border-gray-700"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQuestion(question.id)}
                  className="text-gray-500 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
