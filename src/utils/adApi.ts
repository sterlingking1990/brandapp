import { createClient } from './supabase/client'

const supabase = createClient()

/**
 * Facebook Ad Operations
 */
export const getFacebookAds = async (brandId: string) => {
  const { data, error } = await supabase
    .from('facebook_ads')
    .select(`
      *,
      media:brand_wall_media!facebook_ads_media_id_fkey(media_url, thumbnail_url, caption)
    `)
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export const manageFacebookAd = async (action: 'pause' | 'resume' | 'delete', adId: string, extraData?: any) => {
  const { data, error } = await supabase.functions.invoke('manage-facebook-ad', {
    body: { action, ad_id: adId, ...extraData }
  })

  if (error || !data.success) {
    throw new Error(data?.message || error?.message)
  }
  return data
}

/**
 * YouTube Ad Operations
 */
export const getYouTubeAds = async (brandId: string) => {
  const { data, error } = await supabase
    .from('youtube_ads')
    .select(`
      *,
      media:brand_wall_media!youtube_ads_media_id_fkey(media_url, thumbnail_url, caption)
    `)
    .eq('brand_id', brandId)
    .neq('status', 'error')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export const manageYouTubeAd = async (action: 'pause' | 'resume' | 'delete', adId: string, extraData?: any) => {
  const { data, error } = await supabase.functions.invoke('manage-youtube-ad', {
    body: { action, ad_id: adId, ...extraData }
  })

  if (error || !data.success) {
    throw new Error(data?.message || error?.message)
  }
  return data
}

export const getYouTubeAdMetrics = async (adId: string) => {
  const { data, error } = await supabase
    .from('youtube_ad_metrics')
    .select('*')
    .eq('youtube_ad_id', adId)
    .order('fetched_at', { ascending: false })
    .limit(1)

  if (error) throw error
  return data && data.length > 0 ? data[0] : null
}
