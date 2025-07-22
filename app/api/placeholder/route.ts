import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const width = parseInt(searchParams.get('width') || '300')
  const height = parseInt(searchParams.get('height') || '200')
  const text = searchParams.get('text') || 'Placeholder'
  const bg = searchParams.get('bg') || '6B7280'
  
  // Create SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#${bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#${bg}cc;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" font-weight="bold" text-anchor="middle" dy="0.3em" fill="white">
        ${text.replace(/\+/g, ' ')}
      </text>
    </svg>
  `
  
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000'
    }
  })
}
