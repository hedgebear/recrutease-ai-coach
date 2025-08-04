// Security utilities for API key encryption and input validation

// Web Crypto API utilities for secure key storage
export class SecureStorage {
  private static readonly SALT_KEY = 'recruitment_chat_salt';
  private static readonly API_KEY = 'recruitment_chat_api_key';
  
  // Generate a salt for key derivation
  private static async generateSalt(): Promise<Uint8Array> {
    const existingSalt = localStorage.getItem(this.SALT_KEY);
    if (existingSalt) {
      return new Uint8Array(JSON.parse(existingSalt));
    }
    
    const salt = crypto.getRandomValues(new Uint8Array(16));
    localStorage.setItem(this.SALT_KEY, JSON.stringify(Array.from(salt)));
    return salt;
  }
  
  // Derive encryption key from user passphrase
  private static async deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  // Encrypt and store API key
  static async storeApiKey(apiKey: string, passphrase: string): Promise<void> {
    try {
      const salt = await this.generateSalt();
      const key = await this.deriveKey(passphrase, salt);
      const encoder = new TextEncoder();
      const data = encoder.encode(apiKey);
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
      );
      
      const encryptedPackage = {
        data: Array.from(new Uint8Array(encryptedData)),
        iv: Array.from(iv)
      };
      
      localStorage.setItem(this.API_KEY, JSON.stringify(encryptedPackage));
    } catch (error) {
      throw new Error('Failed to encrypt API key');
    }
  }
  
  // Decrypt and retrieve API key
  static async retrieveApiKey(passphrase: string): Promise<string | null> {
    try {
      const encryptedPackage = localStorage.getItem(this.API_KEY);
      if (!encryptedPackage) return null;
      
      const { data, iv } = JSON.parse(encryptedPackage);
      const salt = await this.generateSalt();
      const key = await this.deriveKey(passphrase, salt);
      
      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        key,
        new Uint8Array(data)
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decryptedData);
    } catch (error) {
      return null; // Invalid passphrase or corrupted data
    }
  }
  
  // Clear stored credentials
  static clearStoredCredentials(): void {
    localStorage.removeItem(this.API_KEY);
    localStorage.removeItem(this.SALT_KEY);
  }
  
  // Check if API key is stored
  static hasStoredApiKey(): boolean {
    return localStorage.getItem(this.API_KEY) !== null;
  }
}

// Input validation and sanitization
export class InputValidator {
  private static readonly MAX_MESSAGE_LENGTH = 4000;
  private static readonly MAX_API_KEY_LENGTH = 200;
  
  // Validate OpenAI API key format
  static validateApiKey(apiKey: string): { isValid: boolean; message?: string } {
    if (!apiKey || typeof apiKey !== 'string') {
      return { isValid: false, message: 'API key is required' };
    }
    
    const trimmed = apiKey.trim();
    if (trimmed.length === 0) {
      return { isValid: false, message: 'API key cannot be empty' };
    }
    
    if (trimmed.length > this.MAX_API_KEY_LENGTH) {
      return { isValid: false, message: 'API key is too long' };
    }
    
    // OpenAI API keys start with 'sk-'
    if (!trimmed.startsWith('sk-')) {
      return { isValid: false, message: 'Invalid API key format. OpenAI keys start with "sk-"' };
    }
    
    // Basic pattern check (OpenAI keys are typically 51 characters)
    if (trimmed.length < 40 || trimmed.length > 60) {
      return { isValid: false, message: 'API key length appears invalid' };
    }
    
    return { isValid: true };
  }
  
  // Validate user message
  static validateMessage(message: string): { isValid: boolean; message?: string; sanitized?: string } {
    if (!message || typeof message !== 'string') {
      return { isValid: false, message: 'Message is required' };
    }
    
    const trimmed = message.trim();
    if (trimmed.length === 0) {
      return { isValid: false, message: 'Message cannot be empty' };
    }
    
    if (trimmed.length > this.MAX_MESSAGE_LENGTH) {
      return { 
        isValid: false, 
        message: `Message too long. Maximum ${this.MAX_MESSAGE_LENGTH} characters allowed.` 
      };
    }
    
    // Basic content filtering
    const suspiciousPatterns = [
      /ignore\s+previous\s+instructions/i,
      /forget\s+everything/i,
      /you\s+are\s+now/i,
      /<script[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(trimmed)) {
        return { 
          isValid: false, 
          message: 'Message contains potentially harmful content' 
        };
      }
    }
    
    // Basic HTML/script sanitization
    const sanitized = trimmed
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
    
    return { isValid: true, sanitized };
  }
}

// Rate limiting for API calls
export class RateLimiter {
  private static requests: number[] = [];
  private static readonly MAX_REQUESTS_PER_MINUTE = 10;
  private static readonly WINDOW_SIZE = 60000; // 1 minute
  
  static canMakeRequest(): boolean {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(timestamp => now - timestamp < this.WINDOW_SIZE);
    
    // Check if we can make a new request
    if (this.requests.length >= this.MAX_REQUESTS_PER_MINUTE) {
      return false;
    }
    
    // Add current request
    this.requests.push(now);
    return true;
  }
  
  static getTimeUntilNextRequest(): number {
    if (this.requests.length === 0) return 0;
    
    const now = Date.now();
    const oldestRequest = Math.min(...this.requests);
    const timeUntilReset = this.WINDOW_SIZE - (now - oldestRequest);
    
    return Math.max(0, timeUntilReset);
  }
}

// Security event logging (without sensitive data)
export class SecurityLogger {
  private static readonly LOGS_KEY = 'recruitment_chat_security_logs';
  private static readonly MAX_LOGS = 50;
  
  static logEvent(event: string, details?: Record<string, any>): void {
    try {
      const logs = this.getLogs();
      const logEntry = {
        timestamp: new Date().toISOString(),
        event,
        details: details || {},
        userAgent: navigator.userAgent.substring(0, 100) // Limit length
      };
      
      logs.push(logEntry);
      
      // Keep only the latest logs
      if (logs.length > this.MAX_LOGS) {
        logs.splice(0, logs.length - this.MAX_LOGS);
      }
      
      localStorage.setItem(this.LOGS_KEY, JSON.stringify(logs));
    } catch (error) {
      // Fail silently for logging errors
    }
  }
  
  static getLogs(): any[] {
    try {
      const stored = localStorage.getItem(this.LOGS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }
  
  static clearLogs(): void {
    localStorage.removeItem(this.LOGS_KEY);
  }
}
