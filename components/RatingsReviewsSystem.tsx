'use client';

import React, { useState, useEffect } from 'react';
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  Flag, 
  MessageCircle, 
  Shield, 
  Award,
  Calendar,
  User,
  CheckCircle,
  Filter,
  TrendingUp,
  BarChart
} from 'lucide-react';
import Image from 'next/image';

// Types
export interface AgentRating {
  id: string;
  agent_id: string;
  user_id: string;
  rating: number;
  rating_aspects?: {
    ease_of_use?: number;
    effectiveness?: number;
    documentation?: number;
    support?: number;
  };
  is_verified_purchase: boolean;
  created_at: Date;
}

export interface AgentReview {
  id: string;
  agent_id: string;
  user_id: string;
  rating_id: string;
  title?: string;
  review_text?: string;
  pros: string[];
  cons: string[];
  is_verified_purchase: boolean;
  use_case?: string;
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  helpful_votes: number;
  total_votes: number;
  helpful_percentage: number;
  is_public: boolean;
  is_featured: boolean;
  is_flagged: boolean;
  moderation_status: 'pending' | 'approved' | 'rejected' | 'flagged';
  created_at: Date;
  updated_at: Date;
  user: {
    name: string;
    avatar?: string;
    verified: boolean;
  };
  developer_response?: {
    id: string;
    response_text: string;
    created_at: Date;
    is_verified_developer: boolean;
  };
}

export interface RatingSummary {
  agent_id: string;
  total_ratings: number;
  average_rating: number;
  rating_distribution: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
  };
  total_reviews: number;
  verified_reviews: number;
  featured_reviews: number;
  aspect_ratings: {
    ease_of_use?: number;
    effectiveness?: number;
    documentation?: number;
    support?: number;
  };
}

// Star rating component
export function StarRating({ 
  rating, 
  maxRating = 5, 
  size = 'md',
  interactive = false,
  onRatingChange,
  showValue = false 
}: {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showValue?: boolean;
}) {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  const handleClick = (value: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(value);
    }
  };

  const getStarColor = (index: number) => {
    const activeRating = interactive ? (hoverRating || rating) : rating;
    if (index <= activeRating) {
      return 'text-yellow-400 fill-current';
    }
    return 'text-gray-300';
  };

  return (
    <div className="flex items-center space-x-1">
      <div className="flex space-x-0.5">
        {Array.from({ length: maxRating }, (_, index) => (
          <Star
            key={index}
            className={`${sizeClasses[size]} ${getStarColor(index + 1)} ${
              interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''
            }`}
            onClick={() => handleClick(index + 1)}
            onMouseEnter={() => interactive && setHoverRating(index + 1)}
            onMouseLeave={() => interactive && setHoverRating(0)}
          />
        ))}
      </div>
      {showValue && (
        <span className="text-sm text-gray-600 ml-2">
          {rating.toFixed(1)} / {maxRating}
        </span>
      )}
    </div>
  );
}

// Rating breakdown component
export function RatingBreakdown({ summary }: { summary: RatingSummary }) {
  const getRatingPercentage = (count: number) => {
    return summary.total_ratings > 0 ? (count / summary.total_ratings) * 100 : 0;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Ratings & Reviews</h3>
        <div className="text-right">
          <div className="flex items-center space-x-2">
            <StarRating rating={summary.average_rating} showValue />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Based on {summary.total_ratings} ratings
          </p>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="space-y-2 mb-6">
        {[5, 4, 3, 2, 1].map((stars) => (
          <div key={stars} className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 w-16">
              <span className="text-sm text-gray-600">{stars}</span>
              <Star className="h-3 w-3 text-yellow-400 fill-current" />
            </div>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${getRatingPercentage(summary.rating_distribution[stars.toString() as keyof typeof summary.rating_distribution])}%` 
                }}
              />
            </div>
            <span className="text-sm text-gray-600 w-12 text-right">
              {summary.rating_distribution[stars.toString() as keyof typeof summary.rating_distribution]}
            </span>
          </div>
        ))}
      </div>

      {/* Aspect Ratings */}
      {Object.keys(summary.aspect_ratings).length > 0 && (
        <div className="border-t border-gray-100 pt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Rating Breakdown</h4>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(summary.aspect_ratings).map(([aspect, rating]) => (
              <div key={aspect} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">
                  {aspect.replace('_', ' ')}
                </span>
                <div className="flex items-center space-x-2">
                  <StarRating rating={rating || 0} size="sm" />
                  <span className="text-sm text-gray-500">{(rating || 0).toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Stats */}
      <div className="border-t border-gray-100 pt-6 mt-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">{summary.total_reviews}</div>
            <div className="text-xs text-gray-500">Total Reviews</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-green-600">{summary.verified_reviews}</div>
            <div className="text-xs text-gray-500">Verified</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-blue-600">{summary.featured_reviews}</div>
            <div className="text-xs text-gray-500">Featured</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Review card component
export function ReviewCard({ 
  review, 
  showAgentInfo = false,
  onHelpfulVote,
  onFlag,
  userVote 
}: {
  review: AgentReview;
  showAgentInfo?: boolean;
  onHelpfulVote?: (reviewId: string, helpful: boolean) => void;
  onFlag?: (reviewId: string) => void;
  userVote?: 'helpful' | 'not_helpful' | null;
}) {
  const getExperienceBadgeColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Review Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          {/* User Avatar */}
          <div className="flex-shrink-0">
            {review.user.avatar ? (
              <Image
                src={review.user.avatar}
                alt={review.user.name}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {review.user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-gray-900">{review.user.name}</h4>
              {review.user.verified && (
                <CheckCircle className="h-4 w-4 text-blue-500" />
              )}
              {review.is_verified_purchase && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                  <Shield className="h-3 w-3" />
                  <span>Verified Purchase</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <StarRating rating={review.rating_id ? 5 : 0} size="sm" /> {/* Need to get rating from rating_id */}
              <span>•</span>
              <span>{formatDate(review.created_at)}</span>
              <span>•</span>
              <span className={`px-2 py-1 rounded-full text-xs ${getExperienceBadgeColor(review.experience_level)}`}>
                {review.experience_level}
              </span>
            </div>
          </div>
        </div>

        {/* Review Badges */}
        <div className="flex items-center space-x-2">
          {review.is_featured && (
            <Award className="h-4 w-4 text-yellow-500" />
          )}
          {review.is_flagged && (
            <Flag className="h-4 w-4 text-red-500" />
          )}
        </div>
      </div>

      {/* Review Title */}
      {review.title && (
        <h3 className="text-lg font-medium text-gray-900 mb-3">{review.title}</h3>
      )}

      {/* Review Text */}
      {review.review_text && (
        <div className="text-gray-700 mb-4">
          <p className="leading-relaxed">{review.review_text}</p>
        </div>
      )}

      {/* Pros and Cons */}
      {(review.pros.length > 0 || review.cons.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {review.pros.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-green-700 mb-2">👍 Pros</h5>
              <ul className="space-y-1">
                {review.pros.map((pro, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                    <span className="text-green-500 mt-0.5">•</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {review.cons.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-red-700 mb-2">👎 Cons</h5>
              <ul className="space-y-1">
                {review.cons.map((con, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Use Case */}
      {review.use_case && (
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <h5 className="text-sm font-medium text-blue-900 mb-1">Use Case</h5>
          <p className="text-sm text-blue-800">{review.use_case}</p>
        </div>
      )}

      {/* Developer Response */}
      {review.developer_response && (
        <div className="border-l-4 border-blue-500 bg-blue-50 pl-4 pr-3 py-3 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <MessageCircle className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Developer Response</span>
            {review.developer_response.is_verified_developer && (
              <CheckCircle className="h-3 w-3 text-blue-600" />
            )}
          </div>
          <p className="text-sm text-blue-800">{review.developer_response.response_text}</p>
          <p className="text-xs text-blue-600 mt-2">
            {formatDate(review.developer_response.created_at)}
          </p>
        </div>
      )}

      {/* Review Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onHelpfulVote?.(review.id, true)}
            className={`flex items-center space-x-1 text-sm ${
              userVote === 'helpful' 
                ? 'text-green-600' 
                : 'text-gray-500 hover:text-green-600'
            } transition-colors duration-200`}
          >
            <ThumbsUp className="h-4 w-4" />
            <span>Helpful ({review.helpful_votes})</span>
          </button>

          <button
            onClick={() => onHelpfulVote?.(review.id, false)}
            className={`flex items-center space-x-1 text-sm ${
              userVote === 'not_helpful' 
                ? 'text-red-600' 
                : 'text-gray-500 hover:text-red-600'
            } transition-colors duration-200`}
          >
            <ThumbsDown className="h-4 w-4" />
          </button>

          <button
            onClick={() => onFlag?.(review.id)}
            className="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-600 transition-colors duration-200"
          >
            <Flag className="h-4 w-4" />
            <span>Report</span>
          </button>
        </div>

        <div className="text-xs text-gray-500">
          {review.total_votes > 0 && (
            <span>{review.helpful_percentage.toFixed(0)}% found helpful</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Review form component
export function ReviewForm({ 
  agentId, 
  onSubmit, 
  initialReview 
}: {
  agentId: string;
  onSubmit: (review: Partial<AgentReview>) => void;
  initialReview?: Partial<AgentReview>;
}) {
  const [formData, setFormData] = useState({
    rating: initialReview?.rating_id ? 5 : 0, // Need to get actual rating
    title: initialReview?.title || '',
    review_text: initialReview?.review_text || '',
    pros: initialReview?.pros || [],
    cons: initialReview?.cons || [],
    use_case: initialReview?.use_case || '',
    experience_level: initialReview?.experience_level || 'intermediate',
    ...initialReview
  });

  const [newPro, setNewPro] = useState('');
  const [newCon, setNewCon] = useState('');

  const addPro = () => {
    if (newPro.trim()) {
      setFormData(prev => ({
        ...prev,
        pros: [...prev.pros, newPro.trim()]
      }));
      setNewPro('');
    }
  };

  const addCon = () => {
    if (newCon.trim()) {
      setFormData(prev => ({
        ...prev,
        cons: [...prev.cons, newCon.trim()]
      }));
      setNewCon('');
    }
  };

  const removePro = (index: number) => {
    setFormData(prev => ({
      ...prev,
      pros: prev.pros.filter((_, i) => i !== index)
    }));
  };

  const removeCon = (index: number) => {
    setFormData(prev => ({
      ...prev,
      cons: prev.cons.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Write a Review</h3>

      {/* Overall Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Overall Rating
        </label>
        <StarRating
          rating={formData.rating}
          interactive
          size="lg"
          onRatingChange={(rating) => setFormData(prev => ({ ...prev, rating }))}
          showValue
        />
      </div>

      {/* Review Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Review Title (Optional)
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Summarize your experience..."
        />
      </div>

      {/* Review Text */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Detailed Review
        </label>
        <textarea
          value={formData.review_text}
          onChange={(e) => setFormData(prev => ({ ...prev, review_text: e.target.value }))}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Share your experience with this agent..."
        />
      </div>

      {/* Experience Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Experience Level
        </label>
        <select
          value={formData.experience_level}
          onChange={(e) => setFormData(prev => ({ ...prev, experience_level: e.target.value as any }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Use Case */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          How did you use this agent? (Optional)
        </label>
        <input
          type="text"
          value={formData.use_case}
          onChange={(e) => setFormData(prev => ({ ...prev, use_case: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., Customer service automation, Data analysis, Content creation..."
        />
      </div>

      {/* Pros and Cons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What did you like? (Optional)
          </label>
          <div className="space-y-2">
            {formData.pros.map((pro, index) => (
              <div key={index} className="flex items-center space-x-2 bg-green-50 p-2 rounded">
                <span className="text-sm text-gray-700 flex-1">{pro}</span>
                <button
                  type="button"
                  onClick={() => removePro(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
            <div className="flex space-x-2">
              <input
                type="text"
                value={newPro}
                onChange={(e) => setNewPro(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                placeholder="Add a positive point..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPro())}
              />
              <button
                type="button"
                onClick={addPro}
                className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What could be improved? (Optional)
          </label>
          <div className="space-y-2">
            {formData.cons.map((con, index) => (
              <div key={index} className="flex items-center space-x-2 bg-red-50 p-2 rounded">
                <span className="text-sm text-gray-700 flex-1">{con}</span>
                <button
                  type="button"
                  onClick={() => removeCon(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
            <div className="flex space-x-2">
              <input
                type="text"
                value={newCon}
                onChange={(e) => setNewCon(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                placeholder="Add an improvement suggestion..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCon())}
              />
              <button
                type="button"
                onClick={addCon}
                className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={formData.rating === 0}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {initialReview ? 'Update Review' : 'Submit Review'}
        </button>
      </div>
    </form>
  );
}

// Review analytics component
export function ReviewAnalytics({ agentId }: { agentId: string }) {
  // Mock data (replace with real analytics)
  const analytics = {
    review_trends: [
      { date: '2024-01', reviews: 12, average_rating: 4.2 },
      { date: '2024-02', reviews: 18, average_rating: 4.3 },
      { date: '2024-03', reviews: 25, average_rating: 4.5 },
    ],
    sentiment_analysis: {
      positive: 78,
      neutral: 15,
      negative: 7
    },
    common_keywords: [
      { keyword: 'easy to use', count: 23 },
      { keyword: 'great results', count: 19 },
      { keyword: 'helpful support', count: 15 },
      { keyword: 'slow response', count: 8 },
    ]
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Review Analytics</h3>
        <BarChart className="h-5 w-5 text-gray-400" />
      </div>

      {/* Sentiment Overview */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Sentiment Analysis</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Positive</span>
            <span className="text-sm font-medium text-green-600">{analytics.sentiment_analysis.positive}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full" 
              style={{ width: `${analytics.sentiment_analysis.positive}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Neutral</span>
            <span className="text-sm font-medium text-gray-600">{analytics.sentiment_analysis.neutral}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gray-400 h-2 rounded-full" 
              style={{ width: `${analytics.sentiment_analysis.neutral}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Negative</span>
            <span className="text-sm font-medium text-red-600">{analytics.sentiment_analysis.negative}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-red-500 h-2 rounded-full" 
              style={{ width: `${analytics.sentiment_analysis.negative}%` }}
            />
          </div>
        </div>
      </div>

      {/* Common Keywords */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Common Keywords</h4>
        <div className="space-y-2">
          {analytics.common_keywords.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{item.keyword}</span>
              <span className="text-sm text-gray-500">{item.count} mentions</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
