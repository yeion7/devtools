import classnames from "classnames";
import { connect } from "devtools/client/debugger/src/utils/connect";
import find from "lodash/find";
import findLast from "lodash/findLast";
import { compareNumericStrings } from "protocol/utils";
import React, { useEffect } from "react";
import { actions } from "ui/actions";
import PrefixBadgeButton from "ui/components/PrefixBadge";
import Icon from "ui/components/shared/Icon";
import { selectors } from "ui/reducers";

import BreakpointTimeline from "./BreakpointTimeline";
import { PanelStatus } from "./PanelStatus";

const { trackEvent } = require("ui/utils/telemetry");

function BreakpointNavigation({
  analysisPoints,
  breakpoint,
  editing,
  executionPoint,
  seek,
  setShowCondition,
  setZoomedBreakpoint = () => {},
  showCondition,
}) {
  const navigateToPoint = point => {
    trackEvent("breakpoint.navigate");
    if (point) {
      seek(point.point, point.time, true);
    }
  };
  const isEmpty = analysisPoints && (analysisPoints.error || analysisPoints.data.length == 0);

  let next, prev;

  if (executionPoint && !analysisPoints?.error && analysisPoints?.data.length > 0) {
    prev = findLast(analysisPoints.data, p => compareNumericStrings(p.point, executionPoint) < 0);
    next = find(analysisPoints.data, p => compareNumericStrings(p.point, executionPoint) > 0);
  }

  useEffect(() => {
    if (analysisPoints) {
      trackEvent(analysisPoints.data.length > 0 ? "breakpoint.has_hits" : "breakpoint.no_hits", {
        hits: analysisPoints.data.length,
      });
    }
  }, [analysisPoints]);

  if (editing) {
    return (
      <div className="breakpoint-navigation justify-end space-x-1 p-1.5 py-2">
        <PrefixBadgeButton breakpoint={breakpoint} showEmpty={true} />
        <button className="" onClick={() => setShowCondition(!showCondition)}>
          <Icon
            filename="filter"
            className={classnames(showCondition ? "bg-primaryAccent" : "bg-gray-400")}
          />
        </button>
      </div>
    );
  }

  return (
    <div className={classnames("breakpoint-navigation justify-between p-1.5", { empty: isEmpty })}>
      {!isEmpty && !analysisPoints?.error ? (
        <BreakpointNavigationCommands prev={prev} next={next} navigateToPoint={navigateToPoint} />
      ) : null}
      {analysisPoints && !analysisPoints.error ? (
        <BreakpointTimeline breakpoint={breakpoint} setZoomedBreakpoint={setZoomedBreakpoint} />
      ) : (
        <div className="flex-grow" />
      )}
      <div className="text-center">
        <PanelStatus prefixBadge={breakpoint.options.prefixBadge} analysisPoints={analysisPoints} />
      </div>
    </div>
  );
}

function BreakpointNavigationCommands({ prev, next, navigateToPoint }) {
  const prevDisabled = !prev;
  const nextDisabled = !next;
  return (
    <div className="breakpoint-navigation-commands">
      <button
        className={`breakpoint-navigation-command-prev ${prevDisabled ? " disabled" : ""}`}
        title={prev ? "Jump Back (to previous hit)" : "No previous hit to jump to"}
        disabled={prevDisabled}
        onClick={() => navigateToPoint(prev)}
      >
        <div className="img rewind-rounded" />
      </button>
      <button
        className={`breakpoint-navigation-command-next ${nextDisabled || !next ? " disabled" : ""}`}
        title={next ? "Jump Forward (to next hit)" : "No next hit to jump to"}
        disabled={nextDisabled}
        onClick={() => navigateToPoint(next)}
      >
        <div className="img rewind-rounded" style={{ transform: "rotate(180deg)" }} />
      </button>
    </div>
  );
}

const mapStateToProps = (state, { breakpoint }) => ({
  analysisPoints: selectors.getAnalysisPointsForLocation(
    state,
    breakpoint.location,
    breakpoint.options.condition
  ),
  executionPoint: selectors.getExecutionPoint(state),
});

export default connect(mapStateToProps, {
  seek: actions.seek,
})(BreakpointNavigation);
