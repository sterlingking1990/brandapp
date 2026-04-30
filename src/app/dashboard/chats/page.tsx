'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Search, 
  Send, 
  User, 
  MoreVertical, 
  Phone, 
  Video, 
  Info, 
  CheckCircle2, 
  Clock, 
  Loader2,
  ChevronLeft,
  MessageSquare,
  ShoppingBag,
  ExternalLink,
  PlayCircle,
  X,
  AlertCircle
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import MediaCarouselModal from '@/components/MediaCarouselModal'

export default function ChatMessagesPage() {
  const [chats, setChats] = useState<any[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isProcessingSale, setIsProcessingSale] = useState(false)
  
  // Preview Modal State
  const [showPreview, setShowPreview] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId)
      
      // Subscribe to real-time messages for this chat
      const channel = supabase
        .channel(`chat:${selectedChatId}`)
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages', 
            filter: `chat_id=eq.${selectedChatId}` 
          },
          (payload) => {
            const newMsg = payload.new
            setMessages(prev => {
              const exists = prev.some(m => m.id === newMsg.id)
              if (exists) return prev
              return [...prev, newMsg]
            })
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [selectedChatId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUser(user)

      // Fetch chats where brand_id = user.id
      const { data: chatsData, error } = await supabase
        .from('chats')
        .select(`
          *,
          influencer_profile:influencer_id (
            full_name,
            avatar_url,
            username
          )
        `)
        .eq('brand_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Enrich with last message
      const chatIds = chatsData.map(c => c.id)
      const { data: lastMessages } = await supabase
        .from('messages')
        .select('chat_id, content, created_at, sender_id')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: false })

      const lastMessageMap: Record<string, any> = {}
      lastMessages?.forEach(msg => {
        if (!lastMessageMap[msg.chat_id]) lastMessageMap[msg.chat_id] = msg
      })

      const enrichedChats = chatsData.map(chat => ({
        ...chat,
        last_message: lastMessageMap[chat.id]?.content || 'Start a conversation',
        last_message_time: lastMessageMap[chat.id]?.created_at || chat.created_at,
        is_own_last: lastMessageMap[chat.id]?.sender_id === user.id
      }))

      setChats(enrichedChats)

      // Auto-select chat from URL if present
      const urlChatId = searchParams.get('id')
      if (urlChatId) {
        setSelectedChatId(urlChatId)
      } else if (enrichedChats.length > 0) {
        setSelectedChatId(enrichedChats[0].id)
      }

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (chatId: string) => {
    setMessagesLoading(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedChatId || !currentUser) return

    const msgContent = newMessage.trim()
    setNewMessage('')

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const optimisticMsg = {
      id: tempId,
      chat_id: selectedChatId,
      sender_id: currentUser.id,
      content: msgContent,
      created_at: new Date().toISOString(),
      is_optimistic: true
    }
    setMessages(prev => [...prev, optimisticMsg])

    try {
      const { error } = await supabase.rpc('send_message', {
        p_chat_id: selectedChatId,
        p_content: msgContent
      })

      if (error) throw error

      // Remove optimistic flag on success (or let real-time update handle it)
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, is_optimistic: false } : m))
      
      // Update last message in chat list
      setChats(prev => prev.map(c => 
        c.id === selectedChatId 
        ? { ...c, last_message: msgContent, last_message_time: new Date().toISOString(), is_own_last: true } 
        : c
      ))

    } catch (err: any) {
      alert('Failed to send message: ' + err.message)
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setNewMessage(msgContent)
    }
  }

  const handleRecordSale = async () => {
    if (!selectedChatId) return
    if (!confirm('This will reward the influencer from your escrowed budget. Continue?')) return

    setIsProcessingSale(true)
    try {
      const { data, error } = await supabase.rpc('record_unboxed_sale', { 
        p_chat_id: selectedChatId 
      })

      if (error) throw error
      if (data.success) {
        alert('Sale recorded and influencer rewarded!')
      } else {
        alert(data.message || 'Failed to record sale')
      }
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setIsProcessingSale(false)
    }
  }

  const selectedChat = chats.find(c => c.id === selectedChatId)
  const filteredChats = chats.filter(c => 
    c.influencer_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.influencer_profile?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white">
         <Loader2 className="animate-spin text-brand" size={40} />
         <p className="text-gray-400 font-bold uppercase tracking-widest mt-4 text-[10px]">Connecting to secure chat...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex h-screen overflow-hidden bg-white">
      {/* Sidebar: Chat List */}
      <div className="w-full md:w-[350px] lg:w-[400px] flex flex-col border-r border-gray-100 h-full bg-white">
        <header className="p-6 border-b border-gray-100 space-y-4">
           <div className="flex items-center justify-between">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Messages</h1>
              <div className="h-10 w-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
                 {chats.length}
              </div>
           </div>
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all text-sm"
              />
           </div>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
           {filteredChats.length > 0 ? filteredChats.map((chat) => (
             <button
               key={chat.id}
               onClick={() => setSelectedChatId(chat.id)}
               className={`w-full flex items-center gap-4 p-4 transition-all border-b border-gray-50/50 ${selectedChatId === chat.id ? 'brand-gradient-soft border-l-4 border-l-brand' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}
             >
                <div className="relative">
                   <div className="h-14 w-14 rounded-2xl overflow-hidden border border-gray-100 bg-gray-100">
                      <img 
                        src={chat.influencer_profile?.avatar_url || `https://ui-avatars.com/api/?name=${chat.influencer_profile?.full_name}&background=random`} 
                        className="h-full w-full object-cover"
                        alt=""
                      />
                   </div>
                   <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white" />
                </div>
                <div className="flex-1 text-left min-w-0">
                   <div className="flex justify-between items-center mb-1">
                      <p className="font-bold text-gray-900 truncate">{chat.influencer_profile?.full_name}</p>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{formatTime(chat.last_message_time)}</span>
                   </div>
                   <p className={`text-xs truncate ${selectedChatId === chat.id ? 'text-brand font-medium' : 'text-gray-500'}`}>
                      {chat.is_own_last ? 'You: ' : ''}{chat.last_message}
                   </p>
                </div>
             </button>
           )) : (
             <div className="p-20 text-center space-y-4 opacity-40">
                <MessageSquare size={48} className="mx-auto" />
                <p className="text-xs font-black uppercase tracking-widest leading-relaxed">No conversations<br/>found</p>
             </div>
           )}
        </div>
      </div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col h-full bg-gray-50 relative">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-10">
               <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-xl overflow-hidden border border-gray-100 bg-gray-100">
                     <img 
                        src={selectedChat.influencer_profile?.avatar_url || `https://ui-avatars.com/api/?name=${selectedChat.influencer_profile?.full_name}&background=random`} 
                        className="h-full w-full object-cover"
                        alt=""
                      />
                  </div>
                  <div>
                     <p className="font-black text-gray-900 leading-none">{selectedChat.influencer_profile?.full_name}</p>
                     <p className="text-xs text-gray-400 font-bold mt-1.5 uppercase tracking-wider">@{selectedChat.influencer_profile?.username}</p>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  <button className="h-11 w-11 rounded-xl bg-gray-50 text-gray-400 hover:text-brand hover:bg-brand/10 transition-all flex items-center justify-center border border-gray-100">
                     <Phone size={20} />
                  </button>
                  <button className="h-11 w-11 rounded-xl bg-gray-50 text-gray-400 hover:text-brand hover:bg-brand/10 transition-all flex items-center justify-center border border-gray-100">
                     <Video size={20} />
                  </button>
                  <div className="w-px h-6 bg-gray-200 mx-2" />
                  <button className="h-11 w-11 rounded-xl bg-gray-50 text-gray-400 hover:text-brand hover:bg-brand/10 transition-all flex items-center justify-center border border-gray-100">
                     <MoreVertical size={20} />
                  </button>
               </div>
            </header>

            {/* Context Data Card (Unboxed / Challenge) */}
            {selectedChat.context_data && (
               <div className="px-8 pt-6">
                  <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-6 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-32 h-full bg-brand/5 -skew-x-12 translate-x-16 group-hover:translate-x-12 transition-transform" />
                     
                     <div className="h-16 w-16 bg-gray-100 rounded-2xl overflow-hidden shrink-0 border border-gray-100 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowPreview(true)}>
                        {selectedChat.context_data.media_url ? (
                          selectedChat.context_data.media_type === 'video' ? (
                            <div className="relative w-full h-full">
                               <video 
                                 src={selectedChat.context_data.media_url} 
                                 poster={selectedChat.context_data.thumbnail_url}
                                 className="w-full h-full object-cover"
                               />
                               <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                  <PlayCircle size={24} className="text-white fill-current" />
                               </div>
                            </div>
                          ) : (
                            <img src={selectedChat.context_data.thumbnail_url || selectedChat.context_data.media_url} className="h-full w-full object-cover" />
                          )
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-brand"><ShoppingBag size={24} /></div>
                        )}
                     </div>

                     <div className="flex-1 space-y-1 cursor-pointer" onClick={() => setShowPreview(true)}>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-brand uppercase tracking-widest">Ongoing Context</span>
                           <div className="h-1 w-1 rounded-full bg-gray-300" />
                           <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{selectedChat.type === 'unboxed' ? 'Referral Partnership' : 'Challenge Discussion'}</span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 leading-tight line-clamp-1">{selectedChat.context_data.status_title || selectedChat.context_data.caption}</h4>
                     </div>

                     {selectedChat.type === 'unboxed' && (
                        <button 
                           onClick={handleRecordSale}
                           disabled={isProcessingSale}
                           className="px-6 py-2.5 bg-brand text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand/20 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
                        >
                           {isProcessingSale ? <Loader2 className="animate-spin" size={14} /> : 'Record Sale'}
                        </button>
                     )}
                  </div>
               </div>
            )}

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-8 space-y-4 scroll-smooth scrollbar-hide">
               {messagesLoading ? (
                  <div className="flex justify-center py-20">
                     <Loader2 className="animate-spin text-brand/20" size={32} />
                  </div>
               ) : messages.map((msg, index) => {
                 const isOwn = msg.sender_id === currentUser.id
                 return (
                   <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-1 duration-300`}>
                      <div className={`max-w-[70%] space-y-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                         <div className={`p-4 rounded-3xl text-sm leading-relaxed shadow-sm ${isOwn ? 'bg-brand text-white rounded-br-lg' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-lg'}`}>
                            {msg.content}
                         </div>
                         <div className="flex items-center gap-2 px-1">
                            <span className="text-[9px] font-bold text-gray-400 uppercase">{formatTime(msg.created_at)}</span>
                            {isOwn && (
                               <span className="text-brand font-black text-[10px]">{msg.is_optimistic ? '✓' : '✓✓'}</span>
                            )}
                         </div>
                      </div>
                   </div>
                 )
               })}
               <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-8 bg-white border-t border-gray-100">
               <form onSubmit={handleSendMessage} className="flex items-center gap-4 bg-gray-50 p-2 pl-6 rounded-[2rem] border border-gray-100 focus-within:ring-2 focus-within:ring-brand/20 transition-all">
                  <input 
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type your response..."
                    className="flex-1 bg-transparent py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="h-12 w-12 bg-brand text-white rounded-full flex items-center justify-center shadow-lg shadow-brand/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100"
                  >
                     <Send size={20} />
                  </button>
               </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-6">
             <div className="h-24 w-24 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center justify-center text-brand/20">
                <MessageSquare size={48} />
             </div>
             <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Direct Messaging</h3>
                <p className="text-gray-500 max-w-sm mx-auto font-medium">Select a conversation from the sidebar to chat with influencers or hub owners.</p>
             </div>
             <button 
               onClick={() => router.push('/dashboard/hubs')}
               className="px-8 py-3 bg-brand/5 text-brand rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand/10 transition-all"
             >
                Start New Discussion
             </button>
          </div>
        )}
      </div>

      {/* Media Preview Modal */}
      {selectedChat?.context_data?.media_url && (
        <MediaCarouselModal 
          isVisible={showPreview}
          onClose={() => setShowPreview(false)}
          mediaItems={[{
            ...selectedChat.context_data,
            id: selectedChat.id, // Proxy ID
            created_at: selectedChat.created_at
          }]}
          initialIndex={0}
        />
      )}
    </div>
  )
}
