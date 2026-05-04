'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useDebounce } from '@/hooks/useDebounce'
import { X, Plus } from 'lucide-react'

interface InterestsInputProps {
  onInterestsChange: (interests: string) => void
}

export default function InterestsInput({ onInterestsChange }: InterestsInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const debouncedSearchTerm = useDebounce(inputValue, 300)
  const supabase = createClient()

  useEffect(() => {
    if (debouncedSearchTerm) {
      fetchSuggestions(debouncedSearchTerm)
    } else {
      setSuggestions([])
    }
  }, [debouncedSearchTerm])

  useEffect(() => {
    onInterestsChange(selectedInterests.join(','))
  }, [selectedInterests])

  const fetchSuggestions = async (searchTerm: string) => {
    try {
      const { data, error } = await supabase
        .from('interests')
        .select('interest_name')
        .ilike('interest_name', `%${searchTerm}%`)
        .limit(5)

      if (error) throw error
      setSuggestions(data.map((i: any) => i.interest_name))
    } catch (error) {
      console.error('Error fetching interests:', error)
    }
  }

  const handleSelectInterest = (interest: string) => {
    if (!selectedInterests.includes(interest)) {
      setSelectedInterests([...selectedInterests, interest])
    }
    setInputValue('')
    setSuggestions([])
  }

  const handleRemoveInterest = (interestToRemove: string) => {
    setSelectedInterests(selectedInterests.filter(interest => interest !== interestToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      handleSelectInterest(inputValue.trim())
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selectedInterests.map((interest, index) => (
          <div
            key={index}
            className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
          >
            <span>{interest}</span>
            <button
              onClick={() => handleRemoveInterest(interest)}
              className="text-blue-500 hover:text-blue-700"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type to search interests..."
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />

        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 mt-1 max-h-48 overflow-y-auto">
            {suggestions.map((item, index) => (
              <button
                key={index}
                onClick={() => handleSelectInterest(item)}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">Select interests for targeting your survey audience.</p>
    </div>
  )
}