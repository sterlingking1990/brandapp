'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  MessageSquare, 
  Globe, 
  Play,
  Calendar,
  Maximize2,
  Trash2,
  MoreHorizontal
} from 'lucide-react'

interface MediaCarouselModalProps {
  isVisible: boolean
  onClose: () => void
  mediaItems: any[]
  initialIndex: number
  onDelete?: (id: string) => void
  onPromote?: (media: any) => void
}

export default function MediaCarouselModal({
  isVisible,
  onClose,
  mediaItems,
  initialIndex,
  onDelete,
  onPromote
}: MediaCarouselModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex, isVisible])

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % mediaItems.length)
  }

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') goToNext()
    if (e.key === 'ArrowLeft') goToPrev()
    if (e.key === 'Escape') onClose()
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, isVisible])

  if (!isVisible || mediaItems.length === 0) return null

  const currentMedia = mediaItems[currentIndex]

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Top Header Actions */}
      <div className="absolute top-0 left-0 right-0 h-20 px-8 flex items-center justify-between z-[160] bg-gradient-to-b from-black/60 to-transparent">
         <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center text-brand">
               <Globe size={20} />
            </div>
            <div>
               <p className="text-white font-bold text-sm">Media Preview</p>
               <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Item {currentIndex + 1} of {mediaItems.length}</p>
            </div>
         </div>
         <div className="flex items-center gap-4">
            {onDelete && (
              <button 
                onClick={() => onDelete(currentMedia.id)}
                className="h-11 w-11 rounded-xl bg-white/10 text-white/60 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button 
              onClick={onClose}
              className="h-11 w-11 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center"
            >
              <X size={24} />
            </button>
         </div>
      </div>

      {/* Navigation Arrows */}
      <button 
        onClick={goToPrev}
        className="absolute left-8 h-14 w-14 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center z-[160] border border-white/5 group"
      >
        <ChevronLeft size={32} className="group-hover:-translate-x-0.5 transition-transform" />
      </button>

      <button 
        onClick={goToNext}
        className="absolute right-8 h-14 w-14 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center z-[160] border border-white/5 group"
      >
        <ChevronRight size={32} className="group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* Main Content Area */}
      <div className="w-full max-w-7xl h-full flex flex-col lg:flex-row items-center justify-center p-8 lg:p-20 gap-12">
         {/* Media View */}
         <div className="flex-1 w-full h-full max-h-[70vh] lg:max-h-full flex items-center justify-center relative rounded-[3rem] overflow-hidden bg-black/40 border border-white/5">
            {currentMedia.media_type === 'video' ? (
              <video 
                key={currentMedia.media_url}
                src={currentMedia.media_url}
                className="max-h-full max-w-full object-contain"
                controls
                autoPlay
              />
            ) : (
              <img 
                src={currentMedia.media_url} 
                className="max-h-full max-w-full object-contain animate-in zoom-in-95 duration-500"
                alt=""
              />
            )}
         </div>

         {/* Info Sidebar (Desktop) */}
         <div className="hidden lg:flex w-[400px] flex-col h-fit bg-white/5 rounded-[3rem] p-10 border border-white/10 backdrop-blur-md">
            <div className="space-y-8">
               <div className="space-y-4">
                  <div className="flex items-center gap-2 text-brand">
                     <MessageSquare size={16} />
                     <span className="text-[10px] font-black uppercase tracking-[0.2em]">Brand Caption</span>
                  </div>
                  <p className="text-white text-lg leading-relaxed font-medium">
                     {currentMedia.caption || "No caption provided for this post."}
                  </p>
               </div>

               <div className="space-y-4 pt-8 border-t border-white/10">
                  <div className="flex items-center gap-2 text-white/40">
                     <Calendar size={16} />
                     <span className="text-[10px] font-black uppercase tracking-[0.2em]">Posted On</span>
                  </div>
                  <p className="text-white font-bold">
                     {new Date(currentMedia.created_at).toLocaleDateString('en-US', { 
                       month: 'long', 
                       day: 'numeric', 
                       year: 'numeric' 
                     })}
                  </p>
               </div>

               {currentMedia.keywords && currentMedia.keywords.length > 0 && (
                  <div className="space-y-4 pt-8 border-t border-white/10">
                     <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Keywords</div>
                     <div className="flex flex-wrap gap-2">
                        {currentMedia.keywords.map((k: string, i: number) => (
                          <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white/60 font-bold uppercase tracking-wider">
                             {k}
                          </span>
                        ))}
                     </div>
                  </div>
               )}
            </div>

            <div className="mt-12 flex gap-4">
               <button 
                 onClick={() => onPromote?.(currentMedia)}
                 className="flex-1 bg-brand text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand/20 hover:scale-[1.02] transition-all"
               >
                  Promote Post
               </button>
            </div>
         </div>
      </div>
      
      {/* Mobile Caption Overaly */}
      <div className="lg:hidden absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between gap-4">
         <p className="text-white text-sm line-clamp-2 leading-relaxed italic flex-1">
            "{currentMedia.caption}"
         </p>
         <button 
            onClick={() => onPromote?.(currentMedia)}
            className="bg-brand text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand/20 active:scale-95 transition-all"
         >
            Promote
         </button>
      </div>
    </div>
  )
}
