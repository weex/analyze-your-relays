import { useState, useCallback } from 'react';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

export interface RelayPerformanceResult {
  relay: string;
  success: boolean;
  latency: number; // Time to first event in ms
  bandwidth: number; // Bytes per second
  duration: number; // Total test duration in ms
  eventCount: number;
  totalBytes: number;
  followerCount: number;
  eventIds: string[]; // Event IDs for overlap analysis
  error?: string;
}

export interface RelayOverlapResult {
  relay1: string;
  relay2: string;
  relay1Only: number;
  relay2Only: number;
  common: number;
  relay1Total: number;
  relay2Total: number;
  overlapPercentage: number;
}

export interface UseRelayPerformanceTestReturn {
  startTest: (userPubkey: string, relays: string[]) => Promise<void>;
  isRunning: boolean;
  results: RelayPerformanceResult[] | null;
  overlapResults: RelayOverlapResult[] | null;
  progress: number;
  currentPhase: string;
  error: string | null;
}

export function useRelayPerformanceTest(): UseRelayPerformanceTestReturn {
  const { nostr } = useNostr();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<RelayPerformanceResult[] | null>(null);
  const [overlapResults, setOverlapResults] = useState<RelayOverlapResult[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [error, setError] = useState<string | null>(null);

  const calculateEventSize = (event: NostrEvent): number => {
    // Estimate the size of a Nostr event in bytes
    const eventString = JSON.stringify(event);
    return new TextEncoder().encode(eventString).length;
  };

  const testRelayPerformance = useCallback(async (
    userPubkey: string,
    relay: string,
    followers: string[]
  ): Promise<RelayPerformanceResult> => {
    try {
      // Create a temporary pool instance for this specific relay
      const { NPool, NRelay1 } = await import('@nostrify/nostrify');

      const testPool = new NPool({
        open(url: string) {
          return new NRelay1(url);
        },
        reqRouter(_filters) {
          return new Map([[relay, _filters]]);
        },
        eventRouter(_event: NostrEvent) {
          return [relay];
        },
      });

      const startTime = Date.now();
      let firstEventTime: number | null = null;
      let eventCount = 0;
      let totalBytes = 0;
      const eventIds: string[] = [];

      // Query for kind:1 notes from followers
      const filter = {
        kinds: [1],
        authors: followers,
        limit: 100, // Reasonable limit for testing
      };

      const signal = AbortSignal.timeout(30000); // 30 second timeout

      // Start the query and measure performance
      const events = await testPool.query([filter], { signal });

      const endTime = Date.now();

      // Process events to calculate metrics
      for (const event of events) {
        if (firstEventTime === null) {
          firstEventTime = Date.now();
        }
        eventCount++;
        totalBytes += calculateEventSize(event);
        eventIds.push(event.id);
      }

      const duration = endTime - startTime;
      const latency = firstEventTime ? firstEventTime - startTime : duration;
      const bandwidth = duration > 0 ? (totalBytes / duration) * 1000 : 0; // bytes per second

      return {
        relay,
        success: true,
        latency,
        bandwidth,
        duration,
        eventCount,
        totalBytes,
        followerCount: followers.length,
        eventIds,
      };
    } catch (err) {
      return {
        relay,
        success: false,
        latency: 0,
        bandwidth: 0,
        duration: 0,
        eventCount: 0,
        totalBytes: 0,
        followerCount: followers.length,
        eventIds: [],
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }, []);

  const getFollowers = useCallback(async (userPubkey: string): Promise<string[]> => {
    try {
      setCurrentPhase('Fetching your follow list...');
      setProgress(10);

      const signal = AbortSignal.timeout(15000); // 15 second timeout

      // Get the user's follow list (kind 3)
      const followEvents = await nostr.query(
        [{ kinds: [3], authors: [userPubkey], limit: 1 }],
        { signal }
      );

      if (followEvents.length === 0) {
        throw new Error('No follow list found. Please follow some users first.');
      }

      // Extract pubkeys from p tags
      const followEvent = followEvents[0];
      const followers = followEvent.tags
        .filter(tag => tag[0] === 'p' && tag[1])
        .map(tag => tag[1])
        .slice(0, 50); // Limit to 50 followers for reasonable test size

      if (followers.length === 0) {
        throw new Error('Your follow list is empty. Please follow some users first.');
      }

      setProgress(25);
      return followers;
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? err.message
          : 'Failed to fetch follow list'
      );
    }
  }, [nostr]);

  const calculateOverlap = useCallback((results: RelayPerformanceResult[]): RelayOverlapResult[] => {
    const overlapResults: RelayOverlapResult[] = [];
    const successfulResults = results.filter(r => r.success);

    // Compare each pair of successful relays
    for (let i = 0; i < successfulResults.length; i++) {
      for (let j = i + 1; j < successfulResults.length; j++) {
        const relay1 = successfulResults[i];
        const relay2 = successfulResults[j];

        const set2 = new Set(relay2.eventIds);

        const common = relay1.eventIds.filter(id => set2.has(id)).length;
        const relay1Only = relay1.eventIds.length - common;
        const relay2Only = relay2.eventIds.length - common;

        const totalUnique = relay1Only + relay2Only + common;
        const overlapPercentage = totalUnique > 0 ? (common / totalUnique) * 100 : 0;

        overlapResults.push({
          relay1: relay1.relay,
          relay2: relay2.relay,
          relay1Only,
          relay2Only,
          common,
          relay1Total: relay1.eventIds.length,
          relay2Total: relay2.eventIds.length,
          overlapPercentage,
        });
      }
    }

    return overlapResults;
  }, []);

  const startTest = useCallback(async (userPubkey: string, relays: string[]) => {
    if (isRunning) return;

    setIsRunning(true);
    setResults(null);
    setOverlapResults(null);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Get followers
      const followers = await getFollowers(userPubkey);

      setCurrentPhase(`Analyzing ${relays.length} relays with ${followers.length} followers...`);
      setProgress(30);

      // Step 2: Test each relay
      const testResults: RelayPerformanceResult[] = [];

      for (let i = 0; i < relays.length; i++) {
        const relay = relays[i];
        setCurrentPhase(`Analyzing ${relay.replace('wss://', '')}...`);
        setProgress(30 + (i / relays.length) * 60);

        const result = await testRelayPerformance(userPubkey, relay, followers);
        testResults.push(result);
      }

      setCurrentPhase('Calculating overlap...');
      setProgress(95);

      // Calculate overlap between relays
      const overlap = calculateOverlap(testResults);
      setOverlapResults(overlap);

      setCurrentPhase('Analysis completed!');
      setProgress(100);
      setResults(testResults);

      // Check if any tests failed
      const failedTests = testResults.filter(r => !r.success);
      if (failedTests.length === testResults.length) {
        setError('All relays failed analysis. Please check your internet connection and try again.');
      } else if (failedTests.length > 0) {
        setError(`${failedTests.length} out of ${testResults.length} relays failed analysis.`);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setProgress(0);
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, getFollowers, testRelayPerformance, calculateOverlap]);

  return {
    startTest,
    isRunning,
    results,
    overlapResults,
    progress,
    currentPhase,
    error,
  };
}