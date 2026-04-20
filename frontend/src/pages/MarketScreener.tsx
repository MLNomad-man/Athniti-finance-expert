import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { usePredX } from '../context/PredXContext';
import {
  getStockList,
  getCryptoPrices,
  searchStocks,
  stockToUnified,
  cryptoToUnified,
  NSE_WATCHLIST,
  BSE_WATCHLIST,
  type UnifiedAsset,
  type SearchResult,
} from '../lib/stockApi';

type ExchangeTab = 'ALL' | 'NSE' | 'BSE' | 'CRYPTO';
type SortKey = 'symbol' | 'name' | 'price' | 'change' | 'changePercent' | 'volume' | 'marketCap' | 'peRatio' | 'sector';
type SortDir = 'asc' | 'desc';

const MarketScreener: React.FC = () => {
  const { navigate, themeMode } = usePredX();
  const [assets, setAssets] = useState<UnifiedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ExchangeTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('changePercent');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ─── Fetch all data ────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    try {
      const [nseStocks, bseStocks, cryptos] = await Promise.all([
        getStockList(NSE_WATCHLIST, 'NSE'),
        getStockList(BSE_WATCHLIST, 'BSE'),
        getCryptoPrices(),
      ]);

      const unified: UnifiedAsset[] = [
        ...nseStocks.map(stockToUnified),
        ...bseStocks.map(stockToUnified),
        ...cryptos.map(cryptoToUnified),
      ];

      setAssets(unified);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch market data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 60000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // ─── Search debounce ───────────────────────────────────────
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timeout = setTimeout(async () => {
      const results = await searchStocks(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // ─── Filter & Sort ─────────────────────────────────────────
  const filteredAssets = useMemo(() => {
    let filtered = assets;

    if (activeTab !== 'ALL') {
      filtered = filtered.filter(a => a.exchange === activeTab);
    }

    if (searchQuery && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching) {
      // Filter from loaded data
      filtered = filtered.filter(
        a =>
          a.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return filtered;
  }, [assets, activeTab, searchQuery, searchResults, isSearching, sortKey, sortDir]);

  // ─── Helpers ───────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const formatVolume = (v: number): string => {
    if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toFixed(0);
  };

  const formatMarketCap = (mc: number): string => {
    if (mc <= 0) return '—';
    if (mc >= 1e12) return `₹${(mc / 1e12).toFixed(2)}T`;
    if (mc >= 1e9) return `₹${(mc / 1e9).toFixed(0)}B`;
    if (mc >= 1e7) return `₹${(mc / 1e7).toFixed(0)}Cr`;
    return `₹${formatVolume(mc)}`;
  };

  const formatPrice = (price: number, assetType: string): string => {
    if (assetType === 'crypto') {
      if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (price >= 1) return `$${price.toFixed(4)}`;
      return `$${price.toFixed(6)}`;
    }
    return `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // ─── Ticker Ribbon Data ────────────────────────────────────
  const ribbonData = useMemo(() => {
    return assets.filter(a => ['RELIANCE', 'TCS', 'INFY', 'BTC', 'ETH', 'SOL', 'HDFCBANK', 'ITC', 'XRP', 'ADA', 'DOGE', 'AVAX'].includes(a.symbol));
  }, [assets]);

  const tabs: { key: ExchangeTab; label: string; icon: string }[] = [
    { key: 'ALL', label: 'All', icon: 'apps' },
    { key: 'NSE', label: 'NSE', icon: 'currency_rupee' },
    { key: 'BSE', label: 'BSE', icon: 'account_balance' },
    { key: 'CRYPTO', label: 'Crypto', icon: 'token' },
  ];

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="material-symbols-outlined text-[14px] opacity-30">unfold_more</span>;
    return <span className="material-symbols-outlined text-[14px] text-primary-container">{sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>;
  };

  const exchangeBadgeColor = (ex: string) => {
    if (ex === 'NSE') return 'bg-blue-500/20 text-blue-400';
    if (ex === 'BSE') return 'bg-amber-500/20 text-amber-400';
    return 'bg-purple-500/20 text-purple-400';
  };

  return (
    <DashboardLayout>
      <div className="px-4 md:px-6 pb-12">
        {/* ─── Ticker Ribbon ─────────────────────────────────── */}
        {ribbonData.length > 0 && (
          <div className="overflow-hidden mb-6 -mx-4 md:-mx-6 px-4 md:px-6">
            <div className="ticker-ribbon flex gap-6 py-3">
              {[...ribbonData, ...ribbonData].map((a, i) => (
                <div
                  key={`${a.ticker}-${i}`}
                  className="flex items-center gap-2 whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate('trade', { symbol: a.ticker, assetType: a.assetType })}
                >
                  <span className="text-xs font-bold text-on-surface">{a.symbol}</span>
                  <span className="text-xs font-mono text-on-surface-variant">
                    {formatPrice(a.price, a.assetType)}
                  </span>
                  <span className={`text-[11px] font-bold ${a.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {a.changePercent >= 0 ? '+' : ''}{a.changePercent.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Header ────────────────────────────────────────── */}
        <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black font-headline text-on-surface tracking-tight leading-none mb-2">
              Market <span className="text-primary-container">Screener</span>
            </h1>
            <p className="text-on-surface-variant text-sm font-body leading-relaxed">
              Live data from NSE, BSE & Crypto exchanges. Auto-refreshes every 15s.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-on-surface-variant">
            {lastUpdated && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Updated {lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
            <span className="px-3 py-1 bg-primary-container/10 text-primary-container font-bold rounded-full">
              {assets.length} Assets
            </span>
          </div>
        </header>

        {/* ─── Filters Bar ───────────────────────────────────── */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Exchange Tabs */}
          <div className="flex bg-surface-container-low p-1 rounded-xl gap-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.key
                    ? 'bg-primary-container text-on-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-sm">
              search
            </span>
            <input
              className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary-container/40 focus:outline-none font-label text-on-surface placeholder:text-on-surface-variant/40"
              placeholder="Search stocks or crypto..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {/* Search dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container border border-outline-variant/20 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                {searchResults.map(r => (
                  <div
                    key={r.symbol}
                    className="flex items-center justify-between px-4 py-3 hover:bg-surface-container-high cursor-pointer transition-colors border-b border-outline-variant/5 last:border-0"
                    onClick={() => {
                      navigate('trade', { symbol: r.symbol, assetType: 'stock' });
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    <div>
                      <span className="font-bold text-sm text-on-surface">{r.symbol}</span>
                      <span className="text-xs text-on-surface-variant ml-2">{r.company_name}</span>
                    </div>
                    <span className="material-symbols-outlined text-sm text-on-surface-variant">arrow_forward</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Data Table ────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-primary-container border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-on-surface-variant">Fetching live market data...</p>
          </div>
        ) : (
          <div className="bg-surface-container-low rounded-xl border border-outline-variant/10 overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-surface-container-highest/30 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant border-b border-outline-variant/10">
              <div
                className="col-span-1 flex items-center gap-1 cursor-pointer hover:text-on-surface"
                onClick={() => handleSort('symbol')}
              >
                Symbol <SortIcon col="symbol" />
              </div>
              <div
                className="col-span-3 flex items-center gap-1 cursor-pointer hover:text-on-surface"
                onClick={() => handleSort('name')}
              >
                Name <SortIcon col="name" />
              </div>
              <div className="col-span-1 text-center">Exchange</div>
              <div
                className="col-span-2 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-on-surface"
                onClick={() => handleSort('price')}
              >
                Price <SortIcon col="price" />
              </div>
              <div
                className="col-span-1 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-on-surface"
                onClick={() => handleSort('changePercent')}
              >
                Change <SortIcon col="changePercent" />
              </div>
              <div
                className="col-span-1 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-on-surface"
                onClick={() => handleSort('volume')}
              >
                Volume <SortIcon col="volume" />
              </div>
              <div
                className="col-span-1 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-on-surface"
                onClick={() => handleSort('marketCap')}
              >
                Mkt Cap <SortIcon col="marketCap" />
              </div>
              <div
                className="col-span-1 text-right flex items-center justify-end gap-1 cursor-pointer hover:text-on-surface"
                onClick={() => handleSort('sector')}
              >
                Sector <SortIcon col="sector" />
              </div>
              <div className="col-span-1 text-center">Action</div>
            </div>

            {/* Table Rows */}
            {filteredAssets.length === 0 ? (
              <div className="text-center py-16">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/20 mb-3 block">search_off</span>
                <h3 className="font-headline font-bold text-on-surface mb-1">No Results</h3>
                <p className="text-sm text-on-surface-variant">Try adjusting your search or filters.</p>
              </div>
            ) : (
              filteredAssets.map(asset => (
                <div
                  key={asset.ticker}
                  className="grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 border-b border-outline-variant/5 last:border-0 hover:bg-surface-container-highest/10 transition-colors cursor-pointer items-center group"
                  onClick={() => navigate('trade', { symbol: asset.ticker, assetType: asset.assetType })}
                >
                  {/* Symbol */}
                  <div className="col-span-1 font-bold text-sm text-on-surface flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${
                      asset.assetType === 'crypto' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {asset.symbol.slice(0, 2)}
                    </div>
                    <span className="hidden md:inline">{asset.symbol}</span>
                  </div>

                  {/* Name */}
                  <div className="col-span-1 md:col-span-3">
                    <p className="text-sm font-semibold text-on-surface truncate">{asset.name}</p>
                    <p className="text-[10px] text-on-surface-variant md:hidden">{asset.symbol} · {asset.exchange}</p>
                  </div>

                  {/* Exchange Badge */}
                  <div className="hidden md:flex col-span-1 justify-center">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${exchangeBadgeColor(asset.exchange)}`}>
                      {asset.exchange}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="hidden md:block col-span-2 text-right">
                    <span className="text-sm font-bold font-mono text-on-surface">
                      {formatPrice(asset.price, asset.assetType)}
                    </span>
                  </div>

                  {/* Change */}
                  <div className="hidden md:flex col-span-1 justify-end items-center gap-1">
                    <span className={`text-xs font-bold ${asset.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      <span className="material-symbols-outlined text-[14px] align-middle">
                        {asset.changePercent >= 0 ? 'trending_up' : 'trending_down'}
                      </span>
                      {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
                    </span>
                  </div>

                  {/* Volume */}
                  <div className="hidden md:block col-span-1 text-right">
                    <span className="text-xs font-mono text-on-surface-variant">{formatVolume(asset.volume)}</span>
                  </div>

                  {/* Market Cap */}
                  <div className="hidden md:block col-span-1 text-right">
                    <span className="text-xs font-mono text-on-surface-variant">{formatMarketCap(asset.marketCap)}</span>
                  </div>

                  {/* Sector */}
                  <div className="hidden md:block col-span-1 text-right">
                    <span className="text-[10px] text-on-surface-variant truncate block">{asset.sector || '—'}</span>
                  </div>

                  {/* Action */}
                  <div className="hidden md:flex col-span-1 justify-center">
                    <button className="bg-surface-container-highest group-hover:bg-primary-container group-hover:text-on-primary transition-all px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                      Trade
                    </button>
                  </div>

                  {/* Mobile: Price + Change */}
                  <div className="md:hidden text-right">
                    <p className="text-sm font-bold font-mono text-on-surface">{formatPrice(asset.price, asset.assetType)}</p>
                    <p className={`text-[11px] font-bold ${asset.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── Stats Footer ──────────────────────────────────── */}
        <footer className="mt-12 border-t border-outline-variant/10 pt-6 flex flex-wrap gap-6 justify-between opacity-80">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">NSE Stocks</p>
              <p className="text-lg font-headline font-bold">{assets.filter(a => a.exchange === 'NSE').length}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">BSE Stocks</p>
              <p className="text-lg font-headline font-bold">{assets.filter(a => a.exchange === 'BSE').length}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Crypto Assets</p>
              <p className="text-lg font-headline font-bold">{assets.filter(a => a.exchange === 'CRYPTO').length}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-primary-container/10 text-primary-container text-[11px] font-bold rounded-full">
              Live Data
            </span>
          </div>
        </footer>
      </div>
    </DashboardLayout>
  );
};

export default MarketScreener;
