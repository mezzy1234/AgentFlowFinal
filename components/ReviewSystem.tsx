'use client';

import React, { useState, useEffect } from 'react';
import { 
  Star,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Filter,
  Sort,
  User,
  Calendar,
  Award,
  TrendingUp,
  Users,
  BarChart3,
  Search,
  Reply,
  Heart,
  MoreHorizontal,
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  Target
} from 'lucide-react';

// Types
export interface AgentReview {
  id: string;
  agent_id: string;
  user_id: string;
  rating: number;
  title?: string;
  comment: string;
  execution_id?: string;
  is_verified_purchase: boolean;
  pros?: string[];
  cons?: string[];
  use_case?: string;
  recommendation?: 'highly_recommend' | 'recommend' | 'neutral' | 'not_recommend';
  helpful_count: number;
  not_helpful_count: number;
  user_helpful_vote?: 'helpful' | 'not_helpful';
  flagged: boolean;
  moderator_notes?: string;
  developer_response?: {
    id: string;
    message: string;
    created_at: string;
    developer_name: string;
    developer_avatar?: string;
  };
  created_at: string;
  updated_at: string;
  user_name: string;
  user_avatar?: string;
  user_badge?: string;
}

export interface ReviewSummary {
  total_reviews: number;
  average_rating: number;
  rating_distribution: Record<number, number>;
  verified_reviews: number;
  recent_trend: 'up' | 'down' | 'stable';
}

// Main Review System Component
export function ReviewSystem({ 
  agentId, 
  showWriteReview = true,
  isDeveloper = false 
}: { 
  agentId: string; 
  showWriteReview?: boolean;
  isDeveloper?: boolean;
}) {
  const [reviews, setReviews] = useState<AgentReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful'>('newest');
  const [filterBy, setFilterBy] = useState<'all' | '5' | '4' | '3' | '2' | '1' | 'verified'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchReviews();
    fetchSummary();
  }, [agentId, sortBy, filterBy, searchQuery]);

  const fetchReviews = async () => {
    try {
      const params = new URLSearchParams({
        sort: sortBy,
        filter: filterBy,
        search: searchQuery
      });
      
      const response = await fetch(`/api/agents/${agentId}/reviews?${params}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      
      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}/reviews/summary`);
      if (!response.ok) throw new Error('Failed to fetch summary');
      
      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const handleReviewSubmitted = () => {
    setShowWriteForm(false);
    fetchReviews();
    fetchSummary();
  };

  return (
    <div className="space-y-6">
      {/* Review Summary */}
      {summary && <ReviewSummarySection summary={summary} />}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex items-center space-x-4">
          {/* Sort */}
          <div className="flex items-center space-x-2">
            <Sort className="h-4 w-4 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="highest">Highest Rating</option>
              <option value="lowest">Lowest Rating</option>
              <option value="helpful">Most Helpful</option>
            </select>
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Reviews</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
              <option value="verified">Verified Only</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Write Review Button */}
          {showWriteReview && (
            <button
              onClick={() => setShowWriteForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Write Review</span>
            </button>
          )}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {loading ? (
          <ReviewSkeleton />
        ) : reviews.length === 0 ? (
          <EmptyReviews showWriteReview={showWriteReview} onWriteReview={() => setShowWriteForm(true)} />
        ) : (
          reviews.map((review) => (
            <ReviewCard 
              key={review.id} 
              review={review} 
              isDeveloper={isDeveloper}
              onUpdate={fetchReviews}
            />
          ))
        )}
      </div>

      {/* Write Review Modal */}
      {showWriteForm && (
        <WriteReviewModal
          agentId={agentId}
          onClose={() => setShowWriteForm(false)}
          onSubmit={handleReviewSubmitted}
        />
      )}
    </div>
  );
}

// Review Summary Section
function ReviewSummarySection({ summary }: { summary: ReviewSummary }) {
  const getTrendIcon = () => {
    switch (summary.recent_trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingUp className="h-4 w-4 text-red-600 transform rotate-180" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Rating */}
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-900 mb-2">
            {summary.average_rating.toFixed(1)}
          </div>
          <div className="flex items-center justify-center mb-2">
            <StarRating rating={summary.average_rating} size="md" />
          </div>
          <div className="text-sm text-gray-600 flex items-center justify-center space-x-1">
            <span>{summary.total_reviews} reviews</span>
            {getTrendIcon()}
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Rating Distribution</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = summary.rating_distribution[rating] || 0;
              const percentage = summary.total_reviews > 0 ? (count / summary.total_reviews) * 100 : 0;
              
              return (
                <div key={rating} className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600 w-8">{rating}★</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                </div>
              );
            })}
          </div>
          
          {summary.verified_reviews > 0 && (
            <div className="flex items-center space-x-2 mt-4">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-600">
                {summary.verified_reviews} verified purchases
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Review Card Component
function ReviewCard({ 
  review, 
  isDeveloper,
  onUpdate 
}: { 
  review: AgentReview; 
  isDeveloper: boolean;
  onUpdate: () => void;
}) {
  const [showDeveloperResponse, setShowDeveloperResponse] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleHelpfulVote = async (vote: 'helpful' | 'not_helpful') => {
    try {
      const response = await fetch(`/api/reviews/${review.id}/helpful`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote })
      });

      if (!response.ok) throw new Error('Failed to vote');
      onUpdate();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const getRecommendationBadge = () => {
    if (!review.recommendation) return null;
    
    const badges = {
      highly_recommend: { text: 'Highly Recommends', color: 'bg-green-100 text-green-700', icon: Award },
      recommend: { text: 'Recommends', color: 'bg-blue-100 text-blue-700', icon: ThumbsUp },
      neutral: { text: 'Neutral', color: 'bg-gray-100 text-gray-700', icon: Target },
      not_recommend: { text: 'Not Recommended', color: 'bg-red-100 text-red-700', icon: ThumbsDown }
    };
    
    const badge = badges[review.recommendation];
    const Icon = badge.icon;
    
    return (
      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3" />
        <span>{badge.text}</span>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            {review.user_avatar ? (
              <img src={review.user_avatar} alt={review.user_name} className="w-10 h-10 rounded-full" />
            ) : (
              <User className="h-5 w-5 text-gray-500" />
            )}
          </div>
          
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">{review.user_name}</span>
              {review.is_verified_purchase && (
                <div className="flex items-center space-x-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs">Verified</span>
                </div>
              )}
              {review.user_badge && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                  {review.user_badge}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <StarRating rating={review.rating} size="sm" />
              <span className="text-sm text-gray-500">
                {new Date(review.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {getRecommendationBadge()}
          <button
            onClick={() => setShowReportModal(true)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Title */}
      {review.title && (
        <h3 className="font-semibold text-gray-900 mb-3">{review.title}</h3>
      )}

      {/* Comment */}
      <p className="text-gray-700 mb-4 leading-relaxed">{review.comment}</p>

      {/* Pros & Cons */}
      {(review.pros?.length > 0 || review.cons?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {review.pros?.length > 0 && (
            <div>
              <h4 className="font-medium text-green-700 mb-2 flex items-center space-x-1">
                <ThumbsUp className="h-4 w-4" />
                <span>Pros</span>
              </h4>
              <ul className="space-y-1">
                {review.pros.map((pro, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                    <span className="text-green-500 mt-1">•</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {review.cons?.length > 0 && (
            <div>
              <h4 className="font-medium text-red-700 mb-2 flex items-center space-x-1">
                <ThumbsDown className="h-4 w-4" />
                <span>Cons</span>
              </h4>
              <ul className="space-y-1">
                {review.cons.map((con, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                    <span className="text-red-500 mt-1">•</span>
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
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-1">Use Case</h4>
          <p className="text-sm text-blue-800">{review.use_case}</p>
        </div>
      )}

      {/* Developer Response */}
      {review.developer_response && (
        <div className="border-l-4 border-blue-500 pl-4 mb-4 bg-blue-50 p-3 rounded">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-bold">D</span>
            </div>
            <span className="font-medium text-blue-900">Developer Response</span>
            <span className="text-sm text-blue-600">
              {new Date(review.developer_response.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="text-blue-800 text-sm">{review.developer_response.message}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-4">
          {/* Helpful Votes */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Was this helpful?</span>
            <button
              onClick={() => handleHelpfulVote('helpful')}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-sm transition-colors ${
                review.user_helpful_vote === 'helpful'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-500 hover:text-green-600'
              }`}
            >
              <ThumbsUp className="h-3 w-3" />
              <span>{review.helpful_count}</span>
            </button>
            
            <button
              onClick={() => handleHelpfulVote('not_helpful')}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-sm transition-colors ${
                review.user_helpful_vote === 'not_helpful'
                  ? 'bg-red-100 text-red-700'
                  : 'text-gray-500 hover:text-red-600'
              }`}
            >
              <ThumbsDown className="h-3 w-3" />
              <span>{review.not_helpful_count}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Developer Actions */}
          {isDeveloper && !review.developer_response && (
            <button
              onClick={() => setShowDeveloperResponse(true)}
              className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
            >
              <Reply className="h-3 w-3" />
              <span>Respond</span>
            </button>
          )}
          
          <button
            onClick={() => setShowReportModal(true)}
            className="text-gray-500 hover:text-red-600 text-sm flex items-center space-x-1"
          >
            <Flag className="h-3 w-3" />
            <span>Report</span>
          </button>
        </div>
      </div>

      {/* Developer Response Modal */}
      {showDeveloperResponse && (
        <DeveloperResponseModal
          reviewId={review.id}
          onClose={() => setShowDeveloperResponse(false)}
          onSubmit={onUpdate}
        />
      )}

      {/* Report Modal */}
      {showReportModal && (
        <ReportReviewModal
          reviewId={review.id}
          onClose={() => setShowReportModal(false)}
          onSubmit={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}

// Star Rating Component
function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            star <= rating
              ? 'text-yellow-400 fill-current'
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

// Empty Reviews State
function EmptyReviews({ 
  showWriteReview, 
  onWriteReview 
}: { 
  showWriteReview: boolean; 
  onWriteReview: () => void; 
}) {
  return (
    <div className="text-center py-12">
      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reviews Yet</h3>
      <p className="text-gray-600 mb-6">
        Be the first to review this agent and help others make informed decisions.
      </p>
      {showWriteReview && (
        <button
          onClick={onWriteReview}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Write the First Review
        </button>
      )}
    </div>
  );
}

// Review Skeleton Loader
function ReviewSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-300 rounded-full" />
            <div>
              <div className="h-4 bg-gray-300 rounded w-32 mb-2" />
              <div className="h-3 bg-gray-300 rounded w-20" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 rounded w-full" />
            <div className="h-4 bg-gray-300 rounded w-3/4" />
            <div className="h-4 bg-gray-300 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Write Review Modal (placeholder)
function WriteReviewModal({
  agentId,
  onClose,
  onSubmit
}: {
  agentId: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Write Review - Coming Soon</h2>
          <p className="text-gray-600 mb-6">
            Full review writing functionality will be implemented here with star rating, 
            title, comment, pros/cons, and recommendation options.
          </p>
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Developer Response Modal (placeholder)
function DeveloperResponseModal({
  reviewId,
  onClose,
  onSubmit
}: {
  reviewId: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Developer Response - Coming Soon</h2>
          <p className="text-gray-600 mb-6">
            Developer response functionality will be implemented here.
          </p>
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Report Review Modal (placeholder)
function ReportReviewModal({
  reviewId,
  onClose,
  onSubmit
}: {
  reviewId: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Report Review - Coming Soon</h2>
          <p className="text-gray-600 mb-6">
            Review reporting functionality will be implemented here.
          </p>
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
