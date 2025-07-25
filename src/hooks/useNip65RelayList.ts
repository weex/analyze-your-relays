import { useState, useCallback } from 'react';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

export interface Nip65Relay {
  url: string;
  read: boolean;
  write: boolean;
}

export interface UseNip65RelayListReturn {
  fetchRelayList: (userPubkey: string) => Promise<Nip65Relay[]>;
  isLoading: boolean;
  error: string | null;
}

export function useNip65RelayList(): UseNip65RelayListReturn {
  const { nostr } = useNostr();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseRelayTags = useCallback((event: NostrEvent): Nip65Relay[] => {
    const relays: Nip65Relay[] = [];
    
    for (const tag of event.tags) {
      if (tag[0] === 'r' && tag[1]) {
        const url = tag[1];
        const marker = tag[2];
        
        // Determine read/write permissions based on marker
        let read = true;
        let write = true;
        
        if (marker === 'read') {
          write = false;
        } else if (marker === 'write') {
          read = false;
        }
        // If no marker, both read and write are true (default)
        
        relays.push({
          url,
          read,
          write,
        });
      }
    }
    
    return relays;
  }, []);

  const fetchRelayList = useCallback(async (userPubkey: string): Promise<Nip65Relay[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const signal = AbortSignal.timeout(15000); // 15 second timeout
      
      // Query for NIP-65 relay list metadata (kind 10002)
      const events = await nostr.query(
        [{ kinds: [10002], authors: [userPubkey], limit: 1 }],
        { signal }
      );

      if (events.length === 0) {
        throw new Error('No NIP-65 relay list found for this user');
      }

      // Get the most recent relay list event
      const relayListEvent = events[0];
      const relays = parseRelayTags(relayListEvent);

      if (relays.length === 0) {
        throw new Error('No relays found in NIP-65 relay list');
      }

      return relays;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch relay list';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [nostr, parseRelayTags]);

  return {
    fetchRelayList,
    isLoading,
    error,
  };
}