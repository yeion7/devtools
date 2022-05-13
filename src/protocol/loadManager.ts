import { loadedRegions, TimeStampedPoint, TimeStampedPointRange } from "@recordreplay/protocol";
import { isPointInRegion, isPointInRegions, isSameTimeStampedPointRange } from "ui/utils/timeline";

import { defer, Deferred } from "./utils";

class LoadManager {
  private waiters = new Map<string, Deferred<boolean>>();
  private loaded: loadedRegions = { loaded: [], loading: [], indexed: [] };

  async waitForPointLoaded(point: TimeStampedPoint) {
    if (this.isLoaded(point.point)) {
      return true;
    }

    if (!this.waiters.has(point.point)) {
      this.waiters.set(point.point, defer());
    }
    return this.waiters.get(point.point)!.promise;
  }

  async waitForRangeLoaded(range: TimeStampedPointRange) {
    const key = `${range.begin.point}:${range.end.point}`;

    if (this.isLoaded(key)) {
      return true;
    }

    if (!this.waiters.has(key)) {
      this.waiters.set(key, defer());
    }
    return this.waiters.get(key)!.promise;
  }

  async waitForLoadingFinished() {
    if (this.isLoaded("finished")) {
      return true;
    }

    if (!this.waiters.has("finished")) {
      this.waiters.set("finished", defer());
    }
    return this.waiters.get("finished");
  }

  isLoaded(key: string): boolean {
    if (key === "finished") {
      if (this.loaded.loading.length === 0) {
        return false;
      }

      for (let i = 0; i < this.loaded.loading.length; i++) {
        if (
          isSameTimeStampedPointRange(this.loaded.loading[i] || [], this.loaded.loaded[i] || []) &&
          isSameTimeStampedPointRange(this.loaded.loading[i] || [], this.loaded.indexed[i] || [])
        ) {
          continue;
        } else {
          return false;
        }
      }

      return true;
    }

    const match = key.match(/(\d+):(\d+)/);
    if (match) {
      const begin = match[1];
      const end = match[2];

      const resolved =
        this.loaded.loaded.some(r => isPointInRegion(r, begin) && isPointInRegion(r, end)) &&
        this.loaded.indexed.some(r => isPointInRegion(r, begin) && isPointInRegion(r, end));

      return resolved;
    }

    if (key.match(/\d+/)) {
      const resolved = Boolean(
        isPointInRegions(this.loaded.loaded, key) && isPointInRegions(this.loaded.indexed, key)
      );

      return resolved;
    }

    throw `Invalid key for load manager: ${key}`;
  }

  updateLoadedStatus(loaded: loadedRegions) {
    this.loaded = loaded;
    for (const [key, value] of this.waiters.entries()) {
      if (this.isLoaded(key)) {
        value.resolve(true);
        this.waiters.delete(key);
      }
    }
  }
}

export default new LoadManager();
