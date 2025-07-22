import { NextRequest } from 'next/server'
import { 
  getAuthenticatedUser, 
  createErrorResponse, 
  createSuccessResponse,
  createAuthenticatedSupabaseClient 
} from '@/lib/auth'
import crypto from 'crypto'

// Simple encryption/decryption utilities
const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
const IV_LENGTH = 16

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(encryptedData: string): string {
  const [ivHex, encrypted] = encryptedData.split(':')
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// GET /api/credentials - List user's saved credentials
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const supabase = await createAuthenticatedSupabaseClient()

    const { data: credentials, error } = await supabase
      .from('user_credentials')
      .select(`
        id,
        credential_name,
        created_at,
        updated_at,
        integration:integrations(
          id,
          name,
          category,
          auth_method,
          logo_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching credentials:', error)
      return createErrorResponse('Failed to fetch credentials', 500)
    }

    // Don't return encrypted data in list view
    return createSuccessResponse({ credentials })

  } catch (error: any) {
    console.error('Error in GET /api/credentials:', error)
    
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Authentication required', 401)
    }
    
    return createErrorResponse('Internal server error', 500)
  }
}

// POST /api/credentials - Save new credentials
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const body = await request.json()
    const { integration_id, credential_name, credential_data } = body

    if (!integration_id || !credential_name || !credential_data) {
      return createErrorResponse('Missing required fields')
    }

    const supabase = await createAuthenticatedSupabaseClient()

    // Verify integration exists
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('id, name')
      .eq('id', integration_id)
      .single()

    if (integrationError || !integration) {
      return createErrorResponse('Invalid integration', 400)
    }

    // Check if credential name already exists for this user and integration
    const { data: existingCredential, error: existingError } = await supabase
      .from('user_credentials')
      .select('id')
      .eq('user_id', user.id)
      .eq('integration_id', integration_id)
      .eq('credential_name', credential_name)
      .single()

    if (existingCredential) {
      return createErrorResponse('Credential name already exists for this integration', 400)
    }

    // Encrypt the credential data
    const encryptedData = encrypt(JSON.stringify(credential_data))

    // Save the credential
    const { data: newCredential, error: saveError } = await supabase
      .from('user_credentials')
      .insert({
        user_id: user.id,
        integration_id,
        credential_name,
        encrypted_data: encryptedData
      })
      .select(`
        id,
        credential_name,
        created_at,
        integration:integrations(
          id,
          name,
          category,
          auth_method,
          logo_url
        )
      `)
      .single()

    if (saveError) {
      console.error('Error saving credential:', saveError)
      return createErrorResponse('Failed to save credential', 500)
    }

    return createSuccessResponse({ 
      credential: newCredential,
      message: 'Credential saved successfully' 
    }, 201)

  } catch (error: any) {
    console.error('Error in POST /api/credentials:', error)
    
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Authentication required', 401)
    }
    
    return createErrorResponse('Internal server error', 500)
  }
}

// PUT /api/credentials/[id] - Update existing credentials
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const body = await request.json()
    const { id, credential_name, credential_data } = body

    if (!id || !credential_name || !credential_data) {
      return createErrorResponse('Missing required fields')
    }

    const supabase = await createAuthenticatedSupabaseClient()

    // Verify credential exists and belongs to user
    const { data: existingCredential, error: fetchError } = await supabase
      .from('user_credentials')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingCredential || existingCredential.user_id !== user.id) {
      return createErrorResponse('Credential not found', 404)
    }

    // Encrypt the new credential data
    const encryptedData = encrypt(JSON.stringify(credential_data))

    // Update the credential
    const { data: updatedCredential, error: updateError } = await supabase
      .from('user_credentials')
      .update({
        credential_name,
        encrypted_data: encryptedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        id,
        credential_name,
        created_at,
        updated_at,
        integration:integrations(
          id,
          name,
          category,
          auth_method,
          logo_url
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating credential:', updateError)
      return createErrorResponse('Failed to update credential', 500)
    }

    return createSuccessResponse({ 
      credential: updatedCredential,
      message: 'Credential updated successfully' 
    })

  } catch (error: any) {
    console.error('Error in PUT /api/credentials:', error)
    
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Authentication required', 401)
    }
    
    return createErrorResponse('Internal server error', 500)
  }
}

// DELETE /api/credentials/[id] - Delete credentials
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return createErrorResponse('Credential ID required')
    }

    const supabase = await createAuthenticatedSupabaseClient()

    // Verify credential exists and belongs to user
    const { data: existingCredential, error: fetchError } = await supabase
      .from('user_credentials')
      .select('id, user_id, credential_name')
      .eq('id', id)
      .single()

    if (fetchError || !existingCredential || existingCredential.user_id !== user.id) {
      return createErrorResponse('Credential not found', 404)
    }

    // Delete the credential
    const { error: deleteError } = await supabase
      .from('user_credentials')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting credential:', deleteError)
      return createErrorResponse('Failed to delete credential', 500)
    }

    return createSuccessResponse({ 
      message: `Credential "${existingCredential.credential_name}" deleted successfully` 
    })

  } catch (error: any) {
    console.error('Error in DELETE /api/credentials:', error)
    
    if (error.message === 'Unauthorized') {
      return createErrorResponse('Authentication required', 401)
    }
    
    return createErrorResponse('Internal server error', 500)
  }
}
