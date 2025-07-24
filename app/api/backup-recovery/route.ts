import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface BackupConfig {
  backup_type: 'full' | 'incremental' | 'differential'
  schedule: 'daily' | 'weekly' | 'monthly'
  retention_days: number
  encryption_enabled: boolean
  storage_provider: 'supabase' | 's3' | 'gcs'
  notify_on_completion: boolean
}

interface RestoreRequest {
  backup_id: string
  restore_type: 'full' | 'partial'
  target_tables?: string[]
  restore_point?: string
  confirm_data_loss: boolean
}

interface BackupManifest {
  backup_id: string
  backup_type: string
  created_at: string
  tables_included: string[]
  total_records: number
  file_size_bytes: number
  checksum: string
  encryption_key?: string
}

class BackupRecoverySystem {
  private readonly CRITICAL_TABLES = [
    'profiles',
    'agents',
    'agent_purchases',
    'user_integrations',
    'agent_run_logs',
    'developer_payouts'
  ]

  async createBackup(adminId: string, config: BackupConfig) {
    try {
      // Verify admin access
      const hasAccess = await this.verifyAdminAccess(adminId)
      if (!hasAccess) {
        return {
          success: false,
          error: 'Admin access required for backup operations'
        }
      }

      const backupId = `backup_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
      
      // Create backup record
      const { data: backupRecord, error: backupError } = await supabase
        .from('system_backups')
        .insert({
          backup_id: backupId,
          backup_type: config.backup_type,
          status: 'in_progress',
          initiated_by: adminId,
          config: config,
          started_at: new Date().toISOString()
        })
        .select()
        .single()

      if (backupError) throw backupError

      // Start backup process
      const backupResult = await this.performBackup(backupId, config)
      
      if (!backupResult.success) {
        // Update backup record with failure
        await supabase
          .from('system_backups')
          .update({
            status: 'failed',
            error_message: backupResult.error,
            completed_at: new Date().toISOString()
          })
          .eq('backup_id', backupId)

        return backupResult
      }

      // Update backup record with success
      await supabase
        .from('system_backups')
        .update({
          status: 'completed',
          manifest: backupResult.manifest,
          file_path: backupResult.file_path,
          completed_at: new Date().toISOString()
        })
        .eq('backup_id', backupId)

      // Send notification if requested
      if (config.notify_on_completion) {
        await this.notifyBackupCompletion(backupId, adminId, true)
      }

      return {
        success: true,
        backup_id: backupId,
        manifest: backupResult.manifest,
        message: 'Backup completed successfully'
      }
    } catch (error) {
      console.error('Backup creation error:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async performBackup(backupId: string, config: BackupConfig) {
    try {
      const manifest: BackupManifest = {
        backup_id: backupId,
        backup_type: config.backup_type,
        created_at: new Date().toISOString(),
        tables_included: [],
        total_records: 0,
        file_size_bytes: 0,
        checksum: ''
      }

      let backupData: any = {}
      let totalRecords = 0

      // Determine which tables to backup
      const tablesToBackup = config.backup_type === 'full' 
        ? this.CRITICAL_TABLES 
        : await this.getIncrementalTables(config)

      // Backup each table
      for (const table of tablesToBackup) {
        try {
          const tableData = await this.backupTable(table, config)
          backupData[table] = tableData.data
          totalRecords += tableData.count
          manifest.tables_included.push(table)
        } catch (tableError) {
          console.error(`Error backing up table ${table}:`, tableError)
          // Continue with other tables even if one fails
        }
      }

      // Encrypt backup data if required
      if (config.encryption_enabled) {
        const encryptionResult = this.encryptBackupData(backupData)
        backupData = encryptionResult.encryptedData
        manifest.encryption_key = encryptionResult.key
      }

      // Generate checksum
      const backupJson = JSON.stringify(backupData)
      manifest.checksum = crypto.createHash('sha256').update(backupJson).digest('hex')
      manifest.total_records = totalRecords
      manifest.file_size_bytes = Buffer.byteLength(backupJson)

      // Store backup data
      const filePath = await this.storeBackupData(backupId, backupData, config.storage_provider)

      return {
        success: true,
        manifest: manifest,
        file_path: filePath
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async backupTable(tableName: string, config: BackupConfig) {
    let query = supabase.from(tableName).select('*')

    // For incremental backups, only get recent data
    if (config.backup_type === 'incremental') {
      const lastBackupDate = await this.getLastBackupDate(tableName)
      if (lastBackupDate) {
        query = query.gte('updated_at', lastBackupDate)
      }
    }

    const { data, error, count } = await query

    if (error) throw error

    return {
      data: data || [],
      count: count || data?.length || 0
    }
  }

  async getIncrementalTables(config: BackupConfig): Promise<string[]> {
    // For incremental backups, check which tables have changes since last backup
    const lastBackup = await this.getLastSuccessfulBackup()
    if (!lastBackup) {
      return this.CRITICAL_TABLES // First backup, include all
    }

    // In a real implementation, this would check table modification times
    return this.CRITICAL_TABLES
  }

  async getLastBackupDate(tableName: string): Promise<string | null> {
    const { data } = await supabase
      .from('system_backups')
      .select('completed_at')
      .eq('status', 'completed')
      .contains('manifest', { tables_included: [tableName] })
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    return data?.completed_at || null
  }

  async getLastSuccessfulBackup() {
    const { data } = await supabase
      .from('system_backups')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    return data
  }

  encryptBackupData(data: any) {
    const key = crypto.randomBytes(32).toString('hex')
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher('aes-256-cbc', key)
    
    const jsonData = JSON.stringify(data)
    let encrypted = cipher.update(jsonData, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return {
      encryptedData: encrypted,
      key: key,
      iv: iv.toString('hex')
    }
  }

  async storeBackupData(backupId: string, data: any, storageProvider: string): Promise<string> {
    const fileName = `backup_${backupId}.json`
    const filePath = `backups/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${fileName}`

    switch (storageProvider) {
      case 'supabase':
        // Store in Supabase storage
        const { error } = await supabase.storage
          .from('system-backups')
          .upload(filePath, JSON.stringify(data), {
            contentType: 'application/json'
          })
        
        if (error) throw error
        return filePath

      case 's3':
        // In a real implementation, this would upload to S3
        console.log(`Would upload to S3: ${filePath}`)
        return `s3://backups/${filePath}`

      case 'gcs':
        // In a real implementation, this would upload to Google Cloud Storage
        console.log(`Would upload to GCS: ${filePath}`)
        return `gcs://backups/${filePath}`

      default:
        throw new Error('Invalid storage provider')
    }
  }

  async restoreFromBackup(adminId: string, restoreRequest: RestoreRequest) {
    try {
      // Verify admin access and confirmation
      const hasAccess = await this.verifyAdminAccess(adminId)
      if (!hasAccess) {
        return {
          success: false,
          error: 'Admin access required for restore operations'
        }
      }

      if (!restoreRequest.confirm_data_loss) {
        return {
          success: false,
          error: 'Data loss confirmation required for restore operations'
        }
      }

      // Get backup record
      const { data: backup, error: backupError } = await supabase
        .from('system_backups')
        .select('*')
        .eq('backup_id', restoreRequest.backup_id)
        .eq('status', 'completed')
        .single()

      if (backupError || !backup) {
        return {
          success: false,
          error: 'Backup not found or not completed'
        }
      }

      // Create restore record
      const restoreId = `restore_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
      
      await supabase
        .from('system_restores')
        .insert({
          restore_id: restoreId,
          backup_id: restoreRequest.backup_id,
          restore_type: restoreRequest.restore_type,
          status: 'in_progress',
          initiated_by: adminId,
          config: restoreRequest,
          started_at: new Date().toISOString()
        })

      // Perform restore
      const restoreResult = await this.performRestore(backup, restoreRequest)

      // Update restore record
      await supabase
        .from('system_restores')
        .update({
          status: restoreResult.success ? 'completed' : 'failed',
          error_message: restoreResult.error || null,
          restored_tables: restoreResult.restored_tables || [],
          completed_at: new Date().toISOString()
        })
        .eq('restore_id', restoreId)

      return {
        success: restoreResult.success,
        restore_id: restoreId,
        restored_tables: restoreResult.restored_tables,
        error: restoreResult.error,
        message: restoreResult.success ? 'Restore completed successfully' : 'Restore failed'
      }
    } catch (error) {
      console.error('Restore error:', error)
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async performRestore(backup: any, restoreRequest: RestoreRequest) {
    try {
      // Load backup data
      const backupData = await this.loadBackupData(backup.file_path, backup.config.storage_provider)
      
      // Decrypt if necessary
      let restoredData = backupData
      if (backup.config.encryption_enabled && backup.manifest.encryption_key) {
        restoredData = this.decryptBackupData(backupData, backup.manifest.encryption_key)
      }

      // Verify checksum
      const currentChecksum = crypto.createHash('sha256').update(JSON.stringify(restoredData)).digest('hex')
      if (currentChecksum !== backup.manifest.checksum) {
        throw new Error('Backup data integrity check failed')
      }

      const restoredTables: string[] = []

      // Determine which tables to restore
      const tablesToRestore = restoreRequest.restore_type === 'full'
        ? backup.manifest.tables_included
        : restoreRequest.target_tables || []

      // Restore each table
      for (const tableName of tablesToRestore) {
        if (restoredData[tableName]) {
          await this.restoreTable(tableName, restoredData[tableName])
          restoredTables.push(tableName)
        }
      }

      return {
        success: true,
        restored_tables: restoredTables
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async loadBackupData(filePath: string, storageProvider: string) {
    switch (storageProvider) {
      case 'supabase':
        const { data, error } = await supabase.storage
          .from('system-backups')
          .download(filePath)
        
        if (error) throw error
        
        const text = await data.text()
        return JSON.parse(text)

      default:
        throw new Error('Storage provider not implemented for restore')
    }
  }

  decryptBackupData(encryptedData: string, key: string) {
    const decipher = crypto.createDecipher('aes-256-cbc', key)
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return JSON.parse(decrypted)
  }

  async restoreTable(tableName: string, tableData: any[]) {
    if (!tableData || tableData.length === 0) return

    // Clear existing data (in a real implementation, this would be more careful)
    await supabase.from(tableName).delete().neq('id', '')

    // Insert restored data in batches
    const batchSize = 100
    for (let i = 0; i < tableData.length; i += batchSize) {
      const batch = tableData.slice(i, i + batchSize)
      const { error } = await supabase
        .from(tableName)
        .insert(batch)

      if (error) {
        console.error(`Error restoring batch for table ${tableName}:`, error)
        // Continue with next batch
      }
    }
  }

  async getBackupHistory(adminId: string) {
    try {
      const hasAccess = await this.verifyAdminAccess(adminId)
      if (!hasAccess) {
        return {
          success: false,
          error: 'Admin access required'
        }
      }

      const { data: backups, error } = await supabase
        .from('system_backups')
        .select(`
          backup_id,
          backup_type,
          status,
          started_at,
          completed_at,
          manifest,
          error_message,
          admin_users:initiated_by(email)
        `)
        .order('started_at', { ascending: false })
        .limit(50)

      if (error) throw error

      return {
        success: true,
        backups: backups || []
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async getRestoreHistory(adminId: string) {
    try {
      const hasAccess = await this.verifyAdminAccess(adminId)
      if (!hasAccess) {
        return {
          success: false,
          error: 'Admin access required'
        }
      }

      const { data: restores, error } = await supabase
        .from('system_restores')
        .select(`
          restore_id,
          backup_id,
          restore_type,
          status,
          started_at,
          completed_at,
          restored_tables,
          error_message,
          admin_users:initiated_by(email)
        `)
        .order('started_at', { ascending: false })
        .limit(50)

      if (error) throw error

      return {
        success: true,
        restores: restores || []
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async scheduleAutoBackups(adminId: string, config: BackupConfig) {
    try {
      const hasAccess = await this.verifyAdminAccess(adminId)
      if (!hasAccess) {
        return {
          success: false,
          error: 'Admin access required'
        }
      }

      // Store backup schedule configuration
      const { data, error } = await supabase
        .from('backup_schedules')
        .upsert({
          id: 'default',
          config: config,
          enabled: true,
          created_by: adminId,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        schedule: data,
        message: 'Backup schedule configured successfully'
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      }
    }
  }

  async verifyAdminAccess(adminId: string): Promise<boolean> {
    const { data: admin } = await supabase
      .from('admin_users')
      .select('role, permissions, status')
      .eq('id', adminId)
      .eq('status', 'active')
      .single()

    if (!admin) return false

    // Only admins and super admins can perform backup operations
    return ['admin', 'super_admin'].includes(admin.role)
  }

  async notifyBackupCompletion(backupId: string, adminId: string, success: boolean) {
    // In a real implementation, this would send notifications
    console.log(`Backup ${backupId} ${success ? 'completed' : 'failed'} - notifying ${adminId}`)
  }

  async cleanupOldBackups() {
    try {
      // Get backup schedule configuration
      const { data: schedule } = await supabase
        .from('backup_schedules')
        .select('config')
        .eq('id', 'default')
        .single()

      if (!schedule) return

      const retentionDays = schedule.config.retention_days || 30
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

      // Get old backups
      const { data: oldBackups } = await supabase
        .from('system_backups')
        .select('backup_id, file_path')
        .lt('completed_at', cutoffDate.toISOString())
        .eq('status', 'completed')

      if (!oldBackups || oldBackups.length === 0) return

      // Delete backup files and records
      for (const backup of oldBackups) {
        try {
          // Delete from storage
          if (backup.file_path) {
            await supabase.storage
              .from('system-backups')
              .remove([backup.file_path])
          }

          // Delete record
          await supabase
            .from('system_backups')
            .delete()
            .eq('backup_id', backup.backup_id)
        } catch (error) {
          console.error(`Error cleaning up backup ${backup.backup_id}:`, error)
        }
      }

      console.log(`Cleaned up ${oldBackups.length} old backups`)
    } catch (error) {
      console.error('Backup cleanup error:', error)
    }
  }
}

const backupSystem = new BackupRecoverySystem()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, admin_id } = body

    if (!admin_id) {
      return NextResponse.json({ error: 'Missing admin_id' }, { status: 400 })
    }

    switch (action) {
      case 'create_backup':
        const backupResult = await backupSystem.createBackup(admin_id, body.config)
        return NextResponse.json(backupResult)

      case 'restore_backup':
        const restoreResult = await backupSystem.restoreFromBackup(admin_id, body.restore_request)
        return NextResponse.json(restoreResult)

      case 'schedule_backups':
        const scheduleResult = await backupSystem.scheduleAutoBackups(admin_id, body.config)
        return NextResponse.json(scheduleResult)

      case 'cleanup_old_backups':
        await backupSystem.cleanupOldBackups()
        return NextResponse.json({ success: true, message: 'Cleanup completed' })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Backup system POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('admin_id')
    const type = searchParams.get('type')

    if (!adminId) {
      return NextResponse.json({ error: 'Missing admin_id' }, { status: 400 })
    }

    switch (type) {
      case 'backup_history':
        const backupHistory = await backupSystem.getBackupHistory(adminId)
        return NextResponse.json(backupHistory)

      case 'restore_history':
        const restoreHistory = await backupSystem.getRestoreHistory(adminId)
        return NextResponse.json(restoreHistory)

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }
  } catch (error) {
    console.error('Backup system GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
