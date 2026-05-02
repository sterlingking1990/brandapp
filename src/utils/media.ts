import { createClient } from './supabase/client'

export const uploadStatusMedia = async (file: File, userId: string) => {
  const supabase = createClient()
  const fileName = `${userId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
  
  const { data, error } = await supabase.storage
    .from('status-media')
    .upload(fileName, file)

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('status-media')
    .getPublicUrl(fileName)

  return publicUrl
}

export const uploadBrandWallMedia = async (file: File, brandId: string) => {
  const supabase = createClient()
  const fileName = `${brandId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
  
  const { data, error } = await supabase.storage
    .from('brand-wall')
    .upload(fileName, file)

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('brand-wall')
    .getPublicUrl(fileName)

  return publicUrl
}

export const generateVideoThumbnail = async (videoUrl: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.src = videoUrl
    video.crossOrigin = 'anonymous'
    video.currentTime = 1 // Capture at 1 second
    
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }

    video.onerror = () => resolve(null)
  })
}

export const uploadThumbnail = async (thumbnailDataUrl: string, brandId: string) => {
  const supabase = createClient()
  const blob = await (await fetch(thumbnailDataUrl)).blob()
  const fileName = `${brandId}/thumb_${Date.now()}.jpg`

  const { data, error } = await supabase.storage
    .from('brand-wall')
    .upload(fileName, blob, { contentType: 'image/jpeg' })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('brand-wall')
    .getPublicUrl(fileName)

  return publicUrl
}
