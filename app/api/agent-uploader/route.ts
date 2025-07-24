import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AgentMetadata {
  name: string
  description: string
  category: string
  version: string
  author: string
  tags: string[]
  price: number
  webhook_url?: string
  credentials_required: CredentialRequirement[]
  schema: any
  documentation?: string
  logo_url?: string
  screenshots?: string[]
}

interface CredentialRequirement {
  service: string
  type: 'oauth' | 'api_key' | 'bearer' | 'basic_auth'
  scopes?: string[]
  required: boolean
  description: string
}

interface UploadValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  metadata?: AgentMetadata
  files?: {
    agent_json: any
    webhook_code?: string
    documentation?: string
    logo?: Buffer
    screenshots?: Buffer[]
  }
}

class AgentUploadManager {
  async validateAndParseUpload(fileBuffer: Buffer, filename: string, userId: string): Promise<UploadValidationResult> {
    const result: UploadValidationResult = {
      valid: false,
      errors: [],
      warnings: [],
      files: {}
    }

    try {
      if (filename.endsWith('.json')) {
        return await this.validateJsonUpload(fileBuffer, result)
      } else if (filename.endsWith('.zip')) {
        return await this.validateZipUpload(fileBuffer, result)
      } else {
        result.errors.push('Unsupported file format. Please upload .json or .zip files only.')
        return result
      }
    } catch (error) {
      result.errors.push(`Upload processing failed: ${(error as Error).message}`)
      return result
    }
  }

  private async validateJsonUpload(fileBuffer: Buffer, result: UploadValidationResult): Promise<UploadValidationResult> {
    try {
      const jsonContent = JSON.parse(fileBuffer.toString('utf-8'))
      const validation = this.validateAgentMetadata(jsonContent)
      
      if (!validation.valid) {
        result.errors.push(...validation.errors)
        result.warnings.push(...validation.warnings)
        return result
      }

      result.metadata = jsonContent
      result.files!.agent_json = jsonContent
      result.valid = true

      // Add warnings for missing optional fields
      if (!jsonContent.documentation) {
        result.warnings.push('No documentation provided. Consider adding a description for better discoverability.')
      }
      if (!jsonContent.logo_url) {
        result.warnings.push('No logo provided. Adding a logo will improve your agent\'s appearance.')
      }

      return result
    } catch (error) {
      result.errors.push('Invalid JSON format. Please ensure your file is properly formatted.')
      return result
    }
  }

  private async validateZipUpload(fileBuffer: Buffer, result: UploadValidationResult): Promise<UploadValidationResult> {
    try {
      const zip = new JSZip()
      const zipContents = await zip.loadAsync(fileBuffer)

      // Required files
      const agentJsonFile = zipContents.file('agent.json')
      if (!agentJsonFile) {
        result.errors.push('Missing required file: agent.json')
        return result
      }

      // Parse agent.json
      const agentJsonContent = await agentJsonFile.async('text')
      let agentMetadata: any
      try {
        agentMetadata = JSON.parse(agentJsonContent)
      } catch (error) {
        result.errors.push('Invalid agent.json format')
        return result
      }

      const metadataValidation = this.validateAgentMetadata(agentMetadata)
      if (!metadataValidation.valid) {
        result.errors.push(...metadataValidation.errors)
        result.warnings.push(...metadataValidation.warnings)
        return result
      }

      result.metadata = agentMetadata
      result.files!.agent_json = agentMetadata

      // Optional webhook file
      const webhookFile = zipContents.file('webhook.ts') || zipContents.file('webhook.js')
      if (webhookFile) {
        result.files!.webhook_code = await webhookFile.async('text')
        
        // Validate webhook code
        const webhookValidation = this.validateWebhookCode(result.files!.webhook_code)
        if (!webhookValidation.valid) {
          result.warnings.push(...webhookValidation.warnings)
        }
      }

      // Optional documentation
      const docsFile = zipContents.file('README.md') || zipContents.file('docs.md') || zipContents.file('documentation.md')
      if (docsFile) {
        result.files!.documentation = await docsFile.async('text')
      } else {
        result.warnings.push('No documentation file found. Consider adding README.md for better user guidance.')
      }

      // Optional logo
      const logoFile = zipContents.file('logo.png') || zipContents.file('logo.jpg') || zipContents.file('logo.svg')
      if (logoFile) {
        result.files!.logo = await logoFile.async('nodebuffer')
      }

      // Optional screenshots
      const screenshotFiles = Object.keys(zipContents.files).filter(name => 
        name.startsWith('screenshots/') && /\.(png|jpg|jpeg|gif)$/i.test(name)
      )
      
      if (screenshotFiles.length > 0) {
        result.files!.screenshots = []
        for (const screenshotPath of screenshotFiles.slice(0, 5)) { // Max 5 screenshots
          const screenshotFile = zipContents.file(screenshotPath)
          if (screenshotFile) {
            result.files!.screenshots.push(await screenshotFile.async('nodebuffer'))
          }
        }
      }

      result.valid = true
      return result

    } catch (error) {
      result.errors.push('Invalid ZIP file or corrupted archive')
      return result
    }
  }

  private validateAgentMetadata(metadata: any): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    // Required fields
    if (!metadata.name || typeof metadata.name !== 'string') {
      errors.push('Missing or invalid agent name')
    } else if (metadata.name.length < 3 || metadata.name.length > 100) {
      errors.push('Agent name must be between 3 and 100 characters')
    }

    if (!metadata.description || typeof metadata.description !== 'string') {
      errors.push('Missing or invalid agent description')
    } else if (metadata.description.length < 10 || metadata.description.length > 500) {
      errors.push('Description must be between 10 and 500 characters')
    }

    if (!metadata.category || typeof metadata.category !== 'string') {
      errors.push('Missing or invalid category')
    } else {
      const validCategories = [
        'productivity', 'communication', 'data-processing', 'automation', 
        'marketing', 'sales', 'finance', 'analytics', 'social-media', 'other'
      ]
      if (!validCategories.includes(metadata.category)) {
        errors.push(`Invalid category. Must be one of: ${validCategories.join(', ')}`)
      }
    }

    if (!metadata.version || typeof metadata.version !== 'string') {
      errors.push('Missing or invalid version')
    } else if (!/^\d+\.\d+\.\d+$/.test(metadata.version)) {
      warnings.push('Version should follow semantic versioning (e.g., 1.0.0)')
    }

    if (!metadata.author || typeof metadata.author !== 'string') {
      errors.push('Missing or invalid author')
    }

    if (metadata.price !== undefined) {
      if (typeof metadata.price !== 'number' || metadata.price < 0) {
        errors.push('Price must be a non-negative number')
      } else if (metadata.price > 10000) {
        warnings.push('High price detected. Consider if this is appropriate for your target market.')
      }
    } else {
      metadata.price = 0 // Default to free
    }

    // Validate tags
    if (metadata.tags) {
      if (!Array.isArray(metadata.tags)) {
        errors.push('Tags must be an array')
      } else {
        if (metadata.tags.length > 10) {
          warnings.push('Too many tags. Consider limiting to 10 or fewer for better discoverability.')
        }
        metadata.tags.forEach((tag: any, index: number) => {
          if (typeof tag !== 'string') {
            errors.push(`Tag at index ${index} must be a string`)
          }
        })
      }
    } else {
      metadata.tags = []
    }

    // Validate webhook URL if provided
    if (metadata.webhook_url) {
      try {
        new URL(metadata.webhook_url)
      } catch (error) {
        errors.push('Invalid webhook URL format')
      }
    }

    // Validate credentials required
    if (metadata.credentials_required) {
      if (!Array.isArray(metadata.credentials_required)) {
        errors.push('credentials_required must be an array')
      } else {
        metadata.credentials_required.forEach((cred: any, index: number) => {
          if (!cred.service || typeof cred.service !== 'string') {
            errors.push(`Credential at index ${index}: missing or invalid service name`)
          }
          if (!cred.type || !['oauth', 'api_key', 'bearer', 'basic_auth'].includes(cred.type)) {
            errors.push(`Credential at index ${index}: invalid type. Must be oauth, api_key, bearer, or basic_auth`)
          }
          if (cred.required !== undefined && typeof cred.required !== 'boolean') {
            errors.push(`Credential at index ${index}: required field must be boolean`)
          }
        })
      }
    } else {
      metadata.credentials_required = []
    }

    // Validate schema
    if (metadata.schema) {
      if (typeof metadata.schema !== 'object') {
        errors.push('Schema must be a valid JSON object')
      } else {
        // Basic schema validation
        if (!metadata.schema.input && !metadata.schema.output) {
          warnings.push('Schema should define input and/or output structures')
        }
      }
    } else {
      warnings.push('No schema provided. Consider adding input/output schema for better integration.')
    }

    return { valid: errors.length === 0, errors, warnings }
  }

  private validateWebhookCode(code: string): { valid: boolean; warnings: string[] } {
    const warnings: string[] = []

    // Basic code validation
    if (code.length > 50000) {
      warnings.push('Webhook code is very large. Consider optimizing for better performance.')
    }

    // Check for common patterns
    if (!code.includes('export') && !code.includes('module.exports')) {
      warnings.push('Webhook code should export a handler function')
    }

    if (code.includes('process.env') && !code.includes('// Environment variables')) {
      warnings.push('Consider documenting required environment variables')
    }

    // Security checks
    if (code.includes('eval(') || code.includes('Function(')) {
      warnings.push('Potential security risk: avoid using eval() or Function() constructor')
    }

    if (code.includes('child_process') || code.includes('fs.write')) {
      warnings.push('File system or process operations detected. Ensure this is necessary and secure.')
    }

    return { valid: true, warnings }
  }

  async uploadFiles(files: any, userId: string): Promise<{ [key: string]: string }> {
    const uploadedUrls: { [key: string]: string } = {}

    // Upload logo if provided
    if (files.logo) {
      const logoPath = `agents/${userId}/logo_${Date.now()}.png`
      const { data: logoData, error: logoError } = await supabase.storage
        .from('agent-assets')
        .upload(logoPath, files.logo, {
          contentType: 'image/png',
          upsert: false
        })

      if (!logoError && logoData) {
        const { data: publicUrl } = supabase.storage
          .from('agent-assets')
          .getPublicUrl(logoPath)
        uploadedUrls.logo_url = publicUrl.publicUrl
      }
    }

    // Upload screenshots if provided
    if (files.screenshots && files.screenshots.length > 0) {
      uploadedUrls.screenshots = []
      for (let i = 0; i < files.screenshots.length; i++) {
        const screenshotPath = `agents/${userId}/screenshot_${Date.now()}_${i}.png`
        const { data: screenshotData, error: screenshotError } = await supabase.storage
          .from('agent-assets')
          .upload(screenshotPath, files.screenshots[i], {
            contentType: 'image/png',
            upsert: false
          })

        if (!screenshotError && screenshotData) {
          const { data: publicUrl } = supabase.storage
            .from('agent-assets')
            .getPublicUrl(screenshotPath)
          uploadedUrls.screenshots.push(publicUrl.publicUrl)
        }
      }
    }

    return uploadedUrls
  }

  async createAgent(metadata: AgentMetadata, files: any, userId: string, uploadedUrls: any): Promise<string> {
    // Merge uploaded URLs with metadata
    const agentData = {
      user_id: userId,
      name: metadata.name,
      description: metadata.description,
      category: metadata.category,
      version: metadata.version,
      author: metadata.author,
      tags: metadata.tags,
      price: metadata.price,
      webhook_url: metadata.webhook_url,
      logo_url: uploadedUrls.logo_url || metadata.logo_url,
      screenshots: uploadedUrls.screenshots || metadata.screenshots || [],
      credentials_required: metadata.credentials_required,
      schema: metadata.schema,
      documentation: files.documentation || metadata.documentation,
      webhook_code: files.webhook_code,
      status: 'draft', // Start as draft for review
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('agents')
      .insert(agentData)
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to create agent: ${error.message}`)
    }

    return data.id
  }

  async updateAgentStatus(agentId: string, status: 'draft' | 'pending_review' | 'approved' | 'rejected', userId: string) {
    const { error } = await supabase
      .from('agents')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', agentId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to update agent status: ${error.message}`)
    }
  }

  async getUploadHistory(userId: string) {
    const { data, error } = await supabase
      .from('agents')
      .select('id, name, status, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get upload history: ${error.message}`)
    }

    return data
  }
}

const uploadManager = new AgentUploadManager()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('user_id') as string
    const action = formData.get('action') as string

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or user_id' }, { status: 400 })
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())

    switch (action) {
      case 'validate':
        const validation = await uploadManager.validateAndParseUpload(fileBuffer, file.name, userId)
        return NextResponse.json({ success: true, validation })

      case 'upload':
        const uploadValidation = await uploadManager.validateAndParseUpload(fileBuffer, file.name, userId)
        
        if (!uploadValidation.valid) {
          return NextResponse.json({ 
            success: false, 
            error: 'Validation failed',
            validation: uploadValidation 
          }, { status: 400 })
        }

        // Upload files to storage
        const uploadedUrls = await uploadManager.uploadFiles(uploadValidation.files!, userId)
        
        // Create agent in database
        const agentId = await uploadManager.createAgent(
          uploadValidation.metadata!,
          uploadValidation.files!,
          userId,
          uploadedUrls
        )

        return NextResponse.json({ 
          success: true, 
          agent_id: agentId,
          validation: uploadValidation
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Agent upload error:', error)
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
    const userId = searchParams.get('user_id')

    switch (type) {
      case 'upload_history':
        if (!userId) {
          return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
        }
        const history = await uploadManager.getUploadHistory(userId)
        return NextResponse.json({ success: true, history })

      case 'validation_schema':
        const schema = {
          required_fields: ['name', 'description', 'category', 'version', 'author'],
          optional_fields: ['tags', 'price', 'webhook_url', 'logo_url', 'screenshots', 'documentation'],
          credential_types: ['oauth', 'api_key', 'bearer', 'basic_auth'],
          categories: [
            'productivity', 'communication', 'data-processing', 'automation',
            'marketing', 'sales', 'finance', 'analytics', 'social-media', 'other'
          ],
          max_file_size: '50MB',
          supported_formats: ['.json', '.zip']
        }
        return NextResponse.json({ success: true, schema })

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Agent upload GET error:', error)
    return NextResponse.json({ 
      success: false,
      error: (error as Error).message 
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { agent_id, user_id, status } = body

    if (!agent_id || !user_id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await uploadManager.updateAgentStatus(agent_id, status, user_id)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Agent upload PATCH error:', error)
    return NextResponse.json({ 
      success: false,
      error: (error as Error).message 
    }, { status: 500 })
  }
}
