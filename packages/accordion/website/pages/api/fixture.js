const { readFileSync } = require("fs");
import { gql } from "@apollo/client";

// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

export function convertRecording(rec) {
  if (!rec) {
    return undefined;
  }

  const collaborators = rec.collaborators?.edges?.filter(e => e.node.user).map(e => e.node.user.id);
  const collaboratorRequests = rec.collaboratorRequests?.edges.map(e => e.node);

  return {
    id: rec.uuid,
    user: rec.owner,
    userId: rec.owner?.id,
    // NOTE: URLs are nullable in the database
    url: rec.url || "",
    title: rec.title,
    duration: rec.duration,
    private: rec.private,
    isInitialized: rec.isInitialized,
    date: rec.createdAt,
    workspace: rec.workspace,
    comments: rec.comments,
    collaborators,
    collaboratorRequests,
    ownerNeedsInvite: rec.ownerNeedsInvite,
    userRole: rec.userRole,
    operations: rec.operations,
    resolution: rec.resolution,
  };
}

export default async function loadFixtureData(req, res) {
  const testName = req.query.testName;
  const graphqlMocks = [];
  console.log(testName);
  const apolloFixtureData = JSON.parse(
    readFileSync(`${__dirname}/../../../../../../../test/fixtures/${testName}.apollo.json`, "utf8")
  );

  apolloFixtureData.forEach(({ requestData, responseData }) => {
    // Strip "__typename" attributes because they interfere with how we configure the MockedProvider.
    requestData.query = requestData.query.replace(/[\r\n]\s+__typename/g, "");

    // Put a few copies of each request/response pair in the mock queue;
    // Apollo removes responses from the queue when they're matched.
    for (let i = 0; i < 5; i++) {
      const mock = {
        request: {
          operationName: requestData.operationName,
          query: gql(requestData.query),
          variables: requestData.variables,
        },
        result: responseData,
      };

      graphqlMocks.push(mock);
    }
  });

  const recordingMock = apolloFixtureData.find(message => {
    return message.requestData.operationName === "GetRecording";
  });
  if (!recordingMock) {
    throw Error("Fixture does not contain a recording");
  }
  const recording = convertRecording(recordingMock.responseData.data.recording);

  const protocolMocks = JSON.parse(
    readFileSync(`${__dirname}/../../../../../../../test/fixtures/${testName}.replay.json`, "utf8")
  );

  const session = protocolMocks.find(message => {
    return message.hasOwnProperty("sessionId");
  });
  if (!session) {
    throw Error("Fixture does not contain a session ID");
  }
  const sessionId = session.sessionId;

  return res.status(200).json({ graphqlMocks, recording, sessionId, protocolMocks });
}
