'use client'

import { 
  Megaphone, 
  ClipboardList, 
  Gamepad2, 
  ArrowLeft,
  ChevronRight,
  Send
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NewCampaignTypePage() {
  const router = useRouter()

  const campaignTypes = [
    {
      id: 'challenge',
      title: 'Video Challenge',
      description: 'Ask influencers to create video content based on your prompt.',
      icon: <Megaphone size={32} />,
      color: 'bg-brand/10 text-brand',
      href: '/dashboard/campaigns/new/challenge'
    },
    {
      id: 'status',
      title: 'Status Update',
      description: 'Share news, announcements, or brand stories with your followers.',
      icon: <Send size={32} />,
      color: 'bg-green-100 text-green-600',
      href: '/dashboard/campaigns/new/status'
    },
    {
      id: 'survey',
      title: 'Market Survey',
      description: 'Gather valuable feedback and insights from your target audience.',
      icon: <ClipboardList size={32} />,
      color: 'bg-blue-100 text-blue-600',
      href: '/dashboard/campaigns/new/survey'
    },
    {
      id: 'game',
      title: 'Playable Ad',
      description: 'Engage users through interactive games and mini-activities.',
      icon: <Gamepad2 size={32} />,
      color: 'bg-purple-100 text-purple-600',
      href: '/dashboard/campaigns/new/game'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            <span>Back to Campaigns</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Choose Campaign Type</h1>
          <p className="text-gray-500 mt-2">What kind of engagement are you looking for today?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {campaignTypes.map((type) => (
            <Link 
              key={type.id}
              href={type.href}
              className="group glass-card rounded-2xl p-8 hover:border-brand/50 transition-all flex flex-col items-center text-center"
            >
              <div className={`h-20 w-20 rounded-2xl ${type.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                {type.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{type.title}</h3>
              <p className="text-sm text-gray-500 flex-1">{type.description}</p>
              <div className="mt-6 flex items-center gap-2 text-brand font-bold text-sm">
                Get Started <ChevronRight size={16} />
              </div>
            </Link>
          ))}
        </div>

        {/* Tip Section */}
        <div className="bg-brand/5 border border-brand/10 rounded-2xl p-6 flex items-start gap-4">
          <div className="p-2 bg-brand/10 rounded-lg text-brand">
            <Megaphone size={20} />
          </div>
          <div>
            <h4 className="font-bold text-brand">Pro Tip</h4>
            <p className="text-sm text-brand/80 mt-1">
              Status updates are the best way to keep your brand at the top of the influencer wall. 
              Aim for at least 2 updates a week for maximum visibility.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
