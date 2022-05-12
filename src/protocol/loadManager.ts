import { loadedRegions, TimeStampedPoint, TimeStampedPointRange } from "@recordreplay/protocol";
import { Deferred } from "next/dist/server/image-optimizer";
import { isPointInRegion, isPointInRegions, isSameTimeStampedPointRange } from "ui/utils/timeline";

class LoadManager {
  private waiters = new Map<string, Deferred<boolean>>();
  private loaded: loadedRegions = { loaded: [], loading: [], indexed: [] };

  async waitForPointLoaded(point: TimeStampedPoint) {
    if (!this.waiters.has(point.point)) {
      this.waiters.set(point.point, new Deferred<boolean>());
    }
    return this.waiters.get(point.point)!.promise;
  }

  async waitForRangeLoaded(range: TimeStampedPointRange) {
    this.waiters.set(`${range.begin.point}:${range.end.point}`, new Deferred<boolean>());
  }

  async waitForLoadingFinished() {
    if (!this.waiters.has("finished")) {
      this.waiters.set("finished", new Deferred<boolean>());
    }
    return this.waiters.get("finished");
  }

  isLoaded(key: string): boolean {
    if (key === "finished") {
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
      console.log({ begin, end });
      console.log(this.loaded.loaded.map(r => isPointInRegion(r, begin)));
      console.log(this.loaded.loaded.map(r => isPointInRegion(r, end)));
      console.log(this.loaded.indexed.map(r => isPointInRegion(r, begin)));
      console.log(this.loaded.indexed.map(r => isPointInRegion(r, end)));
      return (
        this.loaded.loaded.some(r => isPointInRegion(r, begin) && isPointInRegion(r, end)) &&
        this.loaded.indexed.some(r => isPointInRegion(r, begin) && isPointInRegion(r, end))
      );
    }

    if (key.match(/\d+/)) {
      return Boolean(
        isPointInRegions(this.loaded.loaded, key) && isPointInRegions(this.loaded.indexed, key)
      );
    }

    throw `Invalid key for load manager: ${key}`;
  }

  updateLoadedStatus(loaded: loadedRegions) {
    this.loaded = loaded;
    for (const [key, value] of this.waiters.entries()) {
      console.log({ key, value });
      if (this.isLoaded(key)) {
        value.resolve(true);
        this.waiters.delete(key);
      }
    }
  }
}

export default new LoadManager();
