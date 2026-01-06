import { prisma } from '@/lib/db';
import { encrypt, decrypt, isEncrypted } from '@/lib/encryption';
import { z } from 'zod';

// Settings keys that should be automatically encrypted
const SENSITIVE_KEYS = [
  'linearApiKey',
  'githubToken',
  'linearTeamApiKey',
  'githubPersonalToken',
  'openaiApiKey',
  'anthropicApiKey',
  'autoClaudeApiKey',
  'graphitiApiKey',
  'customApiKey',
] as const;

// Validation schema for setting operations
const SettingKeySchema = z.string().min(1).max(100);
const SettingValueSchema = z.string();

/**
 * Checks if a setting key contains sensitive data that should be encrypted
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.some(sensitiveKey =>
    key.toLowerCase().includes(sensitiveKey.toLowerCase()) ||
    key.toLowerCase().includes('password') ||
    key.toLowerCase().includes('secret') ||
    key.toLowerCase().includes('token') ||
    key.toLowerCase().includes('apikey') ||
    key.toLowerCase().includes('api_key')
  );
}

/**
 * Gets a setting value by key, automatically decrypting if needed
 */
export async function getSetting(key: string): Promise<string | null> {
  try {
    SettingKeySchema.parse(key);

    const setting = await prisma.settings.findUnique({
      where: { key }
    });

    if (!setting) {
      return null;
    }

    // If the setting is marked as encrypted, decrypt it
    if (setting.encrypted) {
      try {
        return await decrypt(setting.value);
      } catch (error) {
        console.error(`Failed to decrypt setting '${key}':`, error);
        throw new Error(`Failed to decrypt setting '${key}'`);
      }
    }

    return setting.value;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid setting key: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Gets multiple settings by keys, automatically decrypting as needed
 */
export async function getSettings(keys: string[]): Promise<Record<string, string | null>> {
  try {
    // Validate all keys
    keys.forEach(key => SettingKeySchema.parse(key));

    const settings = await prisma.settings.findMany({
      where: {
        key: { in: keys }
      }
    });

    const result: Record<string, string | null> = {};

    // Initialize all keys to null
    keys.forEach(key => {
      result[key] = null;
    });

    // Process found settings
    for (const setting of settings) {
      if (setting.encrypted) {
        try {
          result[setting.key] = await decrypt(setting.value);
        } catch (error) {
          console.error(`Failed to decrypt setting '${setting.key}':`, error);
          throw new Error(`Failed to decrypt setting '${setting.key}'`);
        }
      } else {
        result[setting.key] = setting.value;
      }
    }

    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid setting keys: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Gets all settings, automatically decrypting as needed
 * Returns a map of key -> value, with sensitive values marked as [ENCRYPTED]
 */
export async function getAllSettings(includeSensitiveValues = false): Promise<Record<string, string>> {
  try {
    const settings = await prisma.settings.findMany({
      orderBy: { key: 'asc' }
    });

    const result: Record<string, string> = {};

    for (const setting of settings) {
      if (setting.encrypted) {
        if (includeSensitiveValues) {
          try {
            result[setting.key] = await decrypt(setting.value);
          } catch (error) {
            console.error(`Failed to decrypt setting '${setting.key}':`, error);
            result[setting.key] = '[DECRYPTION_ERROR]';
          }
        } else {
          result[setting.key] = '[ENCRYPTED]';
        }
      } else {
        result[setting.key] = setting.value;
      }
    }

    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * Sets a setting value, automatically encrypting if it's a sensitive key
 */
export async function setSetting(key: string, value: string): Promise<void> {
  try {
    SettingKeySchema.parse(key);
    SettingValueSchema.parse(value);

    const shouldEncrypt = isSensitiveKey(key);
    let finalValue = value;
    let encrypted = false;

    // Encrypt if it's a sensitive key
    if (shouldEncrypt && value.trim() !== '') {
      finalValue = await encrypt(value);
      encrypted = true;
    }

    await prisma.settings.upsert({
      where: { key },
      update: {
        value: finalValue,
        encrypted,
        updatedAt: new Date()
      },
      create: {
        key,
        value: finalValue,
        encrypted
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Sets multiple settings at once, automatically encrypting sensitive keys
 */
export async function setSettings(settings: Record<string, string>): Promise<void> {
  try {
    // Validate all inputs
    Object.entries(settings).forEach(([key, value]) => {
      SettingKeySchema.parse(key);
      SettingValueSchema.parse(value);
    });

    // Process each setting
    const operations = [];

    for (const [key, value] of Object.entries(settings)) {
      const shouldEncrypt = isSensitiveKey(key);
      let finalValue = value;
      let encrypted = false;

      // Encrypt if it's a sensitive key
      if (shouldEncrypt && value.trim() !== '') {
        finalValue = await encrypt(value);
        encrypted = true;
      }

      operations.push(
        prisma.settings.upsert({
          where: { key },
          update: {
            value: finalValue,
            encrypted,
            updatedAt: new Date()
          },
          create: {
            key,
            value: finalValue,
            encrypted
          }
        })
      );
    }

    // Execute all operations in a transaction
    await prisma.$transaction(operations);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Deletes a setting by key
 */
export async function deleteSetting(key: string): Promise<boolean> {
  try {
    SettingKeySchema.parse(key);

    const result = await prisma.settings.delete({
      where: { key }
    });

    return !!result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid setting key: ${error.message}`);
    }

    // If the setting doesn't exist, return false
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return false;
    }

    throw error;
  }
}

/**
 * Deletes multiple settings by keys
 */
export async function deleteSettings(keys: string[]): Promise<number> {
  try {
    // Validate all keys
    keys.forEach(key => SettingKeySchema.parse(key));

    const result = await prisma.settings.deleteMany({
      where: {
        key: { in: keys }
      }
    });

    return result.count;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid setting keys: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Checks if a setting exists
 */
export async function hasSetting(key: string): Promise<boolean> {
  try {
    SettingKeySchema.parse(key);

    const setting = await prisma.settings.findUnique({
      where: { key },
      select: { id: true }
    });

    return !!setting;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid setting key: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Gets all setting keys, optionally filtered by pattern
 */
export async function getSettingKeys(pattern?: string): Promise<string[]> {
  try {
    const where = pattern
      ? { key: { contains: pattern } }
      : {};

    const settings = await prisma.settings.findMany({
      where,
      select: { key: true },
      orderBy: { key: 'asc' }
    });

    return settings.map(s => s.key);
  } catch (error) {
    throw error;
  }
}

/**
 * Updates the encryption status of a setting (for migration purposes)
 * This is mainly for upgrading existing plain-text sensitive settings to encrypted
 */
export async function upgradeSettingToEncrypted(key: string): Promise<boolean> {
  try {
    SettingKeySchema.parse(key);

    const setting = await prisma.settings.findUnique({
      where: { key }
    });

    if (!setting) {
      return false;
    }

    // If already encrypted or not sensitive, no action needed
    if (setting.encrypted || !isSensitiveKey(key)) {
      return false;
    }

    // Check if the value is already encrypted somehow
    if (isEncrypted(setting.value)) {
      // Just mark as encrypted
      await prisma.settings.update({
        where: { key },
        data: { encrypted: true }
      });
      return true;
    }

    // Encrypt the current value
    const encryptedValue = await encrypt(setting.value);

    await prisma.settings.update({
      where: { key },
      data: {
        value: encryptedValue,
        encrypted: true,
        updatedAt: new Date()
      }
    });

    return true;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid setting key: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Health check - validates that encryption/decryption works for all encrypted settings
 */
export async function validateEncryptedSettings(): Promise<{ valid: boolean; errors: string[] }> {
  try {
    const encryptedSettings = await prisma.settings.findMany({
      where: { encrypted: true }
    });

    const errors: string[] = [];

    for (const setting of encryptedSettings) {
      try {
        await decrypt(setting.value);
      } catch (error) {
        errors.push(`Setting '${setting.key}': ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}