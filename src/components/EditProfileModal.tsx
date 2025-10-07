import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2, User } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  currentUsername: string;
  onSuccess: () => void;
}

export function EditProfileModal({
  isOpen,
  onClose,
  walletAddress,
  currentUsername,
  onSuccess,
}: EditProfileModalProps) {
  const [username, setUsername] = useState(currentUsername);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ username?: string }>({});

  const validateUsername = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Username is required';
    }
    if (value.length < 3) {
      return 'Username must be at least 3 characters';
    }
    if (value.length > 20) {
      return 'Username must be less than 20 characters';
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      return 'Username can only contain letters, numbers, hyphens, and underscores';
    }
    return undefined;
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    const error = validateUsername(value);
    setErrors({ username: error });
  };

  const handleSubmit = async () => {
    // Validate username
    const usernameError = validateUsername(username);

    if (usernameError) {
      setErrors({ username: usernameError });
      return;
    }

    // Check if anything changed
    if (username === currentUsername) {
      toast.info('No changes made');
      onClose();
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if username is already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('wallet_address', walletAddress)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking username:', checkError);
        throw new Error('Failed to check username availability');
      }

      if (existingUser) {
        setErrors({ username: 'Username is already taken' });
        setIsSubmitting(false);
        return;
      }

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username,
          display_name: username,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw new Error('Failed to update profile');
      }

      toast.success('Profile updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      // Reset to current values
      setUsername(currentUsername);
      setErrors({});
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your username. It must be unique.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Username Field */}
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Username
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="Enter username"
              className={errors.username ? 'border-red-500' : ''}
              disabled={isSubmitting}
              maxLength={20}
            />
            {errors.username && (
              <p className="text-sm text-red-600">{errors.username}</p>
            )}
            <p className="text-xs text-muted-foreground">
              3-20 characters, letters, numbers, hyphens, and underscores only
            </p>
          </div>

          {/* Wallet Address (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="wallet" className="text-muted-foreground">
              Wallet Address (Read-only)
            </Label>
            <Input
              id="wallet"
              value={walletAddress}
              readOnly
              disabled
              className="bg-muted/50 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Your wallet address cannot be changed
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !!errors.username ||
              username === currentUsername
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
