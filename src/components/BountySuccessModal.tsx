import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Copy, Check, Share2, ExternalLink } from 'lucide-react';

interface BountySuccessModalProps {
  open: boolean;
  onClose: () => void;
  bountyData: {
    name: string;
    type: string;
    prizeAmount: string;
    shareableLink: string;
  };
}

export function BountySuccessModal({ open, onClose, bountyData }: BountySuccessModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(bountyData.shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my Wordle Bounty: ${bountyData.name}`,
          text: `Test your word skills and win ${bountyData.prizeAmount} HBAR!`,
          url: bountyData.shareableLink,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying
      handleCopyLink();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-green-600">
            🎉 Bounty Created Successfully!
          </DialogTitle>
          <DialogDescription className="text-center">
            Your Wordle bounty has been created and is now live for players to join
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="text-center space-y-2">
                <h3 className="font-medium">{bountyData.name}</h3>
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="outline">{bountyData.type}</Badge>
                  <span className="font-semibold text-green-600">
                    {bountyData.prizeAmount} HBAR
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label>Shareable Link</Label>
            <div className="flex gap-2">
              <Input
                value={bountyData.shareableLink}
                readOnly
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this link with others so they can join your bounty challenge!
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleShare} className="flex-1 gap-2">
              <Share2 className="h-4 w-4" />
              Share Bounty
            </Button>
            <Button variant="outline" onClick={onClose} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              View Bounty
            </Button>
          </div>

          <Button variant="ghost" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}