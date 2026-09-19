"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Lead } from "./schemas";
import { isSupabaseConfigured } from "./supabase/config";
import { createClient } from "./supabase/client";
import { LocalStorageLeadRepository, type LeadRepository } from "./repositories/lead-repository";
import { SupabaseLeadRepository } from "./repositories/supabase-lead-repository";

let repository: LeadRepository | null = null;
let snapshot: Lead[] = [];
let loadingPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function getRepository() {
  if (!repository) {
    repository = isSupabaseConfigured()
      ? new SupabaseLeadRepository(createClient())
      : new LocalStorageLeadRepository(window.localStorage);
  }
  return repository;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  const onStorage = () => void refreshLeads();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export async function refreshLeads() {
  if (typeof window === "undefined") return;
  if (!loadingPromise) {
    loadingPromise = getRepository().list()
      .then((leads) => { snapshot = leads; emit(); })
      .finally(() => { loadingPromise = null; });
  }
  return loadingPromise;
}

export function useLeads(): Lead[] {
  useEffect(() => { void refreshLeads(); }, []);
  return useSyncExternalStore(subscribe, () => snapshot, () => []);
}

export async function saveLeads(incoming: Lead[]): Promise<Lead[]> {
  const saved = await getRepository().upsertMany(incoming);
  const byId = new Map(snapshot.map((lead) => [lead.id, lead]));
  saved.forEach((lead) => byId.set(lead.id, lead));
  snapshot = [...byId.values()];
  emit();
  return saved;
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<Lead | null> {
  const lead = await getRepository().update(id, patch);
  if (!lead) return null;
  snapshot = snapshot.map((item) => item.id === id ? lead : item);
  emit();
  return lead;
}

export function resetLeadRepository() {
  repository = null;
  snapshot = [];
  emit();
  void refreshLeads();
}
