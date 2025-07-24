import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ValidationResult {
  is_valid: boolean
  errors: any[]
  warnings: any[]
}

class AgentUploadManager {
  private readonly uploadDir = process.env.AGENT_UPLOAD_DIR || '/tmp/agent-uploads'
  private readonly maxFileSize = 50 * 1024 * 1024 // 50MB
  private readonly allowedTypes = ['application/json', 'application/zip', 'text/plain']

  async startUploadSession(
    userId: string,
    filename: string,
    fileSize: number,
    mimeType: string
  ): Promise<{ session_id: string; error?: string }> {
    try {
      // Validate file
      if (fileSize > this.maxFileSize) {
        return { session_id: '', error: 'File size exceeds 50MB limit' }
      }

      if (!this.allowedTypes.includes(mimeType)) {
        return { session_id: '', error: 'Invalid file type. Only JSON, ZIP, and text files are allowed' }
      }

      // Determine upload type from filename/mime type
      let uploadType = 'json'
      if (filename.endsWith('.json')) uploadType = 'json'
      else if (filename.endsWith('.zip')) uploadType = 'zip'
      else if (filename.includes('n8n') || filename.endsWith('.n8n')) uploadType = 'n8n_workflow'

      // Create upload session
      const { data, error } = await supabase.rpc('start_agent_upload_session', {
        p_user_id: userId,
        p_upload_type: uploadType,
        p_filename: filename,
        p_file_size: fileSize
      })

      if (error) {
        return { session_id: '', error: 'Failed to create upload session' }
      }

      return { session_id: data }
    } catch (error) {
      console.error('Upload session error:', error)
      return { session_id: '', error: 'Internal server error' }
    }
  }

  async uploadFile(
    sessionId: string,
    file: File,
    userId: string
  ): Promise<{ success: boolean; file_path?: string; error?: string }> {
    try {
      // Verify session belongs to user
      const { data: session, error: sessionError } = await supabase
        .from('agent_upload_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single()

      if (sessionError || !session) {
        return { success: false, error: 'Invalid upload session' }
      }

      // Create upload directory
      const userUploadDir = path.join(this.uploadDir, userId)
      await mkdir(userUploadDir, { recursive: true })

      // Generate unique filename
      const fileExtension = path.extname(session.original_filename)
      const uniqueFilename = `${sessionId}_${Date.now()}${fileExtension}`
      const filePath = path.join(userUploadDir, uniqueFilename)

      // Save file
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(filePath, buffer)

      // Update session
      const { error: updateError } = await supabase
        .from('agent_upload_sessions')
        .update({
          upload_status: 'uploaded',
          file_path: filePath,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (updateError) {
        return { success: false, error: 'Failed to update upload session' }
      }

      return { success: true, file_path: filePath }
    } catch (error) {
      console.error('File upload error:', error)
      return { success: false, error: 'File upload failed' }
    }
  }

  async validateAgent(
    sessionId: string,
    userId: string
  ): Promise<{ success: boolean; validation_result?: ValidationResult; error?: string }> {
    try {
      // Get session and file
      const { data: session, error: sessionError } = await supabase
        .from('agent_upload_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single()

      if (sessionError || !session || session.upload_status !== 'uploaded') {
        return { success: false, error: 'Invalid session or file not uploaded' }
      }

      // Update status to validating
      await supabase
        .from('agent_upload_sessions')
        .update({
          validation_status: 'in_progress',
          upload_status: 'validating'
        })
        .eq('id', sessionId)

      // Read and parse file
      const fileContent = await this.readUploadedFile(session.file_path, session.upload_type)
      if (!fileContent.success) {
        await this.markValidationFailed(sessionId, [{ error: fileContent.error }])
        return { success: false, error: fileContent.error }
      }

      // Validate agent structure
      const { data: validationResult, error: validationError } = await supabase.rpc('validate_agent_structure', {
        p_session_id: sessionId,
        p_agent_data: fileContent.data
      })

      if (validationError) {
        await this.markValidationFailed(sessionId, [{ error: 'Validation service error' }])
        return { success: false, error: 'Validation service error' }
      }

      const result = validationResult[0]
      
      // Update session with results
      await supabase
        .from('agent_upload_sessions')
        .update({
          validation_status: result.is_valid ? 'passed' : 'failed',
          upload_status: result.is_valid ? 'validated' : 'failed',
          metadata: {
            ...session.metadata,
            agent_data: fileContent.data,
            validation_completed_at: new Date().toISOString()
          }
        })
        .eq('id', sessionId)

      // Log validation completion
      await supabase
        .from('agent_upload_stats')
        .insert({
          user_id: userId,
          upload_session_id: sessionId,
          event_type: 'validation_completed',
          validation_errors_count: result.errors?.length || 0,
          validation_warnings_count: result.warnings?.length || 0,
          metadata: {
            validation_passed: result.is_valid,
            processing_time_ms: Date.now() - new Date(session.updated_at).getTime()
          }
        })

      return { 
        success: true, 
        validation_result: {
          is_valid: result.is_valid,
          errors: result.errors || [],
          warnings: result.warnings || []
        }
      }
    } catch (error) {
      console.error('Validation error:', error)
      await this.markValidationFailed(sessionId, [{ error: 'Validation process failed' }])
      return { success: false, error: 'Validation process failed' }
    }
  }

  private async readUploadedFile(filePath: string, uploadType: string): Promise<{
    success: boolean
    data?: any
    error?: string
  }> {
    try {
      const fs = require('fs').promises
      const fileContent = await fs.readFile(filePath, 'utf-8')
      
      switch (uploadType) {
        case 'json':
        case 'n8n_workflow':
          try {
            const parsedData = JSON.parse(fileContent)
            return { success: true, data: parsedData }
          } catch (parseError) {
            return { success: false, error: 'Invalid JSON format' }
          }
        
        case 'zip':
          // For ZIP files, we'd need to extract and parse them
          return { success: false, error: 'ZIP file processing not yet implemented' }
        
        default:
          return { success: false, error: 'Unsupported file type' }
      }
    } catch (error) {
      return { success: false, error: 'Failed to read uploaded file' }
    }
  }

  private async markValidationFailed(sessionId: string, errors: any[]) {
    await supabase
      .from('agent_upload_sessions')
      .update({
        validation_status: 'failed',
        upload_status: 'failed',
        validation_errors: JSON.stringify(errors)
      })
      .eq('id', sessionId)
  }

  async publishAgent(
    sessionId: string,
    userId: string,
    agentName: string,
    version: string = '1.0.0',
    changelog?: string
  ): Promise<{ success: boolean; agent_id?: string; version_id?: string; error?: string }> {
    try {
      // Get validated session
      const { data: session, error: sessionError } = await supabase
        .from('agent_upload_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .eq('validation_status', 'passed')
        .single()

      if (sessionError || !session) {
        return { success: false, error: 'Invalid session or validation not passed' }
      }

      const agentData = session.metadata.agent_data

      // Check if agent exists or create new one
      let agentId: string
      const { data: existingAgent } = await supabase
        .from('agents')
        .select('id')
        .eq('name', agentName)
        .eq('user_id', userId)
        .single()

      if (existingAgent) {
        agentId = existingAgent.id
      } else {
        // Create new agent
        const { data: newAgent, error: agentError } = await supabase
          .from('agents')
          .insert({
            name: agentName,
            description: agentData.description || '',
            user_id: userId,
            category: agentData.category || 'general',
            tags: agentData.tags || [],
            webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/agents/${crypto.randomUUID()}/webhook`,
            is_public: false
          })
          .select('id')
          .single()

        if (agentError || !newAgent) {
          return { success: false, error: 'Failed to create agent' }
        }
        agentId = newAgent.id
      }

      // Create agent version
      const { data: versionId, error: versionError } = await supabase.rpc('create_agent_version', {
        p_agent_id: agentId,
        p_user_id: userId,
        p_version_number: version,
        p_agent_data: agentData,
        p_upload_session_id: sessionId,
        p_changelog: changelog
      })

      if (versionError) {
        return { success: false, error: 'Failed to create agent version' }
      }

      // Mark session as published
      await supabase
        .from('agent_upload_sessions')
        .update({
          upload_status: 'published',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      return { 
        success: true, 
        agent_id: agentId, 
        version_id: versionId 
      }
    } catch (error) {
      console.error('Agent publication error:', error)
      return { success: false, error: 'Agent publication failed' }
    }
  }

  async getUploadProgress(sessionId: string, userId: string) {
    const { data, error } = await supabase.rpc('get_upload_progress', {
      p_session_id: sessionId
    })

    if (error || !data || data.length === 0) {
      return { error: 'Session not found' }
    }

    return data[0]
  }

  async getAgentTemplates(category?: string) {
    let query = supabase
      .from('agent_templates')
      .select('*')
      .eq('is_active', true)

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query.order('usage_count', { ascending: false })

    if (error) {
      return { templates: [], error: 'Failed to fetch templates' }
    }

    return { templates: data || [] }
  }

  async getUserUploads(userId: string, limit: number = 20) {
    const { data, error } = await supabase
      .from('agent_upload_sessions')
      .select(`
        *,
        agent_versions (
          id,
          agent_id,
          version_number,
          is_published,
          download_count
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return { uploads: [], error: 'Failed to fetch uploads' }
    }

    return { uploads: data || [] }
  }
}

const uploadManager = new AgentUploadManager()

// POST /api/agent-upload - Start upload session or process upload
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const action = formData.get('action') as string
    const userId = formData.get('user_id') as string

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    }

    switch (action) {
      case 'start_session':
        return await handleStartSession(formData, userId)
      case 'upload_file':
        return await handleFileUpload(formData, userId)
      case 'validate':
        return await handleValidation(formData, userId)
      case 'publish':
        return await handlePublication(formData, userId)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Agent upload API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleStartSession(formData: FormData, userId: string) {
  const filename = formData.get('filename') as string
  const fileSize = parseInt(formData.get('file_size') as string)
  const mimeType = formData.get('mime_type') as string

  if (!filename || !fileSize || !mimeType) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  const result = await uploadManager.startUploadSession(userId, filename, fileSize, mimeType)
  
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ session_id: result.session_id })
}

async function handleFileUpload(formData: FormData, userId: string) {
  const sessionId = formData.get('session_id') as string
  const file = formData.get('file') as File

  if (!sessionId || !file) {
    return NextResponse.json({ error: 'Missing session_id or file' }, { status: 400 })
  }

  const result = await uploadManager.uploadFile(sessionId, file, userId)
  
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true, file_path: result.file_path })
}

async function handleValidation(formData: FormData, userId: string) {
  const sessionId = formData.get('session_id') as string

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }

  const result = await uploadManager.validateAgent(sessionId, userId)
  
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ 
    success: true, 
    validation_result: result.validation_result 
  })
}

async function handlePublication(formData: FormData, userId: string) {
  const sessionId = formData.get('session_id') as string
  const agentName = formData.get('agent_name') as string
  const version = formData.get('version') as string || '1.0.0'
  const changelog = formData.get('changelog') as string

  if (!sessionId || !agentName) {
    return NextResponse.json({ error: 'Missing session_id or agent_name' }, { status: 400 })
  }

  const result = await uploadManager.publishAgent(sessionId, userId, agentName, version, changelog)
  
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ 
    success: true, 
    agent_id: result.agent_id,
    version_id: result.version_id
  })
}

// GET /api/agent-upload - Get upload progress, templates, or user uploads
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const userId = searchParams.get('user_id')

  if (!userId && action !== 'templates') {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
  }

  try {
    switch (action) {
      case 'progress':
        const sessionId = searchParams.get('session_id')
        if (!sessionId) {
          return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
        }
        const progress = await uploadManager.getUploadProgress(sessionId, userId!)
        return NextResponse.json(progress)
      
      case 'templates':
        const category = searchParams.get('category')
        const templates = await uploadManager.getAgentTemplates(category || undefined)
        return NextResponse.json(templates)
      
      case 'user_uploads':
        const limit = parseInt(searchParams.get('limit') || '20')
        const uploads = await uploadManager.getUserUploads(userId!, limit)
        return NextResponse.json(uploads)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Agent upload GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
