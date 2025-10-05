import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Target, Trophy, Clock, Shuffle, Shield } from 'lucide-react';

interface InitialDialogProps {
  onClose: () => void;
  onNavigateToBountyHunt: () => void;
  onNavigateToCreateBounty: () => void;
}

// Mock data for bounties
const mockBounties = [
  {
    id: '1',
    name: 'Daily Challenge',
    prize: '50 HBAR',
    type: 'Simple',
    icon: Target,
    participants: 12
  },
  {
    id: '2',
    name: 'Speed Master',
    prize: '100 HBAR',
    type: 'Time-based',
    icon: Clock,
    participants: 8
  },
  {
    id: '3',
    name: 'Word Expert',
    prize: '200 HBAR',
    type: 'Multistage',
    icon: Trophy,
    participants: 15
  }
];

export function InitialDialog({ onClose, onNavigateToBountyHunt, onNavigateToCreateBounty }: InitialDialogProps) {
  const [secretWord, setSecretWord] = useState('');

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Welcome to Wordle Bounty</DialogTitle>
          <DialogDescription>
            Join existing bounty hunts or create your own Wordle challenges with HBAR prizes
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="join" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="join">Join a Bounty Hunt</TabsTrigger>
            <TabsTrigger value="create">Create Bounty</TabsTrigger>
          </TabsList>

          <TabsContent value="join" className="space-y-4">
            <div className="grid gap-4">
              <h3>Available Bounties</h3>
              {mockBounties.map((bounty) => {
                const Icon = bounty.icon;
                return (
                  <Card key={bounty.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{bounty.name}</h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{bounty.type}</Badge>
                              <span className="text-sm text-muted-foreground">
                                {bounty.participants} hunters
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-lg">{bounty.prize}</div>
                          <Button size="sm">Join</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            <div className="flex gap-2">
              <Button onClick={onNavigateToBountyHunt} className="flex-1">
                Show All Bounties
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="secret-word">Secret Word</Label>
                <Input
                  id="secret-word"
                  placeholder="Enter your secret word"
                  value={secretWord}
                  onChange={(e) => setSecretWord(e.target.value.toUpperCase())}
                  maxLength={8}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Word length: {secretWord.length} characters
                </p>
              </div>

              <div>
                <Label>Quick Create Options</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <Button variant="outline" className="justify-start gap-2">
                    <Target className="h-4 w-4" />
                    Simple Wordle
                  </Button>
                  <Button variant="outline" className="justify-start gap-2">
                    <Clock className="h-4 w-4" />
                    Time Challenge
                  </Button>
                  <Button variant="outline" className="justify-start gap-2">
                    <Trophy className="h-4 w-4" />
                    Multistage
                  </Button>
                  <Button variant="outline" className="justify-start gap-2">
                    <Shuffle className="h-4 w-4" />
                    Random Words
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={onNavigateToCreateBounty}
                disabled={secretWord.length < 3}
                className="flex-1"
              >
                Create Advanced Bounty
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}