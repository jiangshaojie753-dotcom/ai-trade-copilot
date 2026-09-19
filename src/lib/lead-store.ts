"use client";

import { useSyncExternalStore } from "react";
import type { Lead } from "./schemas";

const KEY = "atlas-leads-v1";
let cachedRaw = "";
let cachedLeads: Lead[] = [];

export function loadLeads(): Lead[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(KEY) ?? "[]";
  if (raw === cachedRaw) return cachedLeads;
  try { cachedLeads = JSON.parse(raw) as Lead[]; cachedRaw = raw; return cachedLeads; } catch { return []; }
}

function subscribe(callback: () => void) {
  window.addEventListener("atlas-leads-changed", callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener("atlas-leads-changed", callback); window.removeEventListener("storage", callback); };
}

const emptyLeads: Lead[] = [];
export function useLeads(): Lead[] {
  return useSyncExternalStore(subscribe, loadLeads, () => emptyLeads);
}

export function saveLeads(incoming: Lead[]): Lead[] {
  const current = loadLeads();
  const byId = new Map(current.map((lead) => [lead.id, lead]));
  incoming.forEach((lead) => byId.set(lead.id, lead));
  const next = [...byId.values()];
  const raw = JSON.stringify(next); cachedRaw = raw; cachedLeads = next;
  window.localStorage.setItem(KEY, raw);
  window.dispatchEvent(new Event("atlas-leads-changed"));
  return next;
}

export function updateLead(id: string, patch: Partial<Lead>): Lead | null {
  const leads = loadLeads();
  const index = leads.findIndex((lead) => lead.id === id);
  if (index < 0) return null;
  leads[index] = { ...leads[index], ...patch, updatedAt: new Date().toISOString() };
  const raw = JSON.stringify(leads); cachedRaw = raw; cachedLeads = leads;
  window.localStorage.setItem(KEY, raw);
  window.dispatchEvent(new Event("atlas-leads-changed"));
  return leads[index];
}
