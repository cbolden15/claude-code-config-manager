import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV for GCM
const SALT_LENGTH = 32; // 256-bit salt for key derivation
const TAG_LENGTH = 16; // 128-bit authentication tag
const KEY_LENGTH = 32; // 256-bit key

/**
 * Derives a 256-bit key from the master password using scrypt
 */
async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
}

/**
 * Gets the encryption password from environment variables
 */
function getEncryptionPassword(): string {
  const password = process.env.CCM_ENCRYPTION_KEY;
  if (!password) {
    throw new Error(
      'CCM_ENCRYPTION_KEY environment variable is required for encryption. ' +
      'Please set it to a secure random string.'
    );
  }
  return password;
}

/**
 * Encrypts plain text using AES-256-GCM
 * Returns base64-encoded string containing: salt + iv + tag + ciphertext
 *
 * @param plaintext - The text to encrypt
 * @returns Base64-encoded encrypted string
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    const password = getEncryptionPassword();

    // Generate random salt and IV
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);

    // Derive key from password and salt
    const key = await deriveKey(password, salt);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);

    // Encrypt the plaintext
    const chunks: Buffer[] = [];
    chunks.push(cipher.update(plaintext, 'utf8'));
    chunks.push(cipher.final());

    // Get the authentication tag
    const tag = cipher.getAuthTag();

    // Combine salt + iv + tag + ciphertext
    const encrypted = Buffer.concat([
      salt,
      iv,
      tag,
      ...chunks
    ]);

    return encrypted.toString('base64');
  } catch (error) {
    throw new Error(`Failed to encrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypts base64-encoded encrypted string using AES-256-GCM
 * Expects format: salt + iv + tag + ciphertext
 *
 * @param encryptedData - Base64-encoded encrypted string
 * @returns Decrypted plaintext
 */
export async function decrypt(encryptedData: string): Promise<string> {
  try {
    const password = getEncryptionPassword();

    // Parse the encrypted data
    const buffer = Buffer.from(encryptedData, 'base64');

    // Validate minimum length
    const minLength = SALT_LENGTH + IV_LENGTH + TAG_LENGTH;
    if (buffer.length < minLength) {
      throw new Error('Invalid encrypted data: insufficient length');
    }

    // Extract components
    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const ciphertext = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // Derive key from password and salt
    const key = await deriveKey(password, salt);

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // Decrypt the ciphertext
    const chunks: Buffer[] = [];
    chunks.push(decipher.update(ciphertext));
    chunks.push(decipher.final());

    return Buffer.concat(chunks).toString('utf8');
  } catch (error) {
    throw new Error(`Failed to decrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Checks if a string appears to be encrypted (base64 format with sufficient length)
 * This is a heuristic check, not cryptographically definitive
 *
 * @param value - String to check
 * @returns True if the string appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
  try {
    // Check if it's valid base64
    const buffer = Buffer.from(value, 'base64');

    // Check if the decoded length matches our expected minimum
    const minLength = SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1; // +1 for at least 1 byte of ciphertext
    return buffer.length >= minLength && buffer.toString('base64') === value;
  } catch {
    return false;
  }
}

/**
 * Utility function to safely test encryption/decryption
 * This is useful for testing and validation
 *
 * @returns True if encryption/decryption works correctly
 */
export async function testEncryption(): Promise<boolean> {
  try {
    const testData = 'Hello, World! This is a test encryption string.';
    const encrypted = await encrypt(testData);
    const decrypted = await decrypt(encrypted);
    return testData === decrypted;
  } catch {
    return false;
  }
}