import { useState, useEffect, useCallback } from 'react';
import { projectId, publicAnonKey } from './client';
import * as api from './api';
import type { BountyWithCreator, User, LeaderboardEntry, Participation } from './api';

interface ApiError {
  message: string;
  status?: number;
}

interface UseApiOptions {
  immediate?: boolean;
}

export function useApi<T>(
  url: string, 
  options: RequestInit = {}, 
  config: UseApiOptions = { immediate: true }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const execute = async (): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-d72b2276${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError({ 
        message: error.message,
        status: 'status' in err ? (err as any).status : undefined
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (config.immediate) {
      execute();
    }
  }, [url, config.immediate]);

  return { data, loading, error, execute, refetch: execute };
}

export function useMutation<T, P = any>(url: string, method: 'POST' | 'PUT' | 'DELETE' = 'POST') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const mutate = async (payload?: P): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-d72b2276${url}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      const error = err as Error;
      setError({
        message: error.message,
        status: 'status' in err ? (err as any).status : undefined
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error };
}

// Enhanced hooks for specific API operations

// Hook for managing bounties
export function useBounties(filters?: {
  status?: string;
  bounty_type?: string;
  creator_id?: string;
  limit?: number;
}) {
  const [data, setData] = useState<BountyWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchBounties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const bounties = await api.getBounties({
        ...filters,
        is_public: true,
        status: filters?.status || 'active'
      });
      setData(bounties);
    } catch (err) {
      const error = err as Error;
      setError({ message: error.message });
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.bounty_type, filters?.creator_id, filters?.limit]);

  useEffect(() => {
    fetchBounties();
  }, [fetchBounties]);

  return { data, loading, error, refetch: fetchBounties };
}

// Hook for a specific bounty
export function useBounty(id: string, walletAddress?: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchBounty = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const bounty = await api.getBountyById(id, walletAddress);
      setData(bounty);
    } catch (err) {
      const error = err as Error;
      setError({ message: error.message });
    } finally {
      setLoading(false);
    }
  }, [id, walletAddress]);

  useEffect(() => {
    fetchBounty();
  }, [fetchBounty]);

  return { data, loading, error, refetch: fetchBounty };
}

// Hook for user data
export function useUser(walletAddress?: string) {
  const [data, setData] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchUser = useCallback(async () => {
    if (!walletAddress) return;
    try {
      setLoading(true);
      setError(null);
      const user = await api.getUserByWallet(walletAddress);
      setData(user);
    } catch (err) {
      const error = err as Error;
      setError({ message: error.message });
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  const createUser = useCallback(async (username?: string, displayName?: string) => {
    if (!walletAddress) throw new Error('Wallet address required');
    try {
      setLoading(true);
      setError(null);
      const user = await api.getOrCreateUser(walletAddress, username, displayName);
      setData(user);
      return user;
    } catch (err) {
      const error = err as Error;
      setError({ message: error.message });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return { data, loading, error, refetch: fetchUser, createUser };
}

// Hook for leaderboard
export function useLeaderboard(limit = 100) {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const leaderboard = await api.getLeaderboard(limit);
      setData(leaderboard);
    } catch (err) {
      const error = err as Error;
      setError({ message: error.message });
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return { data, loading, error, refetch: fetchLeaderboard };
}

// Hook for user participations
export function useUserParticipations(walletAddress?: string) {
  const [data, setData] = useState<(Participation & { bounty: BountyWithCreator })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchParticipations = useCallback(async () => {
    if (!walletAddress) return;
    try {
      setLoading(true);
      setError(null);
      const participations = await api.getUserParticipations(walletAddress);
      setData(participations);
    } catch (err) {
      const error = err as Error;
      setError({ message: error.message });
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchParticipations();
  }, [fetchParticipations]);

  return { data, loading, error, refetch: fetchParticipations };
}

// Hook for bounty creation
export function useCreateBounty() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const createBounty = useCallback(async (bountyData: Parameters<typeof api.createBounty>[0]) => {
    try {
      setLoading(true);
      setError(null);
      const bounty = await api.createBounty(bountyData);
      return bounty;
    } catch (err) {
      const error = err as Error;
      setError({ message: error.message });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createBounty, loading, error };
}

// Hook for joining bounties
export function useJoinBounty() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const joinBounty = useCallback(async (bountyId: string, walletAddress: string) => {
    try {
      setLoading(true);
      setError(null);
      const participantId = await api.joinBounty(bountyId, walletAddress);
      return participantId;
    } catch (err) {
      const error = err as Error;
      setError({ message: error.message });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { joinBounty, loading, error };
}

// Hook for submitting attempts
export function useSubmitAttempt() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submitAttempt = useCallback(async (
    bountyId: string,
    walletAddress: string,
    wordIndex: number,
    guessedWord: string,
    timeTaken?: number
  ) => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.submitAttempt(bountyId, walletAddress, wordIndex, guessedWord, timeTaken);
      return result;
    } catch (err) {
      const error = err as Error;
      setError({ message: error.message });
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { submitAttempt, loading, error };
}