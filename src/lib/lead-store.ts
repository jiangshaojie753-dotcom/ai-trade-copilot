"use client";

import { useSyncExternalStore } from "react";
import type { Lead } from "./schemas";
import { LocalStorageLeadRepository, type LeadRepository } from "./repositories/lead-repository";

let repository: LeadRepository | null = null;

function getRepository() {
  if (!repository) repository = new LocalStorageLeadRepository(window.localStorage);
  return repository;
}

export function loadLeads(): Lead[] {
  if (typeof window === "undefined") return [];
  return getRepository().list();
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
  const next = getRepository().upsertMany(incoming);
  window.dispatchEvent(new Event("atlas-leads-changed"));
  return next;
}

export function updateLead(id: string, patch: Partial<Lead>): Lead | null {
  const lead = getRepository().update(id, patch);
  window.dispatchEvent(new Event("atlas-leads-changed"));
  return lead;
}
