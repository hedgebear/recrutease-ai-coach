import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Shield, Eye, EyeOff, Key, AlertTriangle } from 'lucide-react';
import { SecureStorage, InputValidator, SecurityLogger } from '@/utils/security';
import Groq from 'groq-sdk';

interface SecureApiKeyDialogProps {
  onApiKeyConfigured: (apiKey: string) => void;
  onClose?: () => void;
}

export const SecureApiKeyDialog: React.FC<SecureApiKeyDialogProps> = ({
  onApiKeyConfigured,
  onClose
}) => {
  const [apiKey, setApiKey] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [useEncryption, setUseEncryption] = useState(SecureStorage.hasStoredApiKey());
  const [isUnlocking, setIsUnlocking] = useState(SecureStorage.hasStoredApiKey());

  const { toast } = useToast();

  const validateApiKeyWithGroq = async (key: string): Promise<boolean> => {
    try {
      const groq = new Groq({ apiKey: key, dangerouslyAllowBrowser: true });
      await groq.models.list();
      return true;
    } catch {
      return false;
    }
  };


  const handleUnlockStoredKey = async () => {
    if (!passphrase.trim()) {
      setError('Please enter your passphrase');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const retrievedKey = await SecureStorage.retrieveApiKey(passphrase);
      if (retrievedKey) {
        SecurityLogger.logEvent('api_key_unlocked', { success: true });
        onApiKeyConfigured(retrievedKey);
        toast({
          title: "Success",
          description: "API key unlocked successfully!"
        });
      } else {
        setError('Invalid passphrase or corrupted data');
        SecurityLogger.logEvent('api_key_unlock_failed', { reason: 'invalid_passphrase' });
      }
    } catch (error) {
      setError('Failed to unlock API key');
      SecurityLogger.logEvent('api_key_unlock_failed', { reason: 'encryption_error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');

    // Validate API key
    const keyValidation = InputValidator.validateApiKey(apiKey);
    if (!keyValidation.isValid) {
      setError(keyValidation.message || 'Invalid API key');
      return;
    }

    // Validate passphrase if encryption is enabled
    if (useEncryption) {
      if (!passphrase.trim()) {
        setError('Please enter a passphrase for encryption');
        return;
      }

      if (passphrase.length < 8) {
        setError('Passphrase must be at least 8 characters long');
        return;
      }

      if (passphrase !== confirmPassphrase) {
        setError('Passphrases do not match');
        return;
      }
    }

    setIsLoading(true);

    try {
      // Validate API key with Groq
      const isValidKey = await validateApiKeyWithGroq(apiKey.trim());
      if (!isValidKey) {
        setError('API key is invalid or has insufficient permissions');
        SecurityLogger.logEvent('api_key_validation_failed', { reason: 'groq_rejected' });
        setIsLoading(false);
        return;
      }

      if (useEncryption) {
        // Store encrypted API key
        await SecureStorage.storeApiKey(apiKey.trim(), passphrase);
        SecurityLogger.logEvent('api_key_stored_encrypted', { success: true });
        toast({
          title: "Success",
          description: "API key encrypted and stored securely!"
        });
      } else {
        SecurityLogger.logEvent('api_key_configured_memory_only', { success: true });
        toast({
          title: "Success",
          description: "API key configured for this session!"
        });
      }

      onApiKeyConfigured(apiKey.trim());
    } catch (error) {
      setError('Failed to configure API key');
      SecurityLogger.logEvent('api_key_configuration_failed', { reason: 'unknown_error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearStoredData = () => {
    SecureStorage.clearStoredCredentials();
    SecurityLogger.logEvent('stored_credentials_cleared', { success: true });
    setIsUnlocking(false);
    setUseEncryption(false);
    setPassphrase('');
    toast({
      title: "Cleared",
      description: "Stored credentials have been cleared"
    });
  };

  if (isUnlocking) {
    return (
      <Card className="w-full max-w-md mx-auto p-6 animate-slide-up">
        <div className="text-center mb-6">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Unlock API Key</h2>
          <p className="text-muted-foreground">Enter your passphrase to unlock your stored API key</p>
        </div>

        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="relative">
            <Input
              type={showPassphrase ? "text" : "password"}
              placeholder="Enter your passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowPassphrase(!showPassphrase)}
            >
              {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleUnlockStoredKey}
              className="flex-1"
              disabled={isLoading || !passphrase.trim()}
            >
              {isLoading ? "Unlocking..." : "Unlock"}
            </Button>
            <Button
              variant="outline"
              onClick={handleClearStoredData}
              className="flex-1"
            >
              Clear & Reset
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6 animate-slide-up">
      <div className="text-center mb-6">
        <Key className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Configure API Key</h2>
        <p className="text-muted-foreground">Secure your Groq API key for recruitment assistance</p>
      </div>

      {error && (
        <Alert className="mb-4" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="relative">
          <Input
            type={showApiKey ? "text" : "password"}
            placeholder="Enter your Groq API key (gsk_...)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowApiKey(!showApiKey)}
          >
            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="useEncryption"
            checked={useEncryption}
            onChange={(e) => setUseEncryption(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="useEncryption" className="text-sm text-foreground">
            Encrypt and store API key securely
          </label>
        </div>

        {useEncryption && (
          <>
            <div className="relative">
              <Input
                type={showPassphrase ? "text" : "password"}
                placeholder="Create a passphrase (min 8 characters)"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassphrase(!showPassphrase)}
              >
                {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>

            <Input
              type="password"
              placeholder="Confirm passphrase"
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
            />
          </>
        )}

        <Button
          onClick={handleSubmit}
          className="w-full"
          disabled={isLoading || !apiKey.trim() || (useEncryption && (!passphrase.trim() || passphrase !== confirmPassphrase))}
        >
          {isLoading ? "Validating..." : "Configure API Key"}
        </Button>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {useEncryption
              ? "Your API key will be encrypted with AES-256 and stored locally. The passphrase is never stored."
              : "Your API key will only be kept in memory for this session. It will not be saved."
            }
          </AlertDescription>
        </Alert>

        {onClose && (
          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
        )}
      </div>
    </Card>
  );
};