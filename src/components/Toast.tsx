'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, X } from 'lucide-react'

interface ToastProps {
  message: string
  isVisible: boolean
  onClose: () => void
  type?: 'success' | 'error'
}

export default function Toast({ message, isVisible, onClose, type = 'success' }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  if (!isVisible) return null

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className={`
        flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border
        ${type === 'success' 
          ? 'bg-white border-green-100 text-green-800' 
          : 'bg-white border-red-100 text-red-800'}
      `}>
        <CheckCircle2 className={type === 'success' ? 'text-green-500' : 'text-red-500'} size={24} />
        <p className="font-bold text-sm">{message}</p>
        <button 
          onClick={onClose}
          className="ml-4 p-1 hover:bg-gray-50 rounded-lg transition-colors text-gray-400"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
