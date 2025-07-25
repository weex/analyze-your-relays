import { useSeoMeta } from '@unhead/react';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoginArea } from '@/components/auth/LoginArea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRelayPerformanceTest } from '@/hooks/useRelayPerformanceTest';
import { useNip65RelayList } from '@/hooks/useNip65RelayList';
import { useToast } from '@/hooks/useToast';
import { Clock, Zap, Users, FileText, Wifi, WifiOff, Plus, X, Download, Loader2 } from 'lucide-react';

const RelayPerformance = () => {
  useSeoMeta({
    title: 'Analyze Your Relays - Check relay performance and overlap from your browser',
    description: 'Test and compare latency and bandwidth performance when loading kind:1 notes from your followers across different Nostr relays.',
  });

  const { user } = useCurrentUser();
  const [testRelays, setTestRelays] = useState<string[]>([]);
  const [newRelay, setNewRelay] = useState('');
  const [hasLoadedNip65, setHasLoadedNip65] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  const {
    startTest,
    isRunning,
    results,
    overlapResults,
    progress,
    currentPhase,
    error
  } = useRelayPerformanceTest();

  const {
    fetchRelayList,
    isLoading: isLoadingRelays,
    error: relayListError
  } = useNip65RelayList();

  const { toast } = useToast();

  const handleStartTest = () => {
    if (!user) return;
    startTest(user.pubkey, testRelays);
  };

  const addRelay = () => {
    if (!newRelay.trim()) return;

    let relayUrl = newRelay.trim();
    if (!relayUrl.startsWith('wss://') && !relayUrl.startsWith('ws://')) {
      relayUrl = 'wss://' + relayUrl;
    }

    if (!testRelays.includes(relayUrl)) {
      setTestRelays([...testRelays, relayUrl]);
    }
    setNewRelay('');
  };

  const removeRelay = (index: number) => {
    setTestRelays(testRelays.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addRelay();
    }
  };

  const loadNip65Relays = useCallback(async (showToast = true) => {
    if (!user) return;

    try {
      const relays = await fetchRelayList(user.pubkey);

      // Clear existing relays and replace with NIP-65 relays
      const relayUrls = relays.map(r => r.url);
      const uniqueRelays = [...new Set(relayUrls)]; // Remove any duplicates within NIP-65 list

      setTestRelays(uniqueRelays);
      setHasLoadedNip65(true);

      // Show success message only if requested
      if (showToast) {
        toast({
          title: "NIP-65 Relays Loaded",
          description: `Loaded ${uniqueRelays.length} relay${uniqueRelays.length === 1 ? '' : 's'} from your relay list`,
        });
      }
    } catch (err) {
      // If auto-loading fails, fall back to default relays and show manual entry
      console.error('Failed to load NIP-65 relays:', err);
      if (!hasLoadedNip65) {
        setTestRelays([
          'wss://relay.primal.net',
          'wss://relay.damus.io'
        ]);
        setShowManualEntry(true);
      }
    }
  }, [user, fetchRelayList, toast]);

  const switchToManualEntry = useCallback(() => {
    setShowManualEntry(true);
    setTestRelays([
      'wss://relay.primal.net',
      'wss://relay.damus.io'
    ]);
    setHasLoadedNip65(false);
  }, []);

  // Auto-load NIP-65 relays when user logs in
  useEffect(() => {
    if (user && !hasLoadedNip65 && !showManualEntry) {
      loadNip65Relays(false); // Don't show toast for auto-loading
    }
  }, [user, hasLoadedNip65, showManualEntry, loadNip65Relays]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatLatency = (ms: number) => {
    return `${ms.toFixed(0)}ms`;
  };

  const formatBandwidth = (bytesPerSecond: number) => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <Wifi className="h-16 w-16 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Analyze Your Relays
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Check relay performance and overlap from your browser
              </p>
            </div>

            <Card className="p-8">
              <CardContent className="space-y-6">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Login Required</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Please log in to test relay performance with your follow list
                  </p>
                  <LoginArea className="max-w-60 mx-auto" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Wifi className="h-16 w-16 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Analyze Your Relays
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
              Check relay performance and overlap from your browser
            </p>

            <div className="flex flex-wrap justify-center items-center gap-4 mb-6">
              <Badge variant="outline" className="text-sm">
                <Users className="h-4 w-4 mr-1" />
                Testing with your follow list
              </Badge>
              <Badge variant="outline" className="text-sm">
                <FileText className="h-4 w-4 mr-1" />
                Kind:1 notes only
              </Badge>
              <Badge variant="outline" className="text-sm">
                <Download className="h-4 w-4 mr-1" />
                NIP-65 relay discovery
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              {!showManualEntry && hasLoadedNip65 && (
                <Button
                  onClick={() => loadNip65Relays(true)}
                  disabled={isLoadingRelays || !user}
                  variant="outline"
                  size="lg"
                  className="border-purple-600 text-purple-600 hover:bg-purple-50 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-900/20"
                >
                  {isLoadingRelays ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Reloading NIP-65...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Reload My Relays (NIP-65)
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={handleStartTest}
                disabled={isRunning || testRelays.length === 0}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isRunning ? (
                  <>
                    <Zap className="h-4 w-4 mr-2 animate-spin" />
                    Analysis in Progress...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Start Analysis
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Test Relays */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  {hasLoadedNip65 && !showManualEntry ? 'Your Relays (NIP-65)' : 'Test Relays'} ({testRelays.length})
                </div>
                {hasLoadedNip65 && !showManualEntry && (
                  <Button
                    onClick={switchToManualEntry}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Switch to Manual Entry
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                {hasLoadedNip65 && !showManualEntry
                  ? 'Testing your actual relay configuration from NIP-65. Switch to manual entry to test custom relays.'
                  : 'Add or remove relays to test performance manually.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Manual Entry Controls - only show if in manual mode */}
              {showManualEntry && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="new-relay" className="sr-only">Add relay URL</Label>
                      <Input
                        id="new-relay"
                        placeholder="Enter relay URL (e.g., relay.damus.io)"
                        value={newRelay}
                        onChange={(e) => setNewRelay(e.target.value)}
                        onKeyPress={handleKeyPress}
                      />
                    </div>
                    <Button onClick={addRelay} size="icon" variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Quick Add Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Quick add:</span>
                    {[
                      'relay.nostr.band',
                      'relay.snort.social',
                      'nos.lol',
                      'relay.current.fyi',
                      'purplepag.es'
                    ].map((relay) => (
                      <Button
                        key={relay}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const relayUrl = 'wss://' + relay;
                          if (!testRelays.includes(relayUrl)) {
                            setTestRelays([...testRelays, relayUrl]);
                          }
                        }}
                      >
                        {relay}
                      </Button>
                    ))}
                  </div>

                  {/* Load NIP-65 Button in manual mode */}
                  <div className="pt-2 border-t">
                    <Button
                      onClick={() => loadNip65Relays(true)}
                      disabled={isLoadingRelays || !user}
                      variant="outline"
                      size="sm"
                      className="w-full border-purple-600 text-purple-600 hover:bg-purple-50 dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-900/20"
                    >
                      {isLoadingRelays ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading NIP-65...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Replace with My Relays (NIP-65)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Relay List */}
              <div className="space-y-2">
                {testRelays.map((relay, index) => (
                  <div key={relay} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${hasLoadedNip65 && !showManualEntry ? 'bg-purple-500' : 'bg-green-500'}`}></div>
                      <div className="text-sm font-mono">{relay}</div>
                      {hasLoadedNip65 && !showManualEntry && (
                        <Badge variant="outline" className="text-xs ml-2">NIP-65</Badge>
                      )}
                    </div>
                    {showManualEntry && (
                      <Button
                        onClick={() => removeRelay(index)}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {testRelays.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {isLoadingRelays ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading your relays from NIP-65...
                    </div>
                  ) : (
                    'No relays loaded. Add at least one relay to start testing.'
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress */}
          {isRunning && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Analysis Progress</CardTitle>
                <CardDescription>{currentPhase}</CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {progress.toFixed(0)}% complete
                </p>
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {(error || relayListError) && (
            <Card className="mb-8 border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                  <WifiOff className="h-5 w-5" />
                  {relayListError ? 'NIP-65 Error' : 'Analysis Error'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-600 dark:text-red-400">
                  {relayListError || error}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results && (
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Analysis Results
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Latency and bandwidth comparison across {results.length} relays
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                          Relay
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                          Status
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="h-4 w-4" />
                            Latency
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                          <div className="flex items-center justify-center gap-1">
                            <Zap className="h-4 w-4" />
                            Bandwidth
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                          Events
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                          Data Size
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {results.map((result) => (
                        <tr key={result.relay} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3">
                            <div className="font-mono text-sm">
                              {result.relay.replace('wss://', '').replace('ws://', '')}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={result.success ? "default" : "destructive"} className="text-xs">
                              {result.success ? "✓" : "✗"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {result.success ? (
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                {formatLatency(result.latency)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {result.success ? (
                              <span className="font-bold text-green-600 dark:text-green-400">
                                {formatBandwidth(result.bandwidth)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                            {result.success ? result.eventCount : '-'}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                            {result.success ? formatBytes(result.totalBytes) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Quick Stats Footer */}
                {results.filter(r => r.success).length > 1 && (
                  <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-t">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-green-600 dark:text-green-400">Fastest Latency: </span>
                        {(() => {
                          const successful = results.filter(r => r.success);
                          const fastest = successful.reduce((prev, curr) =>
                            prev.latency < curr.latency ? prev : curr
                          );
                          return (
                            <span className="font-mono">
                              {fastest.relay.replace('wss://', '').replace('ws://', '')}
                              ({formatLatency(fastest.latency)})
                            </span>
                          );
                        })()}
                      </div>
                      <div>
                        <span className="font-medium text-blue-600 dark:text-blue-400">Highest Bandwidth: </span>
                        {(() => {
                          const successful = results.filter(r => r.success);
                          const fastest = successful.reduce((prev, curr) =>
                            prev.bandwidth > curr.bandwidth ? prev : curr
                          );
                          return (
                            <span className="font-mono">
                              {fastest.relay.replace('wss://', '').replace('ws://', '')}
                              ({formatBandwidth(fastest.bandwidth)})
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Messages */}
                {results.some(r => !r.success) && (
                  <div className="bg-red-50 dark:bg-red-900/20 px-4 py-3 border-t border-red-200 dark:border-red-800">
                    <div className="text-sm text-red-600 dark:text-red-400">
                      <div className="font-medium mb-1">Failed Relays:</div>
                      {results.filter(r => !r.success).map(result => (
                        <div key={result.relay} className="font-mono text-xs">
                          {result.relay}: {result.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Common Neighbor Results */}
          {results && results.filter(r => r.success).length >= 2 && overlapResults && overlapResults.length > 0 && (
            <Card className="mt-8 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Common Neighbor Results
                </CardTitle>
                <CardDescription className="text-purple-100">
                  Event overlap analysis between relay pairs
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                          Relay Pair
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                          Common Events
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                          Overlap %
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                          Relay 1 Only
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                          Relay 2 Only
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                          Total Unique
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {overlapResults.map((overlap, index) => {
                        const totalUnique = overlap.relay1Only + overlap.relay2Only + overlap.common;
                        return (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <div className="font-mono text-xs text-blue-600 dark:text-blue-400">
                                  {overlap.relay1.replace('wss://', '').replace('ws://', '')}
                                </div>
                                <div className="text-xs text-gray-400">vs</div>
                                <div className="font-mono text-xs text-purple-600 dark:text-purple-400">
                                  {overlap.relay2.replace('wss://', '').replace('ws://', '')}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-bold text-green-600 dark:text-green-400">
                                {overlap.common}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-lg">
                                  {overlap.overlapPercentage.toFixed(1)}%
                                </span>
                                <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                                  <div
                                    className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(overlap.overlapPercentage, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="space-y-1">
                                <div className="font-semibold text-blue-600 dark:text-blue-400">
                                  {overlap.relay1Only}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ({overlap.relay1Total} total)
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="space-y-1">
                                <div className="font-semibold text-purple-600 dark:text-purple-400">
                                  {overlap.relay2Only}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ({overlap.relay2Total} total)
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="font-semibold">
                                {totalUnique}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Overlap Summary */}
                <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-t">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="font-medium">Average Overlap: </span>
                        <span className="font-bold">
                          {(overlapResults.reduce((sum, r) => sum + r.overlapPercentage, 0) / overlapResults.length).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Most Overlap: </span>
                        <span className="font-bold text-green-600 dark:text-green-400">
                          {Math.max(...overlapResults.map(r => r.overlapPercentage)).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Total Unique Events: </span>
                        <span className="font-bold">
                          {Math.max(...overlapResults.map(r => r.relay1Only + r.relay2Only + r.common))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="text-center mt-12 text-sm text-gray-600 dark:text-gray-400">
            <p>
              Vibed with{' '}
              <a
                href="https://soapbox.pub/mkstack"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                MKStack
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelayPerformance;