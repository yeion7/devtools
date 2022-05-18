import { analysisError, analysisResult, Location, PointDescription } from "@recordreplay/protocol";
import { createEntityAdapter, createSlice, PayloadAction } from "@reduxjs/toolkit";

enum AnalysisStatus {
  // Happy path
  Created,
  LoadingPoints,
  PointsRetrieved,
  LoadingResults,
  Completed,

  // We don't have this yet, but we *should*, it's important. For instance, when
  // a user changes their focus region and we're going to rerun this anyways?
  // Cancel it!
  Cancelled,

  // These errors mean very different things! The max hits for getting points is
  // 10,000, while the max hits for running an analysis is 200!
  ErroredGettingPoints,
  ErroredRunning,
}

export type AnalysisSummary = {
  error: analysisError | undefined;
  id: string;
  location: Location | undefined;
  points: PointDescription[] | undefined;
  // Do we want to store results here? I guess so? They can be a bit
  // unweildy I think, but I expect they will be serializable.
  results: analysisResult[] | undefined;
  status: AnalysisStatus;
};

export interface AnalysesState {
  analyses: {
    [key: string]: AnalysisSummary;
  };
}

export const analysesAdapter = createEntityAdapter<AnalysisSummary>();

const analysesSlice = createSlice({
  initialState: {
    analyses: analysesAdapter.getInitialState(),
  },
  name: "analyses",
  reducers: {
    newAnalysis(state, action: PayloadAction<{ id: string }>) {
      analysesAdapter.addOne(state.analyses, {
        error: undefined,
        id: action.payload.id,
        points: undefined,
        results: undefined,
        status: AnalysisStatus.Created,
      });
    },
    analysisPointsRequested(state, action: PayloadAction<{ id: string }>) {
      analysesAdapter.updateOne(state.analyses, {
        id: action.payload.id,
        changes: { status: AnalysisStatus.LoadingPoints },
      });
    },
    analysisPointsReceived(
      state,
      action: PayloadAction<{ id: string; points: PointDescription[] }>
    ) {
      analysesAdapter.updateOne(state.analyses, {
        id: action.payload.id,
        changes: {
          points: action.payload.points,
          status: AnalysisStatus.PointsRetrieved,
        },
      });
    },
    analysisRequested(state, action: PayloadAction<{ id: string }>) {
      analysesAdapter.updateOne(state.analyses, {
        id: action.payload.id,
        changes: { status: AnalysisStatus.LoadingResults },
      });
    },
    analysisResults(state, action: PayloadAction<{ id: string; results: analysisResult[] }>) {
      analysesAdapter.updateOne(state.analyses, {
        id: action.payload.id,
        changes: { status: AnalysisStatus.Completed, results: action.payload.results },
      });
    },
    analysisErrored(state, action: PayloadAction<{ id: string; error: analysisError }>) {
      const currentStatus = analysesAdapter
        .getSelectors()
        .selectById(state.analyses, action.payload.id)?.status;
      if (
        currentStatus !== AnalysisStatus.LoadingPoints &&
        currentStatus !== AnalysisStatus.LoadingResults
      ) {
        throw "Invalid state update";
      }
      analysesAdapter.updateOne(state.analyses, {
        id: action.payload.id,
        changes: {
          status:
            currentStatus === AnalysisStatus.LoadingPoints
              ? AnalysisStatus.ErroredGettingPoints
              : AnalysisStatus.ErroredRunning,
          error: action.payload.error,
        },
      });
    },
  },
});
