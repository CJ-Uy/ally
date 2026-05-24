import { Composition, Sequence } from "remotion";
import { AgentArchitectureClip } from "./components/AgentArchitectureClip";
import { AppCaptureClip, type AppClip } from "./components/AppCaptureClip";
import {
  EVALUATION_COVERAGE_DURATION_SECONDS,
  EvaluationCoverageClip,
} from "./components/EvaluationCoverageClip";
import clips from "./data/appClips.json";

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;
const AGENT_ARCHITECTURE_DURATION = 60 * FPS;
const appClips = clips as AppClip[];

function FullDemo() {
  let from = 0;
  return (
    <>
      {appClips.map((clip) => {
        const duration = clip.durationSeconds * FPS;
        const seq = (
          <Sequence key={clip.id} from={from} durationInFrames={duration}>
            <AppCaptureClip clip={clip} fps={FPS} />
          </Sequence>
        );
        from += duration;
        return seq;
      })}
    </>
  );
}

export function RemotionRoot() {
  const fullDuration = appClips.reduce((sum, clip) => sum + clip.durationSeconds * FPS, 0);
  return (
    <>
      <Composition
        id="AcademicAllyAgentArchitecture"
        component={AgentArchitectureClip}
        durationInFrames={AGENT_ARCHITECTURE_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="AcademicAllyFullDemo"
        component={FullDemo}
        durationInFrames={fullDuration}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="AcademicAllyEvaluationCoverage"
        component={EvaluationCoverageClip}
        durationInFrames={EVALUATION_COVERAGE_DURATION_SECONDS * FPS}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      {appClips.map((clip) => (
        <Composition
          key={clip.id}
          id={clip.id}
          component={() => <AppCaptureClip clip={clip} fps={FPS} />}
          durationInFrames={clip.durationSeconds * FPS}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      ))}
    </>
  );
}
