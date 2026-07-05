import type { TestMode, WordSet } from '../rooms/types.js';

export interface QuickMatchSettings {
  mode: TestMode;
  wordSet: WordSet;
}

export interface QueueEntry {
  userId: string;
  username: string;
  avatarUrl: string | null;
  settings: QuickMatchSettings;
  queuedAt: number;
  socketId: string;
}

function settingsHash(s: QuickMatchSettings): string {
  return `${s.mode}:${s.wordSet}`;
}

class QuickMatchQueue {
  // Grouped by settings-hash so only compatible players are matched together.
  private groups = new Map<string, QueueEntry[]>();

  enqueue(entry: QueueEntry) {
    const key = settingsHash(entry.settings);
    const group = this.groups.get(key) ?? [];
    group.push(entry);
    this.groups.set(key, group);
  }

  remove(userId: string) {
    for (const [key, group] of this.groups) {
      const filtered = group.filter((e) => e.userId !== userId);
      if (filtered.length) this.groups.set(key, filtered);
      else this.groups.delete(key);
    }
  }

  /** Pops 2 players from the same group if available (min group size to pop a match). */
  tryPopPair(settings: QuickMatchSettings): [QueueEntry, QueueEntry] | null {
    const key = settingsHash(settings);
    const group = this.groups.get(key);
    if (!group || group.length < 2) return null;
    const [a, b, ...rest] = group;
    this.groups.set(key, rest);
    return [a, b];
  }

  /** ~15s timeout handling: widen the search to ANY group (any mode/wordSet). */
  tryPopAnyPair(userId: string): [QueueEntry, QueueEntry] | null {
    for (const [key, group] of this.groups) {
      const others = group.filter((e) => e.userId !== userId);
      const me = group.find((e) => e.userId === userId);
      if (me && others.length >= 1) {
        const [partner, ...rest] = others;
        this.groups.set(key, rest.length || group.length > 2 ? group.filter((e) => e !== me && e !== partner) : []);
        return [me, partner];
      }
    }
    return null;
  }

  queuedFor(userId: string): number | null {
    for (const group of this.groups.values()) {
      const entry = group.find((e) => e.userId === userId);
      if (entry) return Date.now() - entry.queuedAt;
    }
    return null;
  }
}

export const quickMatchQueue = new QuickMatchQueue();
