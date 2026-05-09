'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Plus, 
  Search, 
  Grid, 
  List, 
  MoreVertical, 
  Trash2, 
  Play, 
  Image as ImageIcon,
  Loader2,
  TrendingUp,
  BarChart3,
  Megaphone,
  Facebook,
  Youtube,
  Share2,
  ExternalLink,
  MessageSquare,
  Edit3,
  X,
  UploadCloud,
  Globe,
  Pause,
  Copy
} from 'lucide-react'
import { uploadBrandWallMedia, generateVideoThumbnail, uploadThumbnail } from '@/utils/media'
import { manageYouTubeAd, manageFacebookAd } from '@/utils/adApi'
import Toast from '@/components/Toast'
import BrandWallAnalytics from '@/components/BrandWallAnalytics'
import YouTubeAdCreationModal from '@/components/YouTubeAdCreationModal'
import FacebookAdCreationModal from '@/components/FacebookAdCreationModal'
import MediaCarouselModal from '@/components/MediaCarouselModal'

export default function BrandWallPage() {
  const [media, setMedia] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [brand, setBrand] = useState<any>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  
  // Ad Management State
  const [youtubeAds, setYoutubeAds] = useState<any[]>([])
  const [facebookAds, setFacebookAds] = useState<any[]>([])
  const [activeAdTab, setActiveAdTab] = useState<'youtube' | 'facebook'>('youtube')
  const [adFilter, setAdFilter] = useState('all')
  
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [caption, setCaption] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  
  // Ad Promotion States
  const [selectedMediaForAd, setSelectedMediaForAd] = useState<any>(null)
  const [showPlatformSelector, setShowPlatformSelector] = useState(false)
  const [showFacebookAdModal, setShowFacebookAdModal] = useState(false)
  const [showYouTubeAdModal, setShowYouTubeAdModal] = useState(false)

  // Carousel State
  const [showCarousel, setShowCarousel] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchBrandAndData()
  }, [])

  const fetchBrandAndData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select(`
          id,
          company_name,
          profile_id,
          profiles(username, brandible_coins)
        `)
        .eq('profile_id', user.id)
        .maybeSingle()

      if (brandError) { console.error('Brand fetch error:', brandError); return }
      if (!brandData) { console.warn('No brand record found for user:', user.id); return }

      const processedBrand = {
        id: brandData.id,
        company_name: brandData.company_name,
        profile_id: user.id,
        username: (brandData as any).profiles?.username,
        brandible_coins: (brandData as any).profiles?.brandible_coins || 0
      }
      setBrand(processedBrand)

      // Fetch all three in parallel, log individual errors
      const [mediaRes, ytRes, fbRes] = await Promise.all([
        supabase
          .from('brand_wall_media_with_ad_details')
          .select('*')
          .eq('brand_id', brandData.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('youtube_ads')
          .select('*')
          .eq('brand_id', brandData.id)
          .neq('status', 'error')
          .order('created_at', { ascending: false }),
        supabase
          .from('facebook_ads')
          .select('*')
          .eq('brand_id', brandData.id)
          .order('created_at', { ascending: false }),
      ])

      if (mediaRes.error) console.error('Wall media error:', mediaRes.error)
      if (ytRes.error) console.error('YouTube ads error:', ytRes.error)
      if (fbRes.error) console.error('Facebook ads error:', fbRes.error)

      setMedia(mediaRes.data || [])
      setYoutubeAds(ytRes.data || [])
      setFacebookAds(fbRes.data || [])
    } catch (err) {
      console.error('fetchBrandAndData error:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredYoutubeAds = adFilter === 'all' 
    ? youtubeAds 
    : youtubeAds.filter(ad => ad.status?.toLowerCase() === adFilter)

  const filteredFacebookAds = adFilter === 'all' 
   ? facebookAds 
   : facebookAds.filter(ad => ad.status?.toLowerCase() === adFilter)

  const handleCopyLink = () => {
    if (!brand?.username) return
    const link = `https://shop.brandiblebms.com/${brand.username}/wall`
    navigator.clipboard.writeText(link)
    setToastMessage('Wall link copied!')
    setShowToast(true)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setShowUploadModal(true)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !brand) return
    setUploading(true)
    try {
      const mediaUrl = await uploadBrandWallMedia(selectedFile, brand.id)
      let thumbnailUrl = null

      if (selectedFile.type.startsWith('video')) {
        const thumbDataUrl = await generateVideoThumbnail(mediaUrl)
        if (thumbDataUrl) {
          thumbnailUrl = await uploadThumbnail(thumbDataUrl, brand.id)
        }
      }

      const { data: inserted, error } = await supabase.from('brand_wall_media').insert([
        {
          brand_id: brand.id,
          media_url: mediaUrl,
          media_type: selectedFile.type.startsWith('image') ? 'image' : 'video',
          caption: caption,
          thumbnail_url: thumbnailUrl
        }
      ]).select()

      if (error) throw error

      setToastMessage('Posted to your wall!')
      setShowToast(true)
      setShowUploadModal(false)
      setCaption('')
      setSelectedFile(null)
      setPreviewUrl(null)
      fetchBrandAndData() // Refresh data
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string, url: string) => {
    if (!confirm('Permanently remove this from your wall?')) return
    try {
      const { error } = await supabase.from('brand_wall_media').delete().eq('id', id)
      if (error) throw error
      setMedia(media.filter(m => m.id !== id))
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleManageAd = async (platform: 'youtube' | 'facebook', action: 'pause' | 'resume' | 'delete', adId: string) => {
    if (action === 'delete' && !confirm('Are you sure you want to stop this campaign and refund remaining budget?')) return
    
    setLoading(true)
    try {
      if (platform === 'youtube') {
        await manageYouTubeAd(action, adId)
      } else {
        await manageFacebookAd(action, adId)
      }
      setToastMessage(`Campaign ${action === 'delete' ? 'removed' : action + 'd'} successfully!`)
      setShowToast(true)
      fetchBrandAndData()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Toast 
        message={toastMessage} 
        isVisible={showToast} 
        onClose={() => setShowToast(false)} 
      />

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*,video/*"
        onChange={handleFileSelect}
      />

      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {showAnalytics ? (
            <button 
              onClick={() => setShowAnalytics(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-brand"
            >
               <X size={20} />
            </button>
          ) : (
            <Globe className="text-brand" size={20} />
          )}
          <h1 className="text-lg font-semibold text-gray-800">
            {showAnalytics ? 'Wall Performance' : 'My Brand Wall'}
          </h1>
        </div>

        {!showAnalytics && brand?.username && (
           <div className="hidden lg:flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100 max-w-md">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Your Wall:</p>
              <p className="text-xs font-bold text-gray-600 truncate">shop.brandiblebms.com/{brand.username}/wall</p>
              <button 
                onClick={handleCopyLink}
                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-brand transition-all"
                title="Copy Link"
              >
                <Copy size={14} />
              </button>
              <a 
                href={`https://shop.brandiblebms.com/${brand.username}/wall`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-brand transition-all"
                title="Preview Wall"
              >
                <ExternalLink size={14} />
              </a>
           </div>
        )}

        <div className="flex items-center gap-4">
           <button 
             onClick={() => setShowAnalytics(!showAnalytics)}
             className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
               showAnalytics 
               ? 'bg-gray-900 text-white shadow-lg shadow-black/10' 
               : 'bg-white border border-gray-200 text-gray-600 hover:border-brand/30 hover:text-brand'
             }`}
           >
              <BarChart3 size={18} /> 
              {showAnalytics ? 'Show Wall' : 'Analytics'}
           </button>
           {!showAnalytics && (
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="bg-brand text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-brand/90 transition-all shadow-lg shadow-brand/20"
             >
               <Plus size={18} /> New Post
             </button>
           )}
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto w-full flex-1 space-y-8">
        {showAnalytics ? (
           <BrandWallAnalytics brandId={brand?.id} />
        ) : (
          <>
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className="h-12 w-12 bg-brand/10 text-brand rounded-2xl flex items-center justify-center">
                     <Grid size={24} />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Posts</p>
                     <p className="text-2xl font-black text-gray-900">{media.length}</p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                     <BarChart3 size={24} />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reach</p>
                     <p className="text-2xl font-black text-gray-900">1.2M</p>
                  </div>
               </div>
               <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                     <ExternalLink size={24} />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Shop Status</p>
                     <p className="text-sm font-bold text-emerald-600 uppercase">Online</p>
                  </div>
               </div>
            </div>

            {/* Ad Control Section */}
            <div className="space-y-6">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                     <div className="h-10 w-10 bg-brand/10 text-brand rounded-xl flex items-center justify-center">
                        <Megaphone size={20} />
                     </div>
                     <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">Ad Control Center</h3>
                  </div>

                  {/* Platform Tabs */}
                  <div className="flex bg-gray-100 p-1 rounded-2xl">
                     <button 
                       onClick={() => setActiveAdTab('youtube')}
                       className={`px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                         activeAdTab === 'youtube' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                       }`}
                     >
                        <Youtube size={16} className={activeAdTab === 'youtube' ? 'text-red-600' : ''} />
                        YouTube
                     </button>
                     <button 
                       onClick={() => setActiveAdTab('facebook')}
                       className={`px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                         activeAdTab === 'facebook' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                       }`}
                     >
                        <Facebook size={16} className={activeAdTab === 'facebook' ? 'text-blue-600' : ''} />
                        Facebook
                     </button>
                  </div>
               </div>

               {/* Filter Bar */}
               <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {['all', 'active', 'pending', 'paused', 'completed'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setAdFilter(filter)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${
                        adFilter === filter 
                        ? 'bg-gray-900 text-white border-gray-900' 
                        : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
               </div>

               {/* Ad List */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(activeAdTab === 'youtube' ? filteredYoutubeAds : filteredFacebookAds).length > 0 ? (
                    (activeAdTab === 'youtube' ? filteredYoutubeAds : filteredFacebookAds).map((ad) => (
                      <div key={ad.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 space-y-6 hover:shadow-md transition-shadow group">
                         <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                               <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${
                                 ad.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                 ad.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                               }`}>
                                 {ad.status}
                               </span>
                               <span className="text-[10px] text-gray-400 font-bold">{new Date(ad.created_at).toLocaleDateString()}</span>
                            </div>
                            {activeAdTab === 'youtube' ? <Youtube size={16} className="text-red-600" /> : <Facebook size={16} className="text-blue-600" />}
                         </div>

                         <div>
                            <h4 className="font-bold text-gray-900 line-clamp-1">{ad.campaign_name || ad.ad_name || 'Campaign'}</h4>
                            <p className="text-[10px] text-gray-400 font-medium mt-1">ID: {ad.campaign_id || ad.ad_id}</p>
                         </div>

                         <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                            <div>
                               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Budget</p>
                               <p className="text-sm font-black text-gray-900">₦{parseFloat(ad.budget_total || ad.budget_daily).toLocaleString()}</p>
                            </div>
                            <div>
                               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Spend</p>
                               <p className="text-sm font-black text-red-600">₦{parseFloat(ad.total_ad_spend || 0).toLocaleString()}</p>
                            </div>
                         </div>

                         <div className="flex gap-2">
                            <button className="flex-1 bg-gray-50 text-gray-600 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-2">
                               <BarChart3 size={14} /> Metrics
                            </button>
                            {ad.status === 'active' ? (
                              <button 
                                onClick={() => handleManageAd(activeAdTab, 'pause', ad.id)}
                                className="flex-1 bg-yellow-50 text-yellow-700 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-100 transition-all flex items-center justify-center gap-2"
                              >
                                 <Pause size={14} /> Pause
                              </button>
                            ) : ad.status === 'paused' ? (
                              <button 
                                onClick={() => handleManageAd(activeAdTab, 'resume', ad.id)}
                                className="flex-1 bg-emerald-50 text-emerald-700 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
                              >
                                 <Play size={14} /> Resume
                              </button>
                            ) : null}
                            <button 
                              onClick={() => handleManageAd(activeAdTab, 'delete', ad.id)}
                              className="h-10 w-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-100 transition-all"
                            >
                               <Trash2 size={16} />
                            </button>
                         </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-12 bg-white rounded-[2rem] border border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-400">
                       <Megaphone size={32} className="opacity-20 mb-2" />
                       <p className="text-xs font-bold uppercase tracking-widest opacity-40">No {adFilter} {activeAdTab} ads found</p>
                    </div>
                  )}
               </div>
            </div>

            {/* Media Grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                 <Loader2 className="animate-spin text-brand" size={40} />
                 <p className="text-gray-500 font-medium tracking-wide animate-pulse uppercase text-[10px] tracking-[0.2em]">Synchronizing Wall...</p>
              </div>
            ) : media.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                 {media.map((item, index) => (
                   <div key={item.id} className="group relative aspect-square bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:border-brand/30 transition-all cursor-zoom-in">
                      <div className="absolute inset-0 z-0" onClick={() => {
                        setCarouselIndex(index)
                        setShowCarousel(true)
                      }}>
                        {item.media_type === 'video' ? (
                          <video 
                            src={item.media_url}
                            poster={item.thumbnail_url}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            muted
                            playsInline
                          />
                        ) : (
                          <img 
                            src={item.media_url} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            alt={item.caption}
                          />
                        )}
                      </div>

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-6 pointer-events-none">
                         <div className="flex justify-end pointer-events-auto">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(item.id, item.media_url)
                              }}
                              className="h-10 w-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                            >
                               <Trash2 size={18} />
                            </button>
                         </div>
                         
                         <div className="space-y-3 pointer-events-auto">
                            {item.caption && (
                              <p className="text-xs text-white font-medium line-clamp-2 leading-relaxed">
                                {item.caption}
                              </p>
                            )}
                            <div className="flex gap-2">
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation()
                                   setSelectedMediaForAd(item)
                                   setShowPlatformSelector(true)
                                 }}
                                 className="flex-1 bg-white text-gray-900 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all"
                               >
                                  Manage Ad
                               </button>
                            </div>
                         </div>
                      </div>
                      
                      {item.media_type === 'video' && (
                        <div className="absolute top-4 left-4 h-8 w-8 bg-black/40 backdrop-blur-sm rounded-lg flex items-center justify-center text-white">
                           <Play size={14} className="fill-current" />
                        </div>
                      )}

                      {(item.facebook_ad_id || item.youtube_ad_id) && (
                        <div className="absolute top-4 left-4 flex gap-2">
                           {item.facebook_ad_id && (
                             <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                                <Facebook size={14} />
                             </div>
                           )}
                           {item.youtube_ad_id && (
                             <div className="h-8 w-8 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                                <Youtube size={14} />
                             </div>
                           )}
                        </div>
                      )}
                   </div>
                 ))}
              </div>
            ) : (
              <div className="py-40 text-center space-y-6 bg-white rounded-[3rem] border border-dashed border-gray-200">
                 <div className="h-24 w-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto text-gray-300">
                    <ImageIcon size={40} />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-gray-900">Your Wall is Empty</h3>
                    <p className="text-gray-500 max-w-xs mx-auto mt-2">Start building your brand presence by uploading your first story or product showcase.</p>
                 </div>
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="bg-brand text-white px-8 py-3 rounded-2xl font-bold hover:scale-105 transition-transform"
                 >
                    Upload First Post
                 </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Platform Selector Modal */}
      {showPlatformSelector && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                 <h3 className="text-2xl font-black text-gray-900">Choose Ad Platform</h3>
                 <button onClick={() => setShowPlatformSelector(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                 </button>
              </div>
              
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                 {selectedMediaForAd?.media_type === 'video' ? (
                    <button 
                      onClick={() => {
                        setShowPlatformSelector(false)
                        setShowYouTubeAdModal(true)
                      }}
                      className="flex flex-col items-center gap-4 p-8 rounded-3xl border border-gray-100 hover:border-red-500/30 hover:bg-red-50 transition-all group"
                    >
                       <div className="h-16 w-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Youtube size={32} />
                       </div>
                       <div className="text-center">
                          <h4 className="font-bold text-gray-900">YouTube Ads</h4>
                          <p className="text-xs text-gray-500 mt-1">Video discovery & shorts</p>
                       </div>
                    </button>
                 ) : (
                    <div className="flex flex-col items-center justify-center p-8 rounded-3xl border border-gray-100 bg-gray-50 opacity-60 grayscale cursor-not-allowed group">
                       <div className="h-16 w-16 bg-gray-200 text-gray-400 rounded-2xl flex items-center justify-center">
                          <Youtube size={32} />
                       </div>
                       <div className="text-center mt-4">
                          <h4 className="font-bold text-gray-400">YouTube Ads</h4>
                          <p className="text-[10px] text-gray-400 mt-1 uppercase font-black">Video only</p>
                       </div>
                    </div>
                 )}

                 <button 
                   onClick={() => {
                     setShowPlatformSelector(false)
                     setShowFacebookAdModal(true)
                   }}
                   className="flex flex-col items-center gap-4 p-8 rounded-3xl border border-gray-100 hover:border-blue-500/30 hover:bg-blue-50 transition-all group"
                 >
                    <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                       <Facebook size={32} />
                    </div>
                    <div className="text-center">
                       <h4 className="font-bold text-gray-900">Facebook Ads</h4>
                       <p className="text-xs text-gray-500 mt-1">Feed & Stories placements</p>
                    </div>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Ad Creation Modals */}
      <YouTubeAdCreationModal 
        isVisible={showYouTubeAdModal}
        onClose={() => setShowYouTubeAdModal(false)}
        media={selectedMediaForAd}
        brandId={brand?.id}
        onAdCreated={() => {
           setToastMessage('YouTube campaign launched!')
           setShowToast(true)
           fetchBrandAndData()
        }}
      />

      <FacebookAdCreationModal 
        isVisible={showFacebookAdModal}
        onClose={() => setShowFacebookAdModal(false)}
        media={selectedMediaForAd}
        brandId={brand?.id}
        onAdCreated={() => {
           setToastMessage('Facebook campaign launched!')
           setShowToast(true)
           fetchBrandAndData()
        }}
      />

      {/* Media Carousel Modal */}
      <MediaCarouselModal 
        isVisible={showCarousel}
        onClose={() => setShowCarousel(false)}
        mediaItems={media}
        initialIndex={carouselIndex}
        onDelete={(id) => {
          handleDelete(id, '')
          setShowCarousel(false)
        }}
        onPromote={(mediaItem) => {
          setSelectedMediaForAd(mediaItem)
          setShowPlatformSelector(true)
        }}
      />

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                 <h3 className="text-2xl font-black text-gray-900">New Wall Post</h3>
                 <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                 </button>
              </div>
              
              <div className="p-8 space-y-6">
                 <div className="aspect-video bg-gray-100 rounded-[2rem] overflow-hidden relative border border-gray-100">
                    {selectedFile?.type.startsWith('video') ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                         <Play size={40} />
                         <p className="text-xs font-bold mt-2 uppercase tracking-widest">Video Selected</p>
                      </div>
                    ) : (
                      <img src={previewUrl!} className="w-full h-full object-cover" alt="Preview" />
                    )}
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Caption</label>
                    <textarea 
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Tell your brand story..."
                      className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-brand outline-none transition-all resize-none min-h-[120px]"
                    />
                 </div>

                 <button 
                   onClick={handleUpload}
                   disabled={uploading}
                   className="w-full py-4 bg-brand text-white font-black rounded-2xl shadow-xl shadow-brand/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                    {uploading ? <Loader2 className="animate-spin" size={24} /> : (
                      <>
                        <UploadCloud size={20} />
                        POST TO WALL
                      </>
                    )}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
