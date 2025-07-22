import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const width = searchParams.get('width') || '300'
  const height = searchParams.get('height') || '200'
  const text = searchParams.get('text') || 'Placeholder'
  const bg = searchParams.get('bg') || '6366F1'
  
  // Create a simple SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#${bg}"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
            fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">
        ${decodeURIComponent(text)}
      </text>
    </svg>
  `
  
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000',
    },
  })
}
