/**
 * SecretManager - Secure JWT Secret Storage
 * 
 * Manages JWT secret generation, persistence, and retrieval.
 * Current: File-based storage in userData directory
 * Future upgrade path: OS keychain via keytar or @electron/safeStorage
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecretManager {
  constructor(app) {
    this.app = app;
    this.secretFileName = 'odysseus-secrets.json';
  }

  /**
   * Get or create JWT secret
   * @returns {string} JWT secret
   */
  getOrCreateJwtSecret() {
    try {
      const secretPath = this.getSecretFilePath();
      
      // Try to load existing secret
      if (fs.existsSync(secretPath)) {
        const data = JSON.parse(fs.readFileSync(secretPath, 'utf8'));
        if (data.jwtSecret && data.jwtSecret.length >= 64) {
          console.log('🔐 Loaded existing JWT secret from:', secretPath);
          return data.jwtSecret;
        }
      }

      // Generate new secret if none exists or invalid
      const newSecret = this.generateSecureSecret();
      this.saveSecret(newSecret);
      console.log('🔐 Generated new JWT secret and saved to:', secretPath);
      return newSecret;
    } catch (error) {
      console.error('❌ SecretManager error:', error);
      // Fallback: generate ephemeral secret (won't persist, but app can start)
      console.warn('⚠️  Using ephemeral JWT secret (will not persist across restarts)');
      return this.generateSecureSecret();
    }
  }

  /**
   * Generate cryptographically secure random secret
   * @returns {string} Base64-encoded 64-byte secret
   */
  generateSecureSecret() {
    // Generate 64 bytes of random data, base64 encode = 88 characters
    return crypto.randomBytes(64).toString('base64');
  }

  /**
   * Save secret to persistent storage
   * @param {string} secret 
   */
  saveSecret(secret) {
    const secretPath = this.getSecretFilePath();
    const secretData = {
      jwtSecret: secret,
      createdAt: new Date().toISOString(),
      version: '1.0'
    };

    // Ensure directory exists
    const secretDir = path.dirname(secretPath);
    if (!fs.existsSync(secretDir)) {
      fs.mkdirSync(secretDir, { recursive: true });
    }

    // Write with restrictive permissions (0600 = owner read/write only)
    fs.writeFileSync(secretPath, JSON.stringify(secretData, null, 2), { 
      mode: 0o600,
      encoding: 'utf8'
    });
  }

  /**
   * Get path to secret file in userData directory
   * @returns {string}
   */
  getSecretFilePath() {
    return path.join(this.app.getPath('userData'), this.secretFileName);
  }

  /**
   * Rotate JWT secret (for future use)
   * @returns {string} New secret
   */
  rotateSecret() {
    const newSecret = this.generateSecureSecret();
    this.saveSecret(newSecret);
    console.log('🔄 JWT secret rotated');
    return newSecret;
  }

  // ========================================
  // FUTURE UPGRADE PATH: OS Keychain
  // ========================================
  // 
  // To upgrade to OS keychain storage:
  // 1. Install: npm install keytar
  // 2. Replace getOrCreateJwtSecret() implementation:
  //
  // async getOrCreateJwtSecret() {
  //   const keytar = require('keytar');
  //   const serviceName = 'odysseus-app';
  //   const accountName = 'jwt-secret';
  //   
  //   // Try to load from keychain
  //   let secret = await keytar.getPassword(serviceName, accountName);
  //   
  //   if (!secret || secret.length < 64) {
  //     // Generate and save to keychain
  //     secret = this.generateSecureSecret();
  //     await keytar.setPassword(serviceName, accountName, secret);
  //     console.log('🔐 Generated new JWT secret and saved to OS keychain');
  //   } else {
  //     console.log('🔐 Loaded existing JWT secret from OS keychain');
  //   }
  //   
  //   return secret;
  // }
  //
  // The rest of the codebase remains unchanged!
}

module.exports = SecretManager;
