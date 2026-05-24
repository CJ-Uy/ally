import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Fragment } from "react";

export interface AppClip {
  id: string;
  title: string;
  durationSeconds: number;
  captures: string[];
  motion: MotionPlan;
}

interface MotionPlan {
  camera: CameraKeyframe[];
  cursor: CursorKeyframe[];
  clicks?: ActionPoint[];
  highlights?: HighlightBox[];
  captureStarts?: number[];
}

interface TimelinePoint {
  at: number;
}

interface CameraKeyframe extends TimelinePoint {
  x: number;
  y: number;
  scale: number;
}

interface CursorKeyframe extends TimelinePoint {
  x: number;
  y: number;
}

interface ActionPoint extends TimelinePoint {
  x: number;
  y: number;
  label?: string;
}

interface HighlightBox extends TimelinePoint {
  duration: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const CLICK_DURATION_FRAMES = 22;
const SCREEN_FADE_FRAMES = 16;
const ACTION_LABEL_DURATION_FRAMES = 42;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function findSegment<T extends TimelinePoint>(points: T[], progress: number) {
  if (progress <= points[0].at) {
    return { from: points[0], to: points[0], local: 0 };
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    if (progress <= to.at) {
      const span = Math.max(to.at - from.at, 0.0001);
      return {
        from,
        to,
        local: clamp((progress - from.at) / span, 0, 1),
      };
    }
  }

  const last = points[points.length - 1];
  return { from: last, to: last, local: 1 };
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

function projectPoint(point: { x: number; y: number }, camera: CameraKeyframe, width: number, height: number) {
  const originX = camera.x * width;
  const originY = camera.y * height;

  return {
    x: originX + (point.x * width - originX) * camera.scale,
    y: originY + (point.y * height - originY) * camera.scale,
  };
}

function projectBox(box: HighlightBox, camera: CameraKeyframe, width: number, height: number) {
  const topLeft = projectPoint({ x: box.x, y: box.y }, camera, width, height);
  const bottomRight = projectPoint({ x: box.x + box.w, y: box.y + box.h }, camera, width, height);

  return {
    x: topLeft.x,
    y: topLeft.y,
    w: bottomRight.x - topLeft.x,
    h: bottomRight.y - topLeft.y,
  };
}

function sampleCamera(points: CameraKeyframe[], progress: number): CameraKeyframe {
  const { from, to, local } = findSegment(points, progress);
  const eased = Easing.bezier(0.22, 1, 0.36, 1)(local);

  return {
    at: progress,
    x: mix(from.x, to.x, eased),
    y: mix(from.y, to.y, eased),
    scale: mix(from.scale, to.scale, eased),
  };
}

function sampleCursor(points: CursorKeyframe[], progress: number): CursorKeyframe {
  const { from, to, local } = findSegment(points, progress);
  const eased = Easing.bezier(0.16, 1, 0.3, 1)(local);

  return {
    at: progress,
    x: mix(from.x, to.x, eased),
    y: mix(from.y, to.y, eased),
  };
}

function MotionCursor({ x, y, opacity }: { x: number; y: number; opacity: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 34,
        height: 34,
        opacity,
        filter: "drop-shadow(0 4px 8px rgba(15, 23, 42, 0.3))",
        transform: "translate(2px, 2px)",
      }}
    >
      <path
        d="M5 3L25 17L16 19L12 28L5 3Z"
        fill="#ffffff"
        stroke="#172033"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClickPulse({
  click,
  frame,
  totalFrames,
  x,
  y,
}: {
  click: ActionPoint;
  frame: number;
  totalFrames: number;
  x: number;
  y: number;
}) {
  const clickFrame = click.at * totalFrames;
  const age = frame - clickFrame;

  if (age < 0 || age > CLICK_DURATION_FRAMES) {
    return null;
  }

  const progress = age / CLICK_DURATION_FRAMES;
  const size = interpolate(progress, [0, 1], [16, 86], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(progress, [0, 0.25, 1], [0.7, 0.45, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        border: "3px solid rgba(65, 105, 170, 0.75)",
        borderRadius: "50%",
        opacity,
        transform: "translate(-50%, -50%)",
        boxShadow: "0 0 0 10px rgba(65, 105, 170, 0.08)",
      }}
    />
  );
}

function ActionLabel({
  click,
  frame,
  totalFrames,
  x,
  y,
}: {
  click: ActionPoint;
  frame: number;
  totalFrames: number;
  x: number;
  y: number;
}) {
  if (!click.label) {
    return null;
  }

  const start = click.at * totalFrames - 8;
  const duration = ACTION_LABEL_DURATION_FRAMES;
  const age = frame - start;

  if (age < 0 || age > duration) {
    return null;
  }

  const opacity = interpolate(age, [0, 8, duration - 10, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(age, [0, 10], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity,
        transform: `translate(-50%, calc(-100% - 22px)) translateY(${translateY}px)`,
        padding: "9px 12px",
        borderRadius: 999,
        background: "rgba(23, 32, 51, 0.92)",
        color: "#fff",
        fontSize: 15,
        fontWeight: 800,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.22)",
      }}
    >
      {click.label}
    </div>
  );
}

function Highlight({
  box,
  frame,
  totalFrames,
  rect,
}: {
  box: HighlightBox;
  frame: number;
  totalFrames: number;
  rect: { x: number; y: number; w: number; h: number };
}) {
  const start = box.at * totalFrames;
  const duration = box.duration * totalFrames;
  const age = frame - start;

  if (age < 0 || age > duration) {
    return null;
  }

  const opacity = interpolate(age, [0, 10, Math.max(duration - 10, 11), duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(age, [0, 12], [0.985, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        border: "2px solid rgba(255, 145, 77, 0.9)",
        borderRadius: 12,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "center",
        boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.08), 0 10px 30px rgba(255, 145, 77, 0.18)",
        pointerEvents: "none",
      }}
    />
  );
}

function getActiveCapture(captureStarts: number[], progress: number) {
  for (let index = captureStarts.length - 1; index >= 0; index -= 1) {
    if (progress >= captureStarts[index]) {
      return index;
    }
  }

  return 0;
}

export function AppCaptureClip({ clip, fps }: { clip: AppClip; fps: number }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const totalFrames = clip.durationSeconds * fps;
  const progress = totalFrames <= 1 ? 0 : clamp(frame / (totalFrames - 1), 0, 1);
  const captureStarts =
    clip.motion.captureStarts && clip.motion.captureStarts.length === clip.captures.length
      ? clip.motion.captureStarts
      : clip.captures.map((_, index) => index / clip.captures.length);
  const activeCapture = clamp(getActiveCapture(captureStarts, progress), 0, clip.captures.length - 1);
  const nextCaptureStart = captureStarts[activeCapture + 1] ?? 1;
  const fadeProgress = SCREEN_FADE_FRAMES / totalFrames;
  const nextCaptureOpacity =
    activeCapture < clip.captures.length - 1
      ? clamp((progress - (nextCaptureStart - fadeProgress)) / fadeProgress, 0, 1)
      : 0;
  const camera = sampleCamera(clip.motion.camera, progress);
  const cursor = sampleCursor(clip.motion.cursor, progress);
  const projectedCursor = projectPoint(cursor, camera, width, height);
  const cursorOpacity = interpolate(progress, [0, 0.06, 0.94, 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const introOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#eef2f7", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          opacity: introOpacity,
          transform: `scale(${camera.scale})`,
          transformOrigin: `${camera.x * 100}% ${camera.y * 100}%`,
        }}
      >
        <Img
          src={staticFile(`captures/app-screens/${clip.captures[activeCapture]}`)}
          alt={clip.title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        {activeCapture < clip.captures.length - 1 ? (
          <Img
            src={staticFile(`captures/app-screens/${clip.captures[activeCapture + 1]}`)}
            alt={clip.title}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: nextCaptureOpacity,
            }}
          />
        ) : null}
      </AbsoluteFill>

      {clip.motion.highlights?.map((box, index) => (
        <Highlight
          key={`${clip.id}-highlight-${index}`}
          box={box}
          frame={frame}
          totalFrames={totalFrames}
          rect={projectBox(box, camera, width, height)}
        />
      ))}

      {clip.motion.clicks?.map((click, index) => {
        const point = projectPoint(click, camera, width, height);
        return (
          <Fragment key={`${clip.id}-click-${index}`}>
            <ClickPulse
              click={click}
              frame={frame}
              totalFrames={totalFrames}
              x={point.x}
              y={point.y}
            />
            <ActionLabel
              click={click}
              frame={frame}
              totalFrames={totalFrames}
              x={point.x}
              y={point.y}
            />
          </Fragment>
        );
      })}

      <MotionCursor x={projectedCursor.x} y={projectedCursor.y} opacity={cursorOpacity} />
    </AbsoluteFill>
  );
}
