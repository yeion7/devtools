import { Location } from "@recordreplay/protocol";

import { ThreadFront } from "./thread/thread";
import { defer } from "./utils";

export default class ScopeMapCache {
  private cache = new Map<string, Promise<Record<string, string>>>();

  async getScopeMap(location: Location): Promise<Record<string, string>> {
    const cacheKey = `${location.sourceId}:${location.line}:${location.column}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const { promise, resolve } = defer<Record<string, string>>();
    this.cache.set(cacheKey, promise);
    const { client } = await import("./socket");
    const { map } = await client.Debugger.getScopeMap({ location }, ThreadFront.sessionId!);
    const scopeMap: Record<string, string> = map ? Object.fromEntries(map) : {};
    resolve(scopeMap);
    return scopeMap;
  }
}
