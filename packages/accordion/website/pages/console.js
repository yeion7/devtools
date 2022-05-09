import useSWR from "swr";
import { createTestStore } from "../../../../src/test/testUtils";
const fetcher = url => fetch(url).then(r => r.json());

export default async function Home() {
  const { data, error } = useSWR("/api/fixture?testName=console_messages", fetcher);
  if (error) {
    return <div>failed to load</div>;
  }
  if (!data) {
    return <div>loading...</div>;
  }
  console.log(data);

  const { graphqlMocks, recording, sessionId, protocolMocks } = data;
  //
  // TODO This is side effectful in a way that affects ThreadFront.setSessionId(); we should clean that up!
  const store = await createTestStore();
  console.log(store);

  // This is necessary to unblock various event listeners and parsing.
  // Actual session ID value _probably_ doesn't matter here.
  //   await ThreadFront.setSessionId(sessionId);

  // Initialize state using exported websocket messages,
  // sent through the mock environment straight to socket parsing.
  // protocolMocks.forEach(message => {
  //   window.mockEnvironment?.sendSocketMessage(JSON.stringify(message));
  // });

  // Give everything time to settle
  //   await new Promise(resolve => setTimeout(resolve, 100));

  return <div>Yo</div>;
}
