"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Lead } from "./schemas";
import { getSupabaseClientForCurrentSession } from "./supabase/session";
import { LocalStorageLeadRepository, type LeadRepository } from "./repositories/lead-repository";
import { SupabaseLeadRepository } from "./repositories/supabase-lead-repository";

const serverSnapshot: Lead[] = [];
let repositoryPromise: Promise<LeadRepository> | null = null;
let snapshot: Lead[] = [];
let loadingPromise: Promise<void> | null = null;
let repositoryGeneration = 0;
const listeners = new Set<() => void>();

async function getRepository(): Promise<LeadRepository> {
  if (!repositoryPromise) {
    repositoryPromise = createRepository();
  }
  return repositoryPromise;
}

async function createRepository(): Promise<LeadRepository> {
  const client = await getSupabaseClientForCurrentSession();
  return client
    ? new SupabaseLeadRepository(client)
    : new LocalStorageLeadRepository(window.localStorage);
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
    const generation = repositoryGeneration;
    const task = getRepository()
      .then((activeRepository) => activeRepository.list())
      .then((leads) => {
        if (generation !== repositoryGeneration) return;
        snapshot = leads;
        emit();
      });
    loadingPromise = task;
    void task.finally(() => {
      if (loadingPromise === task) loadingPromise = null;
    });
  }
  return loadingPromise;
}

export function useLeads(): Lead[] {
  useEffect(() => { void refreshLeads(); }, []);
  return useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
}

export async function saveLeads(incoming: Lead[]): Promise<Lead[]> {
  const activeRepository = await getRepository();
  const saved = await activeRepository.upsertMany(incoming);
  const byId = new Map(snapshot.map((lead) => [lead.id, lead]));
  saved.forEach((lead) => byId.set(lead.id, lead));
  snapshot = [...byId.values()];
  emit();
  return saved;
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<Lead | null> {
  const activeRepository = await getRepository();
  const lead = await activeRepository.update(id, patch);
  if (!lead) return null;
  snapshot = snapshot.map((item) => item.id === id ? lead : item);
  emit();
  return lead;
}

export function resetLeadRepository() {
  repositoryGeneration += 1;
  repositoryPromise = null;
  loadingPromise = null;
  snapshot = [];
  emit();
  void refreshLeads();
}
