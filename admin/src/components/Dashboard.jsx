import React, { useEffect, useState } from "react";
import {
  getCrawlerStatus,
  startCrawler,
  stopCrawler,
  getLeadStats,
  getLeadCategories,
  getLeadSources,
  getLeads,
  setToken,
} from "../api";
import { StatCard } from "./StatCard";
import { ErrorBanner } from "./ErrorBanner";
import { LoadingBlock } from "./LoadingBlock";
import { CategoryChart } from "./CategoryChart";
import { SourceChart } from "./SourceChart";
import { LeadsTable } from "./LeadsTable";
import { CrawlerControls } from "./CrawlerControls";

export function Dashboard({ onSignOut }) {
  const [crawlerStatus, setCrawlerStatus] = useState(null);
  const [crawlerLoading, setCrawlerLoading] = useState(false);
  const [crawlerError, setCrawlerError] = useState(null);

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);

  const [categories, setCategories] = useState(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState(null);

  const [sources, setSources] = useState(null);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState(null);

  const [leads, setLeads] = useState(null);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  function loadAll() {
    loadCrawler();
    loadStats();
    loadCategories();
    loadSources();
    loadLeads();
  }

  async function loadCrawler() {
    setCrawlerError(null);
    setCrawlerLoading(true);
    try {
      const data = await getCrawlerStatus();
      setCrawlerStatus(data);
    } catch (err) {
      setCrawlerError(err.message);
    } finally {
      setCrawlerLoading(false);
    }
  }

  async function loadStats() {
    setStatsError(null);
    setStatsLoading(true);
    try {
      const data = await getLeadStats();
      setStats(data);
    } catch (err) {
      setStatsError(err.message);
    } finally {
      setStatsLoading(false);
    }
  }

  async function loadCategories() {
    setCategoriesError(null);
    setCategoriesLoading(true);
    try {
      const data = await getLeadCategories();
      setCategories(data);
    } catch (err) {
      setCategoriesError(err.message);
    } finally {
      setCategoriesLoading(false);
    }
  }

  async function loadSources() {
    setSourcesError(null);
    setSourcesLoading(true);
    try {
      const data = await getLeadSources();
      setSources(data);
    } catch (err) {
      setSourcesError(err.message);
    } finally {
      setSourcesLoading(false);
    }
  }

  async function loadLeads() {
    setLeadsError(null);
    setLeadsLoading(true);
    try {
      const data = await getLeads({ limit: 20 });
      setLeads(Array.isArray(data) ? data : data?.leads || []);
    } catch (err) {
      setLeadsError(err.message);
    } finally {
      setLeadsLoading(false);
    }
  }

  function handleSignOut() {
    setToken(null);
    onSignOut();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top nav */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 text-xs font-bold">
              LX
            </div>
            <div>
              <div className="text-sm font-semibold">LinX Admin</div>
              <div className="text-xs text-slate-400">Crawler &amp; Lead Intelligence</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="linx-btn-outline text-xs px-2 py-1" onClick={loadAll}>
              Refresh
            </button>
            <button className="linx-btn-outline text-xs px-2 py-1" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <ErrorBanner
          message={statsError || categoriesError || sourcesError || leadsError || crawlerError}
        />

        {/* Stat cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statsLoading ? (
            <>
              <LoadingBlock />
              <LoadingBlock />
              <LoadingBlock />
              <LoadingBlock />
            </>
          ) : stats ? (
            <>
              <StatCard label="Total Leads" value={stats.total} delta={stats.new_today} />
              <StatCard
                label="Active Leads"
                value={stats.active}
                delta={stats.active_delta}
                accent="success"
              />
              <StatCard label="New Today" value={stats.new_today} accent="accent" />
              <StatCard label="Expired Leads" value={stats.expired} accent="danger" />
            </>
          ) : (
            <div className="col-span-4 text-sm text-slate-500">No stats available.</div>
          )}
        </section>

        {/* Middle row: charts + crawler */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {categoriesLoading ? (
              <LoadingBlock height="h-40" />
            ) : categories ? (
              <CategoryChart data={categories} />
            ) : (
              <div className="linx-card p-4 text-sm text-slate-500">No category data.</div>
            )}

            {sourcesLoading ? (
              <LoadingBlock height="h-40" />
            ) : sources ? (
              <SourceChart data={sources} />
            ) : (
              <div className="linx-card p-4 text-sm text-slate-500">No source data.</div>
            )}
          </div>

          <div className="space-y-4">
            <CrawlerControls
              status={crawlerStatus}
              loading={crawlerLoading}
              onStart={async () => {
                setCrawlerLoading(true);
                setCrawlerError(null);
                try {
                  await startCrawler();
                  await loadCrawler();
                } catch (err) {
                  setCrawlerError(err.message);
                } finally {
                  setCrawlerLoading(false);
                }
              }}
              onStop={async () => {
                setCrawlerLoading(true);
                setCrawlerError(null);
                try {
                  await stopCrawler();
                  await loadCrawler();
                } catch (err) {
                  setCrawlerError(err.message);
                } finally {
                  setCrawlerLoading(false);
                }
              }}
            />
          </div>
        </section>

        {/* Leads table */}
        <section>
          {leadsLoading ? (
            <LoadingBlock height="h-48" />
          ) : (
            <LeadsTable leads={leads} />
          )}
        </section>
      </main>
    </div>
  );
}
