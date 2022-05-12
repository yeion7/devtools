import { TimeStampedPointRange } from "@recordreplay/protocol";

import loadManager from "./loadManager";

const range = (a: number, b: number): TimeStampedPointRange => {
  return {
    begin: { point: `${a}`, time: a },
    end: { point: `${b}`, time: b },
  };
};

describe("loadManager", () => {
  test("waiting for a point", async () => {
    const point = loadManager.waitForPointLoaded({ time: 0, point: "100" });

    loadManager.updateLoadedStatus({
      loading: [range(0, 100)],
      loaded: [range(0, 100)],
      indexed: [range(0, 100)],
    });

    expect(await point).toBe(true);
  });

  test("waiting for a range", async () => {
    const aRange = loadManager.waitForRangeLoaded({
      begin: { time: 0, point: "100" },
      end: { time: 0, point: "200" },
    });

    loadManager.updateLoadedStatus({
      loading: [range(0, 200)],
      loaded: [range(0, 200)],
      indexed: [range(0, 200)],
    });

    expect(await aRange).toBe(true);
  });
});
