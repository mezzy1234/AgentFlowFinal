'use client';

import React, { useState } from 'react';
import { 
  Check, 
  Star, 
  Shield, 
  Award, 
  Globe, 
  Github, 
  Twitter, 
  Linkedin,
  ExternalLink,
  Calendar,
  MapPin,
  Users,
  TrendingUp,
  Zap
} from 'lucide-react';
import Image from 'next/image';

// Developer verification types
export interface DeveloperVerification {
  id: string;
  type: 'email' | 'github' | 'linkedin' | 'domain' | 'identity' | 'revenue' | 'featured';
  verified: boolean;
  verifiedAt?: Date;
  metadata?: Record<string, any>;
}

export interface DeveloperProfile {
  id: string;
  userId: string;
  displayName: string;
  username: string;
  bio?: string;
  avatar?: string;
  location?: string;
  website?: string;
  githubUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  joinedAt: Date;
  verifications: DeveloperVerification[];
  stats: {
    agentsPublished: number;
    totalDownloads: number;
    totalRevenue: number;
    averageRating: number;
    totalReviews: number;
    responseTime: number; // hours
  };
  specialties: string[];
  isVerifiedDeveloper: boolean;
  isFeaturedDeveloper: boolean;
}

// Verification badge component
export function VerificationBadge({ 
  verification,
  size = 'sm' 
}: { 
  verification: DeveloperVerification;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (!verification.verified) return null;

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5', 
    lg: 'h-6 w-6'
  };

  const getBadgeConfig = (type: string) => {
    switch (type) {
      case 'email':
        return { 
          icon: Check, 
          color: 'text-blue-500', 
          bg: 'bg-blue-100',
          title: 'Email Verified' 
        };
      case 'github':
        return { 
          icon: Github, 
          color: 'text-gray-800', 
          bg: 'bg-gray-100',
          title: 'GitHub Connected' 
        };
      case 'linkedin':
        return { 
          icon: Linkedin, 
          color: 'text-blue-600', 
          bg: 'bg-blue-100',
          title: 'LinkedIn Verified' 
        };
      case 'domain':
        return { 
          icon: Globe, 
          color: 'text-green-600', 
          bg: 'bg-green-100',
          title: 'Domain Verified' 
        };
      case 'identity':
        return { 
          icon: Shield, 
          color: 'text-purple-600', 
          bg: 'bg-purple-100',
          title: 'Identity Verified' 
        };
      case 'revenue':
        return { 
          icon: TrendingUp, 
          color: 'text-yellow-600', 
          bg: 'bg-yellow-100',
          title: 'Revenue Milestone' 
        };
      case 'featured':
        return { 
          icon: Award, 
          color: 'text-red-500', 
          bg: 'bg-red-100',
          title: 'Featured Developer' 
        };
      default:
        return { 
          icon: Check, 
          color: 'text-gray-500', 
          bg: 'bg-gray-100',
          title: 'Verified' 
        };
    }
  };

  const config = getBadgeConfig(verification.type);
  const Icon = config.icon;

  return (
    <div 
      className={`inline-flex items-center justify-center rounded-full ${config.bg} p-1`}
      title={config.title}
    >
      <Icon className={`${sizeClasses[size]} ${config.color}`} />
    </div>
  );
}

// Developer profile card component
export function DeveloperProfileCard({ 
  profile, 
  variant = 'compact' 
}: { 
  profile: DeveloperProfile;
  variant?: 'compact' | 'detailed';
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="relative">
            {profile.avatar ? (
              <Image
                src={profile.avatar}
                alt={profile.displayName}
                width={variant === 'detailed' ? 80 : 48}
                height={variant === 'detailed' ? 80 : 48}
                className="rounded-full"
              />
            ) : (
              <div 
                className={`
                  ${variant === 'detailed' ? 'w-20 h-20' : 'w-12 h-12'} 
                  bg-gradient-to-br from-blue-500 to-purple-600 rounded-full 
                  flex items-center justify-center text-white font-semibold
                  ${variant === 'detailed' ? 'text-2xl' : 'text-lg'}
                `}
              >
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            
            {/* Verification badges overlay */}
            <div className="absolute -bottom-1 -right-1 flex space-x-1">
              {profile.verifications
                .filter(v => v.verified && ['featured', 'identity', 'revenue'].includes(v.type))
                .slice(0, 2)
                .map(verification => (
                  <VerificationBadge 
                    key={verification.id} 
                    verification={verification} 
                    size="sm"
                  />
                ))}
            </div>
          </div>
        </div>

        {/* Profile info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {profile.displayName}
            </h3>
            {profile.isVerifiedDeveloper && (
              <div className="flex items-center space-x-1">
                <Shield className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-blue-600 font-medium">Verified</span>
              </div>
            )}
            {profile.isFeaturedDeveloper && (
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-yellow-600 font-medium">Featured</span>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-1">@{profile.username}</p>
          
          {profile.bio && variant === 'detailed' && (
            <p className="text-sm text-gray-700 mb-3">{profile.bio}</p>
          )}

          {/* Stats */}
          <div className="flex items-center space-x-4 text-xs text-gray-500 mb-3">
            <div className="flex items-center space-x-1">
              <Zap className="h-3 w-3" />
              <span>{profile.stats.agentsPublished} agents</span>
            </div>
            <div className="flex items-center space-x-1">
              <Star className="h-3 w-3" />
              <span>{profile.stats.averageRating.toFixed(1)} rating</span>
            </div>
            {variant === 'detailed' && (
              <>
                <div className="flex items-center space-x-1">
                  <Users className="h-3 w-3" />
                  <span>{profile.stats.totalDownloads.toLocaleString()} downloads</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>Joined {profile.joinedAt.getFullYear()}</span>
                </div>
              </>
            )}
          </div>

          {/* Specialties */}
          {profile.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {profile.specialties.slice(0, variant === 'detailed' ? 10 : 3).map((specialty) => (
                <span
                  key={specialty}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                >
                  {specialty}
                </span>
              ))}
            </div>
          )}

          {/* Social links */}
          {variant === 'detailed' && (
            <div className="flex items-center space-x-3">
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              {profile.githubUrl && (
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Github className="h-4 w-4" />
                </a>
              )}
              {profile.twitterUrl && (
                <a
                  href={profile.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Twitter className="h-4 w-4" />
                </a>
              )}
              {profile.linkedinUrl && (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* All verification badges */}
      {variant === 'detailed' && profile.verifications.filter(v => v.verified).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Verifications</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.verifications
              .filter(v => v.verified)
              .map(verification => (
                <div key={verification.id} className="flex items-center space-x-2 bg-gray-50 rounded-full px-3 py-1">
                  <VerificationBadge verification={verification} size="sm" />
                  <span className="text-xs text-gray-600 capitalize">
                    {verification.type.replace('_', ' ')}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// "Made By" attribution component for agent cards
export function MadeByAttribution({ 
  developer, 
  size = 'sm' 
}: { 
  developer: DeveloperProfile;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={`flex items-center space-x-2 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      <span className="text-gray-500">Made by</span>
      <div className="flex items-center space-x-1">
        {developer.avatar ? (
          <Image
            src={developer.avatar}
            alt={developer.displayName}
            width={size === 'sm' ? 16 : 20}
            height={size === 'sm' ? 16 : 20}
            className="rounded-full"
          />
        ) : (
          <div 
            className={`
              ${size === 'sm' ? 'w-4 h-4 text-xs' : 'w-5 h-5 text-sm'} 
              bg-gradient-to-br from-blue-500 to-purple-600 rounded-full 
              flex items-center justify-center text-white font-semibold
            `}
          >
            {developer.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-gray-900 font-medium">{developer.displayName}</span>
        {developer.isVerifiedDeveloper && (
          <Shield className="h-3 w-3 text-blue-500" />
        )}
      </div>
    </div>
  );
}

// Developer verification flow component
export function DeveloperVerificationFlow({ 
  profile, 
  onVerificationComplete 
}: { 
  profile: DeveloperProfile;
  onVerificationComplete: (verification: DeveloperVerification) => void;
}) {
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const availableVerifications = [
    {
      type: 'email',
      title: 'Email Verification',
      description: 'Verify your email address',
      required: true,
      icon: Check
    },
    {
      type: 'github',
      title: 'GitHub Account',
      description: 'Connect your GitHub profile',
      required: false,
      icon: Github
    },
    {
      type: 'linkedin',
      title: 'LinkedIn Profile',
      description: 'Connect your LinkedIn account',
      required: false,
      icon: Linkedin
    },
    {
      type: 'domain',
      title: 'Domain Verification',
      description: 'Verify ownership of your website domain',
      required: false,
      icon: Globe
    },
    {
      type: 'identity',
      title: 'Identity Verification',
      description: 'Verify your identity with official documents',
      required: false,
      icon: Shield
    }
  ];

  const handleVerification = async (type: string) => {
    setActiveStep(type);
    setLoading(true);

    // Mock verification process
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newVerification: DeveloperVerification = {
      id: `verification-${Date.now()}`,
      type: type as any,
      verified: true,
      verifiedAt: new Date()
    };

    onVerificationComplete(newVerification);
    setActiveStep(null);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Developer Verification
        </h3>
        <p className="text-gray-600">
          Complete verifications to build trust with customers and increase your agent visibility.
        </p>
      </div>

      <div className="space-y-4">
        {availableVerifications.map((verification) => {
          const existing = profile.verifications.find(v => v.type === verification.type);
          const isVerified = existing?.verified;
          const isActive = activeStep === verification.type;
          const Icon = verification.icon;

          return (
            <div key={verification.type} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`
                  p-2 rounded-full
                  ${isVerified ? 'bg-green-100' : 'bg-gray-100'}
                `}>
                  <Icon className={`h-5 w-5 ${isVerified ? 'text-green-600' : 'text-gray-500'}`} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">{verification.title}</h4>
                    {verification.required && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{verification.description}</p>
                </div>
              </div>

              <div>
                {isVerified ? (
                  <div className="flex items-center space-x-2 text-green-600">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Verified</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleVerification(verification.type)}
                    disabled={loading}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-md
                      ${isActive 
                        ? 'bg-blue-100 text-blue-700 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                      }
                      ${loading && !isActive ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {isActive ? 'Verifying...' : 'Verify'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Verification progress */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Verification Progress</span>
          <span className="text-sm text-gray-500">
            {profile.verifications.filter(v => v.verified).length} / {availableVerifications.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${(profile.verifications.filter(v => v.verified).length / availableVerifications.length) * 100}%` 
            }}
          />
        </div>
      </div>
    </div>
  );
}
