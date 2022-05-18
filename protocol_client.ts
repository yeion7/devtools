import WSWebSocket from "ws";

import { ProtocolClient } from "@recordreplay/protocol";

export interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
}

export function defer<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

class ReplayClient {
  socket: WSWebSocket;
  verbose: boolean = true;
  messageCount = 1;
  client: ProtocolClient;
  responses: Deferred<any>[] = [];
  openPromise: Deferred<void> = defer();
  closePromise: Deferred<void> = defer();

  constructor() {
    this.socket = new WSWebSocket("wss://dispatch.replay.io/");
    this.client = new ProtocolClient({
      sendCommand: params => this.send(params, true),
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    this.socket.onmessage = msg => this.receive(msg);
    this.socket.onopen = () => this.openPromise.resolve();
    this.socket.onopen = () => this.openPromise.resolve();
  }

  async open() {
    return this.openPromise.promise;
  }

  async send(message: any, verbose: boolean = true) {
    this.verbose = verbose;
    if (this.verbose) {
      console.log("→", JSON.stringify(message, undefined, 2));
    }
    this.socket.send(JSON.stringify({ ...message, id: this.messageCount }));
    const deferred: Deferred<any> = defer();
    this.responses.push(deferred);
    this.messageCount++;
    return this.responses[this.messageCount - 2].promise;
  }

  receive(msg: WSWebSocket.MessageEvent) {
    const content = JSON.parse(msg.data.toString());
    if (this.verbose) {
      console.log("←", JSON.stringify(content, undefined, 2));
    }
    if (content["id"]) {
      this.responses[Number(content["id"]) - 1].resolve(content);
    }
  }

  close() {
    this.socket.close();
    return this.closePromise.promise;
  }
}

const main = async () => {
  const client = new ReplayClient();

  await client.open();

  await client.send({
    method: "Authentication.setAccessToken",
    params: { accessToken: process.env.ACCESS_TOKEN },
  });
  const sessionId = (
    await client.send({
      method: "Recording.createSession",
      params: {
        recordingId: "f2a3d99a-026a-4f0d-8486-2f362accea1b",
        experimentalSettings: {
          controllerKey: String(Math.floor(Math.random() * 100000000000)),
          listenForMetrics: false,
          disableCache: false,
          useMultipleControllers: true,
          multipleControllerUseSnapshots: true,
        },
      },
    })
  )["result"]["sessionId"];
  const findTimeForPoint = async (point: string) => {
    const analysisId = (
      await client.send({
        method: "Analysis.createAnalysis",
        params: {
          mapper: "return [];",
          effectful: true,
        },
        sessionId,
      })
    )["result"]["analysisId"];
    await client.send({
      method: "Analysis.addPoints",
      params: {
        analysisId,
        points: [point],
      },
      sessionId,
    });
    // await client.send({
    //   method: "Analysis.findAnalysisPoints",
    //   params: { analysisId },
    //   sessionId,
    // });
    await client.send({
      method: "Analysis.runAnalysis",
      params: { analysisId },
      sessionId,
    });
    await client.send({
      method: "Analysis.releaseAnalysis",
      params: { analysisId },
      sessionId,
    });
  };
  const {
    result: {
      endpoint: { point: endpoint },
    },
  } = await client.send({ method: "Session.getEndpoint", sessionId });
  await client.send({
    method: "Console.findMessagesInRange",
    params: { range: { begin: "0", end: endpoint } },
    sessionId,
  });
  await client.close();
};

main();
