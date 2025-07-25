import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface DeveloperProfile {
  user_id: string
  username: string
  display_name: string
  bio: string
  avatar_url?: string
  website_url?: string
  github_url?: string
  twitter_handle?: string
  linkedin_url?: string
  location?: string
  skills: string[]
  specializations: string[]
  
  // Privacy Settings
  show_revenue: boolean
  show_email: boolean
  show_location: boolean
  show_real_name: boolean
  
  // Profile Statistics
  stats: {
    total_agents: number
    public_agents: number
    total_downloads: number
    total_revenue: number
    avg_rating: number
    total_reviews: number
    joined_date: string
    last_active: string
  }
  
  // Achievements & Badges
  achievements: Achievement[]
  
  // Social Proof
  followers_count: number
  following_count: number
  
  // Profile Status
  is_verified: boolean
  is_featured: boolean
  profile_completeness: number
  
  created_at: string
  updated_at: string
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  earned_at: string
  category: 'revenue' | 'downloads' | 'ratings' | 'community' | 'special'
}

interface DeveloperFollow {
  follower_id: string
  following_id: string
  created_at: string
}

class DeveloperProfileManager {
  async createProfile(userId: string, profileData: Partial<DeveloperProfile>): Promise<string> {
    // Check if username is available
    if (profileData.username) {
      const isAvailable = await this.checkUsernameAvailability(profileData.username, userId)
      if (!isAvailable) {
        throw new Error('Username is already taken')
      }
    }

    const profile = {
      user_id: userId,
      username: profileData.username || `dev_${Date.now()}`,
      display_name: profileData.display_name || 'Anonymous Developer',
      bio: profileData.bio || '',
      avatar_url: profileData.avatar_url,
      website_url: profileData.website_url,
      github_url: profileData.github_url,
      twitter_handle: profileData.twitter_handle,
      linkedin_url: profileData.linkedin_url,
      location: profileData.location,
      skills: profileData.skills || [],
      specializations: profileData.specializations || [],
      show_revenue: profileData.show_revenue || false,
      show_email: profileData.show_email || false,
      show_location: profileData.show_location || true,
      show_real_name: profileData.show_real_name || false,
      stats: {
        total_agents: 0,
        public_agents: 0,
        total_downloads: 0,
        total_revenue: 0,
        avg_rating: 0,
        total_reviews: 0,
        joined_date: new Date().toISOString(),
        last_active: new Date().toISOString()
      },
      achievements: [],
      followers_count: 0,
      following_count: 0,
      is_verified: false,
      is_featured: false,
      profile_completeness: this.calculateCompleteness(profileData),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('developer_profiles')
      .insert(profile)
      .select('username')
      .single()

    if (error) {
      throw new Error(`Failed to create profile: ${error.message}`)
    }

    return data.username
  }

  async getProfile(identifier: string, viewerId?: string): Promise<DeveloperProfile | null> {
    // Identifier can be username or user_id
    let query = supabase
      .from('developer_profiles')
      .select('*')

    if (identifier.includes('@') || identifier.length > 20) {
      // Likely a user_id
      query = query.eq('user_id', identifier)
    } else {
      // Likely a username
      query = query.eq('username', identifier)
    }

    const { data: profile, error } = await query.single()

    if (error || !profile) {
      return null
    }

    // Update stats
    const updatedStats = await this.refreshProfileStats(profile.user_id)
    profile.stats = updatedStats

    // Hide sensitive info based on privacy settings
    if (viewerId !== profile.user_id) {
      if (!profile.show_revenue) {
        profile.stats.total_revenue = 0
      }
      if (!profile.show_email) {
        delete profile.email
      }
      if (!profile.show_location) {
        delete profile.location
      }
      if (!profile.show_real_name) {
        // Keep display_name but hide real name if different
      }
    }

    // Update last active if this is the profile owner viewing
    if (viewerId === profile.user_id) {
      await this.updateLastActive(profile.user_id)
    }

    return profile
  }

  async updateProfile(userId: string, updates: Partial<DeveloperProfile>): Promise<boolean> {
    // Check username availability if changing
    if (updates.username) {
      const isAvailable = await this.checkUsernameAvailability(updates.username, userId)
      if (!isAvailable) {
        throw new Error('Username is already taken')
      }
    }

    const updateData = {
      ...updates,
      profile_completeness: this.calculateCompleteness(updates),
      updated_at: new Date().toISOString()
    }

    // Remove stats and achievements from direct updates
    delete updateData.stats
    delete updateData.achievements
    delete updateData.followers_count
    delete updateData.following_count

    const { error } = await supabase
      .from('developer_profiles')
      .update(updateData)
      .eq('user_id', userId)

    return !error
  }

  async checkUsernameAvailability(username: string, excludeUserId?: string): Promise<boolean> {
    // Username validation
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      throw new Error('Username must be 3-20 characters and contain only letters, numbers, underscores, and hyphens')
    }

    // Reserved usernames
    const reserved = ['admin', 'api', 'www', 'app', 'support', 'help', 'docs', 'blog', 'about', 'contact']
    if (reserved.includes(username.toLowerCase())) {
      return false
    }

    let query = supabase
      .from('developer_profiles')
      .select('user_id')
      .eq('username', username)

    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId)
    }

    const { data } = await query.single()
    return !data
  }

  async refreshProfileStats(userId: string) {
    // Get agent stats
    const { data: agents } = await supabase
      .from('agents')
      .select('id, is_public, download_count, price')
      .eq('user_id', userId)

    const totalAgents = agents?.length || 0
    const publicAgents = agents?.filter(a => a.is_public).length || 0
    const totalDownloads = agents?.reduce((sum, a) => sum + (a.download_count || 0), 0) || 0

    // Get revenue stats
    const { data: earnings } = await supabase
      .from('developer_earnings')
      .select('amount, status')
      .eq('user_id', userId)
      .eq('status', 'completed')

    const totalRevenue = earnings?.reduce((sum, e) => sum + e.amount, 0) || 0

    // Get rating stats
    const { data: reviews } = await supabase
      .from('agent_reviews')
      .select('rating')
      .in('agent_id', agents?.map(a => a.id) || [])

    const totalReviews = reviews?.length || 0
    const avgRating = totalReviews > 0 && reviews ? 
      reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0

    const stats = {
      total_agents: totalAgents,
      public_agents: publicAgents,
      total_downloads: totalDownloads,
      total_revenue: totalRevenue,
      avg_rating: Math.round(avgRating * 100) / 100,
      total_reviews: totalReviews,
      joined_date: '', // Will be preserved from existing
      last_active: new Date().toISOString()
    }

    // Update the profile with new stats
    await supabase
      .from('developer_profiles')
      .update({ 
        stats: stats,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    // Check for new achievements
    await this.checkAndAwardAchievements(userId, stats)

    return stats
  }

  async checkAndAwardAchievements(userId: string, stats: any) {
    const newAchievements: Achievement[] = []

    // Revenue achievements
    if (stats.total_revenue >= 100 && stats.total_revenue < 1000) {
      newAchievements.push({
        id: 'first_100',
        name: 'First $100',
        description: 'Earned your first $100 in revenue',
        icon: '💰',
        earned_at: new Date().toISOString(),
        category: 'revenue'
      })
    } else if (stats.total_revenue >= 1000) {
      newAchievements.push({
        id: 'first_1000',
        name: 'First $1,000',
        description: 'Reached $1,000 in total revenue',
        icon: '🎯',
        earned_at: new Date().toISOString(),
        category: 'revenue'
      })
    }

    // Download achievements
    if (stats.total_downloads >= 100) {
      newAchievements.push({
        id: 'popular_creator',
        name: 'Popular Creator',
        description: '100+ total downloads across all agents',
        icon: '🌟',
        earned_at: new Date().toISOString(),
        category: 'downloads'
      })
    }

    // Rating achievements
    if (stats.avg_rating >= 4.5 && stats.total_reviews >= 10) {
      newAchievements.push({
        id: 'quality_creator',
        name: 'Quality Creator',
        description: 'Maintain 4.5+ star rating with 10+ reviews',
        icon: '⭐',
        earned_at: new Date().toISOString(),
        category: 'ratings'
      })
    }

    // Agent count achievements
    if (stats.public_agents >= 5) {
      newAchievements.push({
        id: 'prolific_creator',
        name: 'Prolific Creator',
        description: 'Published 5+ public agents',
        icon: '🚀',
        earned_at: new Date().toISOString(),
        category: 'community'
      })
    }

    // Award new achievements
    if (newAchievements.length > 0) {
      const { data: currentProfile } = await supabase
        .from('developer_profiles')
        .select('achievements')
        .eq('user_id', userId)
        .single()

      const existingAchievements = currentProfile?.achievements || []
      const existingIds = existingAchievements.map((a: Achievement) => a.id)
      
      const uniqueNewAchievements = newAchievements.filter(a => !existingIds.includes(a.id))
      
      if (uniqueNewAchievements.length > 0) {
        const updatedAchievements = [...existingAchievements, ...uniqueNewAchievements]
        
        await supabase
          .from('developer_profiles')
          .update({ 
            achievements: updatedAchievements,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
      }
    }
  }

  async followDeveloper(followerId: string, followingId: string): Promise<boolean> {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself')
    }

    // Check if already following
    const { data: existing } = await supabase
      .from('developer_follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single()

    if (existing) {
      throw new Error('Already following this developer')
    }

    const { error } = await supabase
      .from('developer_follows')
      .insert({
        follower_id: followerId,
        following_id: followingId,
        created_at: new Date().toISOString()
      })

    if (!error) {
      // Update follower counts
      await this.updateFollowerCounts(followingId, followerId)
    }

    return !error
  }

  async unfollowDeveloper(followerId: string, followingId: string): Promise<boolean> {
    const { error } = await supabase
      .from('developer_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId)

    if (!error) {
      // Update follower counts
      await this.updateFollowerCounts(followingId, followerId)
    }

    return !error
  }

  async updateFollowerCounts(followingId: string, followerId: string) {
    // Update following user's follower count
    const { count: followersCount } = await supabase
      .from('developer_follows')
      .select('*', { count: 'exact' })
      .eq('following_id', followingId)

    await supabase
      .from('developer_profiles')
      .update({ followers_count: followersCount || 0 })
      .eq('user_id', followingId)

    // Update follower user's following count
    const { count: followingCount } = await supabase
      .from('developer_follows')
      .select('*', { count: 'exact' })
      .eq('follower_id', followerId)

    await supabase
      .from('developer_profiles')
      .update({ following_count: followingCount || 0 })
      .eq('user_id', followerId)
  }

  async getFollowers(userId: string, limit: number = 20, offset: number = 0) {
    const { data, error } = await supabase
      .from('developer_follows')
      .select(`
        created_at,
        follower:developer_profiles!developer_follows_follower_id_fkey(
          user_id, username, display_name, avatar_url, bio
        )
      `)
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to get followers: ${error.message}`)
    }

    return data
  }

  async getFollowing(userId: string, limit: number = 20, offset: number = 0) {
    const { data, error } = await supabase
      .from('developer_follows')
      .select(`
        created_at,
        following:developer_profiles!developer_follows_following_id_fkey(
          user_id, username, display_name, avatar_url, bio
        )
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to get following: ${error.message}`)
    }

    return data
  }

  async searchDevelopers(query: string, filters: {
    specialization?: string
    location?: string
    min_rating?: number
    sort_by?: 'followers' | 'revenue' | 'agents' | 'rating'
  } = {}, limit: number = 20, offset: number = 0) {
    
    let searchQuery = supabase
      .from('developer_profiles')
      .select('*')

    // Text search in username, display_name, and bio
    if (query) {
      searchQuery = searchQuery.or(`username.ilike.%${query}%,display_name.ilike.%${query}%,bio.ilike.%${query}%`)
    }

    // Apply filters
    if (filters.specialization) {
      searchQuery = searchQuery.contains('specializations', [filters.specialization])
    }

    if (filters.location) {
      searchQuery = searchQuery.ilike('location', `%${filters.location}%`)
    }

    if (filters.min_rating) {
      searchQuery = searchQuery.gte('stats->avg_rating', filters.min_rating)
    }

    // Apply sorting
    switch (filters.sort_by) {
      case 'followers':
        searchQuery = searchQuery.order('followers_count', { ascending: false })
        break
      case 'revenue':
        searchQuery = searchQuery.order('stats->total_revenue', { ascending: false })
        break
      case 'agents':
        searchQuery = searchQuery.order('stats->total_agents', { ascending: false })
        break
      case 'rating':
        searchQuery = searchQuery.order('stats->avg_rating', { ascending: false })
        break
      default:
        searchQuery = searchQuery.order('updated_at', { ascending: false })
    }

    const { data, error } = await searchQuery
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Search failed: ${error.message}`)
    }

    return data
  }

  async updateLastActive(userId: string) {
    await supabase
      .from('developer_profiles')
      .update({ 
        'stats.last_active': new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
  }

  private calculateCompleteness(profile: Partial<DeveloperProfile>): number {
    let score = 0
    const fields = [
      'username', 'display_name', 'bio', 'avatar_url', 
      'skills', 'specializations', 'location'
    ]

    fields.forEach(field => {
      if (profile[field as keyof DeveloperProfile]) {
        if (Array.isArray(profile[field as keyof DeveloperProfile])) {
          if ((profile[field as keyof DeveloperProfile] as any[]).length > 0) score += 10
        } else {
          score += 10
        }
      }
    })

    // Bonus points for social links
    if (profile.website_url) score += 5
    if (profile.github_url) score += 5
    if (profile.twitter_handle) score += 5
    if (profile.linkedin_url) score += 5

    return Math.min(score, 100)
  }
}

const profileManager = new DeveloperProfileManager()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create_profile':
        const { user_id, profile_data } = body
        if (!user_id) {
          return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
        }
        const username = await profileManager.createProfile(user_id, profile_data || {})
        return NextResponse.json({ success: true, username })

      case 'follow':
        const { follower_id, following_id } = body
        if (!follower_id || !following_id) {
          return NextResponse.json({ error: 'Missing follower_id or following_id' }, { status: 400 })
        }
        const followed = await profileManager.followDeveloper(follower_id, following_id)
        return NextResponse.json({ success: followed })

      case 'unfollow':
        const { follower_id: unfollowerId, following_id: unfollowingId } = body
        if (!unfollowerId || !unfollowingId) {
          return NextResponse.json({ error: 'Missing follower_id or following_id' }, { status: 400 })
        }
        const unfollowed = await profileManager.unfollowDeveloper(unfollowerId, unfollowingId)
        return NextResponse.json({ success: unfollowed })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Developer profile POST error:', error)
    return NextResponse.json({ 
      success: false,
      error: (error as Error).message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const identifier = searchParams.get('identifier')
    const userId = searchParams.get('user_id')
    const viewerId = searchParams.get('viewer_id')

    switch (type) {
      case 'profile':
        if (!identifier) {
          return NextResponse.json({ error: 'Missing identifier' }, { status: 400 })
        }
        const profile = await profileManager.getProfile(identifier, viewerId || undefined)
        return NextResponse.json({ success: true, profile })

      case 'check_username':
        const username = searchParams.get('username')
        const excludeUserId = searchParams.get('exclude_user_id')
        if (!username) {
          return NextResponse.json({ error: 'Missing username' }, { status: 400 })
        }
        const available = await profileManager.checkUsernameAvailability(username, excludeUserId || undefined)
        return NextResponse.json({ success: true, available })

      case 'followers':
        if (!userId) {
          return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
        }
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = parseInt(searchParams.get('offset') || '0')
        const followers = await profileManager.getFollowers(userId, limit, offset)
        return NextResponse.json({ success: true, followers })

      case 'following':
        if (!userId) {
          return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
        }
        const followingLimit = parseInt(searchParams.get('limit') || '20')
        const followingOffset = parseInt(searchParams.get('offset') || '0')
        const following = await profileManager.getFollowing(userId, followingLimit, followingOffset)
        return NextResponse.json({ success: true, following })

      case 'search':
        const query = searchParams.get('query') || ''
        const specialization = searchParams.get('specialization')
        const location = searchParams.get('location')
        const minRating = searchParams.get('min_rating') ? parseFloat(searchParams.get('min_rating')!) : undefined
        const sortBy = searchParams.get('sort_by') as 'followers' | 'revenue' | 'agents' | 'rating' | undefined
        const searchLimit = parseInt(searchParams.get('limit') || '20')
        const searchOffset = parseInt(searchParams.get('offset') || '0')
        
        const results = await profileManager.searchDevelopers(
          query,
          { 
            specialization: specialization || undefined, 
            location: location || undefined, 
            min_rating: minRating, 
            sort_by: sortBy 
          },
          searchLimit,
          searchOffset
        )
        return NextResponse.json({ success: true, results })

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Developer profile GET error:', error)
    return NextResponse.json({ 
      success: false,
      error: (error as Error).message 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, updates } = body

    if (!user_id || !updates) {
      return NextResponse.json({ error: 'Missing user_id or updates' }, { status: 400 })
    }

    const updated = await profileManager.updateProfile(user_id, updates)
    return NextResponse.json({ success: updated })

  } catch (error) {
    console.error('Developer profile PUT error:', error)
    return NextResponse.json({ 
      success: false,
      error: (error as Error).message 
    }, { status: 500 })
  }
}
