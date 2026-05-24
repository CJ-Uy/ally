import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import coverage from "../data/evaluationCoverage.json";

export const EVALUATION_COVERAGE_DURATION_SECONDS = 70;

interface CoverageCategory {
  name: string;
  shortName: string;
  count: number;
  accent: string;
  testedBehavior: string;
  features: string[];
}

interface PromptFlow {
  label: string;
  prompt: string;
  route: string;
  validatedFeature: string;
}

const categories = coverage.categories as CoverageCategory[];
const promptFlows = coverage.promptFlows as PromptFlow[];

const palette = {
  bg: "#eef2f7",
  panel: "#f9fbfd",
  ink: "#1e2a3d",
  soft: "#6b7a93",
  line: "#dde5ee",
  sky: "#caddec",
  sage: "#b8d0c4",
  butter: "#f0e0b5",
  blush: "#f4c9c2",
  fox: "#f5a66b",
  accent: "#4a6fa5",
};

const paperSvg =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.1 0 0 0 0 0.12 0 0 0 0 0.18 0 0 0 0.04 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function fade(frame: number, start: number, end: number) {
  return interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
}

function leave(frame: number, start: number, end: number) {
  return interpolate(frame, [start, end], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
}

function stageOpacity(frame: number, enter: number, entered: number, leaveStart: number, leaveEnd: number) {
  return fade(frame, enter, entered) * leave(frame, leaveStart, leaveEnd);
}

function cardSpring(frame: number, start: number, fps: number) {
  return spring({
    frame: frame - start,
    fps,
    config: { damping: 17, stiffness: 95, mass: 0.8 },
  });
}

function SceneStyles() {
  return (
    <style>
      {`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Onest:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');`}
    </style>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  const size = compact ? 54 : 74;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 12 : 16 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: compact ? 16 : 22,
          background: palette.panel,
          backgroundImage: paperSvg,
          backgroundBlendMode: "multiply",
          border: `1px solid ${palette.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 16px 34px rgba(30,42,61,0.12)",
        }}
      >
        <Img
          src={staticFile("ally.png")}
          alt="Academic Ally"
          style={{
            width: size - 12,
            height: size - 12,
            objectFit: "contain",
            filter: "drop-shadow(0 6px 12px rgba(30, 42, 61, 0.22))",
          }}
        />
      </div>
      <div>
        <div
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            color: palette.ink,
            fontWeight: 800,
            fontSize: compact ? 29 : 38,
            lineHeight: 1,
          }}
        >
          Ally
        </div>
        <div
          style={{
            marginTop: 5,
            fontFamily: "'DM Mono', monospace",
            color: palette.soft,
            fontSize: compact ? 12 : 14,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          Evaluation coverage
        </div>
      </div>
    </div>
  );
}

function Sticker({
  children,
  color = palette.sky,
  ink = palette.ink,
}: {
  children: React.ReactNode;
  color?: string;
  ink?: string;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "8px 13px",
        borderRadius: 999,
        background: color,
        color: ink,
        border: "1px solid rgba(30,42,61,0.08)",
        boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.05)",
        fontFamily: "'DM Mono', monospace",
        fontSize: 16,
        fontWeight: 500,
        lineHeight: 1,
        textTransform: "uppercase",
        letterSpacing: 0.7,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <AbsoluteFill
      style={{
        background: palette.bg,
        backgroundImage: `${paperSvg}, radial-gradient(circle at 16% 16%, rgba(202,221,236,0.68), transparent 34%), linear-gradient(140deg, rgba(249,251,253,0.62), rgba(238,242,247,0))`,
        backgroundBlendMode: "multiply, normal, normal",
        color: palette.ink,
        fontFamily: "'Onest', sans-serif",
        overflow: "hidden",
      }}
    >
      <SceneStyles />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(74,111,165,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(74,111,165,0.08) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          opacity: 0.45,
        }}
      />
      {children}
    </AbsoluteFill>
  );
}

function IntroStage({ frame, fps }: { frame: number; fps: number }) {
  const opacity = stageOpacity(frame, 0, 35, 235, 300);
  const titleScale = 0.96 + cardSpring(frame, 12, fps) * 0.04;
  const chipOpacity = fade(frame, 76, 140);

  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{ position: "absolute", left: 104, top: 78 }}>
        <BrandMark />
      </div>
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 260,
          width: 1140,
          transform: `scale(${titleScale})`,
          transformOrigin: "left center",
        }}
      >
        <Sticker color={palette.sage}>{coverage.summary.totalTestCases} test cases</Sticker>
        <h1
          style={{
            margin: "28px 0 0",
            maxWidth: 1080,
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 86,
            lineHeight: 1.02,
            fontWeight: 800,
            color: palette.ink,
          }}
        >
          What does the evaluation cover?
        </h1>
        <p
          style={{
            margin: "24px 0 0",
            maxWidth: 900,
            fontSize: 27,
            lineHeight: 1.38,
            color: palette.soft,
          }}
        >
          The Remotion insert explains the test coverage. Copilot Studio shows the detailed stats and pass/fail evidence.
        </p>
      </div>
      <div
        style={{
          position: "absolute",
          right: 114,
          top: 196,
          width: 410,
          padding: 24,
          borderRadius: 28,
          background: palette.panel,
          backgroundImage: paperSvg,
          backgroundBlendMode: "multiply",
          border: `1px solid ${palette.line}`,
          boxShadow: "0 24px 70px rgba(30,42,61,0.14)",
          opacity: chipOpacity,
          transform: `translateY(${interpolate(chipOpacity, [0, 1], [18, 0])}px) rotate(1deg)`,
        }}
      >
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            color: palette.soft,
            fontSize: 17,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          Coverage groups
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          {categories.map((category, index) => (
            <Sticker key={category.name} color={index % 2 === 0 ? palette.sky : palette.butter}>
              {category.shortName}
            </Sticker>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function CategoryCard({
  category,
  index,
  frame,
  fps,
}: {
  category: CoverageCategory;
  index: number;
  frame: number;
  fps: number;
}) {
  const start = 270 + index * 20;
  const appear = cardSpring(frame, start, fps);
  return (
    <div
      style={{
        position: "absolute",
        left: 98,
        top: 218 + index * 136,
        width: 560,
        minHeight: 108,
        padding: "20px 22px",
        borderRadius: 18,
        background: palette.panel,
        backgroundImage: paperSvg,
        backgroundBlendMode: "multiply",
        border: `2px solid ${category.accent}`,
        boxShadow: `0 16px 36px ${category.accent}25`,
        opacity: interpolate(appear, [0, 0.18, 1], [0, 1, 1]),
        transform: `translateX(${interpolate(appear, [0, 1], [-34, 0])}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
        <div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              color: palette.soft,
              fontSize: 15,
              textTransform: "uppercase",
              letterSpacing: 0.7,
            }}
          >
            {String(index + 1).padStart(2, "0")} / {category.count} tests
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 30,
              lineHeight: 1.04,
              fontWeight: 800,
              color: palette.ink,
            }}
          >
            {category.name}
          </div>
        </div>
        <div
          style={{
            flex: "0 0 auto",
            width: 18,
            height: 18,
            borderRadius: 999,
            background: category.accent,
            boxShadow: `0 0 0 8px ${category.accent}25`,
            marginTop: 10,
          }}
        />
      </div>
    </div>
  );
}

function FeatureCluster({
  category,
  index,
  frame,
  fps,
}: {
  category: CoverageCategory;
  index: number;
  frame: number;
  fps: number;
}) {
  const start = 385 + index * 24;
  const appear = cardSpring(frame, start, fps);
  return (
    <div
      style={{
        position: "absolute",
        left: 1232,
        top: 210 + index * 138,
        width: 560,
        minHeight: 108,
        padding: "18px 20px",
        borderRadius: 18,
        background: "rgba(249,251,253,0.9)",
        backgroundImage: paperSvg,
        backgroundBlendMode: "multiply",
        border: `1px solid ${palette.line}`,
        boxShadow: "0 14px 32px rgba(30,42,61,0.1)",
        opacity: interpolate(appear, [0, 0.18, 1], [0, 1, 1]),
        transform: `translateX(${interpolate(appear, [0, 1], [34, 0])}px)`,
      }}
    >
      <div
        style={{
          color: category.accent,
          fontFamily: "'DM Mono', monospace",
          fontSize: 15,
          textTransform: "uppercase",
          letterSpacing: 0.7,
          marginBottom: 10,
        }}
      >
        App features validated
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {category.features.map((feature) => (
          <div
            key={feature}
            style={{
              padding: "8px 10px",
              borderRadius: 999,
              background: `${category.accent}20`,
              color: palette.ink,
              border: `1px solid ${category.accent}45`,
              fontSize: 19,
              fontWeight: 700,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            {feature}
          </div>
        ))}
      </div>
    </div>
  );
}

function CoverageConnectors({ frame }: { frame: number }) {
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      {categories.map((category, index) => {
        const progress = fade(frame, 430 + index * 24, 490 + index * 24);
        const x1 = 658;
        const y1 = 272 + index * 136;
        const x2 = 1232;
        const y2 = 264 + index * 138;
        const mid = x1 + (x2 - x1) * clamp(progress, 0, 1);
        return (
          <g key={category.name} opacity={fade(frame, 388, 430)}>
            <path
              d={`M ${x1} ${y1} C ${830} ${y1}, ${990} ${y2}, ${mid} ${y2}`}
              fill="none"
              stroke={category.accent}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray="10 13"
            />
          </g>
        );
      })}
    </svg>
  );
}

function CoverageMapStage({ frame, fps }: { frame: number; fps: number }) {
  const opacity = stageOpacity(frame, 210, 285, 960, 1050);
  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{ position: "absolute", left: 96, top: 72 }}>
        <BrandMark compact />
      </div>
      <div style={{ position: "absolute", left: 560, top: 62, width: 800, textAlign: "center" }}>
        <Sticker color={palette.butter}>Coverage to app behavior</Sticker>
        <h2
          style={{
            margin: "18px 0 0",
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 46,
            fontWeight: 800,
            lineHeight: 1.04,
          }}
        >
          Each test group maps to a product responsibility.
        </h2>
      </div>
      <CoverageConnectors frame={frame} />
      {categories.map((category, index) => (
        <CategoryCard key={category.name} category={category} index={index} frame={frame} fps={fps} />
      ))}
      {categories.map((category, index) => (
        <FeatureCluster key={category.name} category={category} index={index} frame={frame} fps={fps} />
      ))}
    </AbsoluteFill>
  );
}

function PromptFlowCard({
  flow,
  index,
  frame,
  fps,
}: {
  flow: PromptFlow;
  index: number;
  frame: number;
  fps: number;
}) {
  const start = 990 + index * 125;
  const appear = cardSpring(frame, start, fps);
  const colors = [palette.sky, palette.sage, palette.blush];

  return (
    <div
      style={{
        width: 500,
        minHeight: 430,
        borderRadius: 24,
        padding: 26,
        background: palette.panel,
        backgroundImage: paperSvg,
        backgroundBlendMode: "multiply",
        border: `2px solid ${colors[index]}`,
        boxShadow: `0 26px 60px ${colors[index]}55`,
        opacity: interpolate(appear, [0, 0.16, 1], [0, 1, 1]),
        transform: `translateY(${interpolate(appear, [0, 1], [36, 0])}px) scale(${0.96 + appear * 0.04})`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <Sticker color={colors[index]}>{flow.label}</Sticker>
        <Sticker color={palette.panel}>Covered</Sticker>
      </div>
      <div
        style={{
          marginTop: 28,
          minHeight: 108,
          padding: 18,
          borderRadius: 16,
          background: "#fff",
          border: `1px solid ${palette.line}`,
          color: palette.ink,
          fontSize: 24,
          lineHeight: 1.26,
          fontWeight: 700,
        }}
      >
        "{flow.prompt}"
      </div>
      <div
        style={{
          margin: "24px auto",
          width: 52,
          height: 52,
          borderRadius: 999,
          background: palette.accent,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          fontWeight: 800,
        }}
      >
        {"->"}
      </div>
      <div
        style={{
          padding: 18,
          borderRadius: 16,
          background: colors[index],
          color: palette.ink,
          fontSize: 25,
          lineHeight: 1.16,
          fontWeight: 800,
        }}
      >
        {flow.route}
      </div>
      <div style={{ marginTop: 18, color: palette.soft, fontSize: 20, lineHeight: 1.3, fontWeight: 650 }}>
        Validates: <span style={{ color: palette.ink }}>{flow.validatedFeature}</span>
      </div>
    </div>
  );
}

function PromptFlowStage({ frame, fps }: { frame: number; fps: number }) {
  const opacity = stageOpacity(frame, 900, 980, 1388, 1470);
  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{ position: "absolute", left: 128, top: 82, width: 1000 }}>
        <Sticker color={palette.sky}>Representative prompts</Sticker>
        <h2
          style={{
            margin: "18px 0 0",
            maxWidth: 980,
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 62,
            lineHeight: 1.03,
            fontWeight: 800,
          }}
        >
          The tests follow the same path the product demo will show.
        </h2>
      </div>
      <div
        style={{
          position: "absolute",
          left: 154,
          top: 338,
          right: 154,
          display: "flex",
          justifyContent: "space-between",
          gap: 28,
        }}
      >
        {promptFlows.map((flow, index) => (
          <PromptFlowCard key={flow.label} flow={flow} index={index} frame={frame} fps={fps} />
        ))}
      </div>
    </AbsoluteFill>
  );
}

function FeatureChecklistStage({ frame, fps }: { frame: number; fps: number }) {
  const opacity = stageOpacity(frame, 1380, 1450, 1745, 1830);
  const features = coverage.featureChecklist;
  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{ position: "absolute", left: 128, top: 108, width: 850 }}>
        <Sticker color={palette.sage}>Coverage summary</Sticker>
        <h2
          style={{
            margin: "20px 0 0",
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 72,
            lineHeight: 1.02,
            fontWeight: 800,
          }}
        >
          The evaluation spans the core student journey.
        </h2>
        <p style={{ margin: "24px 0 0", maxWidth: 740, color: palette.soft, fontSize: 26, lineHeight: 1.36 }}>
          From setup through focus mode, the coverage checks both normal flows and the guardrails around durable app actions.
        </p>
      </div>
      <div
        style={{
          position: "absolute",
          left: 1040,
          top: 118,
          width: 520,
          height: 520,
          borderRadius: 42,
          background: palette.panel,
          backgroundImage: paperSvg,
          backgroundBlendMode: "multiply",
          border: `1px solid ${palette.line}`,
          boxShadow: "0 26px 70px rgba(30,42,61,0.14)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `rotate(${interpolate(Math.sin(frame / 38), [-1, 1], [-1.5, 1.5])}deg)`,
        }}
      >
        <Img
          src={staticFile("ally.png")}
          alt="Academic Ally"
          style={{
            width: 390,
            height: 390,
            objectFit: "contain",
            filter: "drop-shadow(0 18px 32px rgba(30,42,61,0.24))",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 128,
          bottom: 112,
          right: 128,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
      >
        {features.map((feature, index) => {
          const appear = cardSpring(frame, 1490 + index * 18, fps);
          return (
            <div
              key={feature}
              style={{
                height: 96,
                borderRadius: 18,
                background: "#fff",
                border: `1px solid ${palette.line}`,
                boxShadow: "0 14px 30px rgba(30,42,61,0.08)",
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "0 22px",
                opacity: interpolate(appear, [0, 0.18, 1], [0, 1, 1]),
                transform: `translateY(${interpolate(appear, [0, 1], [22, 0])}px)`,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  background: palette.sage,
                  color: palette.ink,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                ✓
              </div>
              <div style={{ fontSize: 26, color: palette.ink, fontWeight: 800 }}>{feature}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function HandoffStage({ frame, fps }: { frame: number; fps: number }) {
  const opacity = fade(frame, 1770, 1845);
  const scale = 0.94 + cardSpring(frame, 1800, fps) * 0.06;
  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          position: "absolute",
          left: 370,
          top: 218,
          width: 1180,
          minHeight: 620,
          borderRadius: 38,
          padding: 58,
          background: palette.panel,
          backgroundImage: paperSvg,
          backgroundBlendMode: "multiply",
          border: `1px solid ${palette.line}`,
          boxShadow: "0 34px 90px rgba(30,42,61,0.16)",
          textAlign: "center",
          transform: `scale(${scale})`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center" }}>
          <BrandMark compact />
        </div>
        <div style={{ marginTop: 42 }}>
          <Sticker color={palette.butter}>{coverage.summary.sourceLabel}</Sticker>
        </div>
        <h2
          style={{
            margin: "28px auto 0",
            maxWidth: 900,
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 78,
            lineHeight: 1.02,
            fontWeight: 800,
            color: palette.ink,
          }}
        >
          {coverage.handoff.title}
        </h2>
        <p
          style={{
            margin: "24px auto 0",
            maxWidth: 820,
            fontSize: 31,
            lineHeight: 1.28,
            color: palette.soft,
            fontWeight: 650,
          }}
        >
          {coverage.handoff.subtitle}
        </p>
        <div
          style={{
            margin: "44px auto 0",
            width: 650,
            height: 86,
            borderRadius: 18,
            background: palette.ink,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            fontFamily: "'DM Mono', monospace",
            fontSize: 21,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          <span style={{ width: 14, height: 14, borderRadius: 99, background: palette.sage }} />
          Copilot Studio shows the evidence table
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function EvaluationCoverageClip() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <PageFrame>
      <IntroStage frame={frame} fps={fps} />
      <CoverageMapStage frame={frame} fps={fps} />
      <PromptFlowStage frame={frame} fps={fps} />
      <FeatureChecklistStage frame={frame} fps={fps} />
      <HandoffStage frame={frame} fps={fps} />
    </PageFrame>
  );
}
