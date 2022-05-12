import { loadedRegions, TimeStampedPoint, TimeStampedPointRange } from "@recordreplay/protocol";
import { isPointInRegion, isPointInRegions, isSameTimeStampedPointRange } from "ui/utils/timeline";
import { defer, Deferred } from "./utils";

class LoadManager {
  private waiters = new Map<string, Deferred<boolean>>();
  private loaded: loadedRegions = { loaded: [], loading: [], indexed: [] };

  async waitForPointLoaded(point: TimeStampedPoint) {
    console.log(`WAITING FOR ${point.point} at ${point.time}`);
    if (this.isLoaded(point.point)) {
      return true;
    }

    if (!this.waiters.has(point.point)) {
      console.log(`ADDING WAITER FOR ${point.point}`);
      this.waiters.set(point.point, defer());
    }
    return this.waiters.get(point.point)!.promise;
  }

  async waitForRangeLoaded(range: TimeStampedPointRange) {
    console.log(
      `WAITING FOR ${range.begin.point} at ${range.begin.time} to ${range.end.point} at ${range.end.time}`
    );
    const key = `${range.begin.point}:${range.end.point}`;
    console.log(`WAITING FOR ${key}`);

    if (this.isLoaded(key)) {
      return true;
    }

    if (!this.waiters.has(key)) {
      console.log(`ADDING WAITER FOR ${key}`);
      this.waiters.set(key, defer());
    }
    return this.waiters.get(key)!.promise;
  }

  async waitForLoadingFinished() {
    console.log(`WAITING FOR FINISHED`);
    if (this.isLoaded("finished")) {
      return true;
    }

    if (!this.waiters.has("finished")) {
      console.log(`ADDING WAITER FOR FINISHED`);
      this.waiters.set("finished", defer());
    }
    return this.waiters.get("finished");
  }

  isLoaded(key: string): boolean {
    console.log(`CHECKING FOR ${key}`);
    if (key === "finished") {
      console.log(JSON.stringify(this.loaded));
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

      console.log(JSON.stringify(this.loaded));
      console.log(`${key} RESOLVED`);
      return true;
    }

    const match = key.match(/(\d+):(\d+)/);
    if (match) {
      const begin = match[1];
      const end = match[2];

      const resolved =
        this.loaded.loaded.some(r => isPointInRegion(r, begin) && isPointInRegion(r, end)) &&
        this.loaded.indexed.some(r => isPointInRegion(r, begin) && isPointInRegion(r, end));

      if (resolved) {
        console.log(`${key} RESOLVED`);
      }

      return resolved;
    }

    if (key.match(/\d+/)) {
      const resolved = Boolean(
        isPointInRegions(this.loaded.loaded, key) && isPointInRegions(this.loaded.indexed, key)
      );

      if (resolved) {
        console.log(`${key} RESOLVED`);
      }

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
