import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
} from "remotion";
import architecture from "../data/agentArchitecture.json";

interface Agent {
  name: string;
  shortName: string;
  accent: string;
  responsibilities: string[];
  exampleInput: string;
  exampleOutput: string;
}

const agents = architecture.agents as Agent[];

const agentCardPositions = [
  { x: 1220, y: 150 },
  { x: 1220, y: 318 },
  { x: 1220, y: 486 },
  { x: 1220, y: 654 },
  { x: 1220, y: 822 },
];

const agentConnectorTargets = [
  { x: 1220, y: 224 },
  { x: 1220, y: 392 },
  { x: 1220, y: 560 },
  { x: 1220, y: 728 },
  { x: 1220, y: 896 },
];

const palette = {
  ink: "#172033",
  muted: "#63708a",
  line: "#c8d3e1",
  panel: "rgba(255, 255, 255, 0.82)",
  blue: "#4F78B8",
  orange: "#EF8F5A",
  green: "#6FB399",
  purple: "#9674C7",
  red: "#D66F80",
  cream: "#FFF8F1",
};

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

function typeReveal(text: string, frame: number, start: number, charsPerFrame = 1.2) {
  const count = clamp(Math.floor((frame - start) * charsPerFrame), 0, text.length);
  return text.slice(0, count);
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        fontSize: 18,
        letterSpacing: 2.8,
        textTransform: "uppercase",
        color: palette.muted,
        fontWeight: 700,
      }}
    >
      {children}
    </div>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  const size = compact ? 46 : 62;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 10 : 14 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: compact ? 14 : 18,
          background: "#fff",
          border: "1px solid #dbe4ef",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
        }}
      >
        <Img
          src={staticFile("ally.png")}
          alt="Academic Ally"
          style={{ width: size - 12, height: size - 12, objectFit: "contain" }}
        />
      </div>
      <div>
        <div
          style={{
            color: palette.ink,
            fontWeight: 900,
            fontSize: compact ? 25 : 31,
            lineHeight: 1,
          }}
        >
          Ally
        </div>
        <div
          style={{
            color: palette.muted,
            fontWeight: 800,
            fontSize: compact ? 11 : 13,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            marginTop: 4,
          }}
        >
          Academic planner
        </div>
      </div>
    </div>
  );
}

function Pill({
  children,
  accent = palette.blue,
  dimmed = false,
}: {
  children: string;
  accent?: string;
  dimmed?: boolean;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 14px",
        borderRadius: 999,
        background: dimmed ? "rgba(255,255,255,0.62)" : "#fff",
        border: `1px solid ${accent}55`,
        color: dimmed ? palette.muted : palette.ink,
        fontSize: 20,
        fontWeight: 700,
        boxShadow: dimmed ? "none" : "0 8px 22px rgba(15,23,42,0.08)",
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: accent,
          boxShadow: `0 0 0 5px ${accent}22`,
        }}
      />
      {children}
    </div>
  );
}

function DataPacket({
  label,
  x,
  y,
  progress,
  color,
}: {
  label: string;
  x: number;
  y: number;
  progress: number;
  color: string;
}) {
  const opacity = interpolate(progress, [0, 0.15, 0.86, 1], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(progress, [0, 1], [16, -10], {
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
        transform: `translate(-50%, ${translateY}px)`,
        opacity,
        padding: "10px 14px",
        borderRadius: 12,
        background: "#fff",
        border: `1px solid ${color}70`,
        color: palette.ink,
        fontSize: 17,
        fontWeight: 700,
        boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}

function Connector({
  x1,
  y1,
  x2,
  y2,
  progress,
  color = palette.line,
  width = 3,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number;
  color?: string;
  width?: number;
}) {
  const endX = x1 + (x2 - x1) * progress;
  const endY = y1 + (y2 - y1) * progress;

  return (
    <line
      x1={x1}
      y1={y1}
      x2={endX}
      y2={endY}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
}

function StudentNode({ frame }: { frame: number }) {
  const appear = spring({ frame: frame - 20, fps: 30, config: { damping: 15, stiffness: 90 } });
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        top: 270,
        width: 330,
        padding: 24,
        borderRadius: 20,
        background: "#fff",
        border: "1px solid #dbe4ef",
        boxShadow: "0 22px 50px rgba(15,23,42,0.12)",
        transform: `scale(${appear})`,
        transformOrigin: "center",
      }}
    >
      <SectionLabel>Student</SectionLabel>
      <div style={{ fontSize: 37, fontWeight: 850, color: palette.ink, marginTop: 10 }}>
        Syllabi, goals, progress
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 22 }}>
        <Pill accent={palette.blue}>15 study hrs/week</Pill>
        <Pill accent={palette.orange}>3 syllabus PDFs</Pill>
        <Pill accent={palette.green}>Familiarity answers</Pill>
      </div>
    </div>
  );
}

function OrchestratorNode({ frame }: { frame: number }) {
  const appear = spring({ frame: frame - 80, fps: 30, config: { damping: 16, stiffness: 80 } });
  const pulse = 1 + Math.sin(frame / 14) * 0.012;
  return (
    <div
      style={{
        position: "absolute",
        left: 520,
        top: 268,
        width: 560,
        height: 330,
        boxSizing: "border-box",
        borderRadius: 34,
        background: "linear-gradient(145deg, #ffffff, #eef5ff)",
        border: "2px solid #bed0e8",
        boxShadow: "0 28px 70px rgba(50,80,130,0.2)",
        padding: "28px 32px",
        transform: `scale(${appear * pulse})`,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18 }}>
        <SectionLabel>Parent Agent</SectionLabel>
        <BrandMark compact />
      </div>
      <div style={{ fontSize: 37, lineHeight: 1.02, fontWeight: 900, color: palette.ink, marginTop: 14, maxWidth: 430 }}>
        Ally Orchestrator
      </div>
      <div style={{ fontSize: 18, lineHeight: 1.28, color: palette.muted, marginTop: 14, maxWidth: 448 }}>
        Routes requests, coordinates specialists, summarizes outputs, and asks for confirmation before saving.
      </div>
      <div
        style={{
          marginTop: 14,
          display: "inline-flex",
          gap: 10,
          alignItems: "center",
          color: palette.blue,
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: 1.8,
          textTransform: "uppercase",
        }}
      >
        <span style={{ width: 12, height: 12, borderRadius: 99, background: palette.blue }} />
        Routing live
      </div>
    </div>
  );
}

function AgentCard({
  agent,
  index,
  active,
  frame,
}: {
  agent: Agent;
  index: number;
  active: boolean;
  frame: number;
}) {
  const pos = agentCardPositions[index];
  const start = 150 + index * 18;
  const appear = spring({ frame: frame - start, fps: 30, config: { damping: 17, stiffness: 90 } });
  const activeScale = active ? 1.055 : 1;

  return (
    <div
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: 590,
        minHeight: 128,
        borderRadius: 20,
        background: active ? "#fff" : "rgba(255,255,255,0.74)",
        border: `2px solid ${active ? agent.accent : "#dbe4ef"}`,
        boxShadow: active ? `0 22px 50px ${agent.accent}33` : "0 10px 26px rgba(15,23,42,0.08)",
        padding: 20,
        transform: `scale(${appear * activeScale})`,
        transformOrigin: "center",
        opacity: interpolate(appear, [0, 0.2, 1], [0, 1, 1]),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            background: agent.accent,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 20,
          }}
        >
          {index + 1}
        </div>
        <div>
          <div style={{ fontSize: 27, lineHeight: 1.02, fontWeight: 900, color: palette.ink }}>
            {agent.shortName}
          </div>
          <div style={{ fontSize: 14, color: palette.muted, fontWeight: 750, marginTop: 4 }}>
            {agent.name}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
        {agent.responsibilities.slice(0, 3).map((item) => (
          <span
            key={item}
            style={{
              padding: "7px 10px",
              borderRadius: 999,
              background: `${agent.accent}18`,
              color: palette.ink,
              fontSize: 15,
              fontWeight: 750,
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function AgentDetailPanel({ agent, frame, start }: { agent: Agent; frame: number; start: number }) {
  const opacity = fade(frame, start, start + 18) * leave(frame, start + 126, start + 150);
  const y = interpolate(opacity, [0, 1], [16, 0]);
  const revealedOutput = typeReveal(agent.exampleOutput, frame, start + 26, 3);

  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        top: 700,
        width: 950,
        minHeight: 250,
        borderRadius: 24,
        padding: 26,
        background: "#fff",
        border: `2px solid ${agent.accent}70`,
        boxShadow: `0 24px 70px ${agent.accent}25`,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start" }}>
        <div>
          <SectionLabel>Specialist Agent</SectionLabel>
          <div style={{ fontSize: 34, fontWeight: 900, color: palette.ink, marginTop: 8 }}>{agent.name}</div>
        </div>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            background: agent.accent,
            boxShadow: `0 16px 38px ${agent.accent}44`,
          }}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 28, marginTop: 24 }}>
        <div>
          <div style={{ color: palette.muted, fontSize: 17, fontWeight: 800, marginBottom: 8 }}>Receives</div>
          <div style={{ fontSize: 21, lineHeight: 1.36, color: palette.ink }}>{agent.exampleInput}</div>
        </div>
        <div>
          <div style={{ color: palette.muted, fontSize: 17, fontWeight: 800, marginBottom: 8 }}>Returns</div>
          <div style={{ fontSize: 21, lineHeight: 1.36, color: palette.ink }}>{revealedOutput}</div>
        </div>
      </div>
    </div>
  );
}

function FlowStage({ frame }: { frame: number }) {
  const lineProgressOne = fade(frame, 78, 118);
  const lineProgressTwo = fade(frame, 160, 230);
  const dashboardLine = fade(frame, 1230, 1310);
  const activeIndex = clamp(Math.floor((frame - 270) / 150), 0, agents.length - 1);
  const showDetails = frame >= 260 && frame < 1040;

  return (
    <>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <Connector x1={410} y1={414} x2={520} y2={414} progress={lineProgressOne} color={palette.blue} width={5} />
        {agents.map((agent, index) => {
          const progress = fade(frame, 160 + index * 16, 230 + index * 16) * lineProgressTwo;
          const target = agentConnectorTargets[index];
          return (
            <Connector
              key={agent.name}
              x1={1080}
              y1={425}
              x2={target.x}
              y2={target.y}
              progress={progress}
              color={agent.accent}
              width={4}
            />
          );
        })}
        <Connector x1={1080} y1={425} x2={1220} y2={560} progress={dashboardLine} color={palette.green} width={5} />
      </svg>

      <StudentNode frame={frame} />
      <OrchestratorNode frame={frame} />

      {agents.map((agent, index) => (
        <AgentCard key={agent.name} agent={agent} index={index} active={activeIndex === index && showDetails} frame={frame} />
      ))}

      <DataPacket
        label="Route request"
        x={460}
        y={360}
        color={palette.blue}
        progress={fade(frame, 100, 178) * leave(frame, 188, 228)}
      />
      <DataPacket
        label="Summarize + confirm"
        x={1110}
        y={370}
        color={palette.orange}
        progress={fade(frame, 232, 300) * leave(frame, 1140, 1200)}
      />
      <DataPacket
        label="Dashboard state"
        x={1135}
        y={500}
        color={palette.green}
        progress={fade(frame, 1260, 1340)}
      />

      {showDetails &&
        agents.map((agent, index) => (
          <AgentDetailPanel key={agent.name} agent={agent} frame={frame} start={270 + index * 150} />
        ))}
    </>
  );
}

function GuardrailStage({ frame }: { frame: number }) {
  const opacity = fade(frame, 1020, 1080) * leave(frame, 1300, 1360);
  const items = architecture.guardrails;

  return (
    <AbsoluteFill
      style={{
        opacity,
        background: "linear-gradient(135deg, rgba(247,251,255,0.98) 0%, rgba(255,248,241,0.98) 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(79,120,184,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(79,120,184,0.1) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 250,
          top: 96,
          width: 1420,
          transform: `translateY(${interpolate(opacity, [0, 1], [18, 0])}px)`,
        }}
      >
        <SectionLabel>Accuracy Structure</SectionLabel>
        <div style={{ fontSize: 58, lineHeight: 1.03, fontWeight: 900, color: palette.ink, marginTop: 10 }}>
          The architecture reduces guesswork.
        </div>
        <div style={{ fontSize: 27, lineHeight: 1.38, color: palette.muted, marginTop: 18, maxWidth: 1120 }}>
          Academic Ally stays accurate by routing work to specialists, surfacing uncertainty, and requiring review
          before durable app actions are saved.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, marginTop: 42 }}>
          {items.map((item, index) => {
            const local = fade(frame, 1080 + index * 18, 1130 + index * 18);
            return (
              <div
                key={item}
                style={{
                  minHeight: 230,
                  padding: 24,
                  borderRadius: 20,
                  background: "#fff",
                  border: "1px solid #dbe4ef",
                  boxShadow: "0 18px 44px rgba(15,23,42,0.1)",
                  opacity: local,
                  transform: `translateY(${interpolate(local, [0, 1], [22, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 16,
                    background: [palette.blue, palette.orange, palette.green, palette.purple][index],
                    marginBottom: 18,
                  }}
                />
                <div style={{ fontSize: 25, lineHeight: 1.24, fontWeight: 850, color: palette.ink }}>{item}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function DashboardStage({ frame }: { frame: number }) {
  const opacity = fade(frame, 1320, 1380) * leave(frame, 1510, 1560);
  const outputs = architecture.dashboardOutputs;

  return (
    <AbsoluteFill
      style={{
        opacity,
        background: "linear-gradient(135deg, rgba(247,251,255,0.99) 0%, rgba(255,248,241,0.99) 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(79,120,184,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(79,120,184,0.1) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 118,
          width: 1620,
          transform: `translateY(${interpolate(opacity, [0, 1], [30, 0])}px)`,
        }}
      >
        <BrandMark />
        <div style={{ marginTop: 38 }}>
          <SectionLabel>Electron App Dashboard</SectionLabel>
          <div style={{ fontSize: 64, lineHeight: 1.03, fontWeight: 950, color: palette.ink, marginTop: 10 }}>
            One adaptive academic plan
          </div>
          <div style={{ fontSize: 27, lineHeight: 1.38, color: palette.muted, marginTop: 16, maxWidth: 1120 }}>
            The orchestrator collects confirmed specialist outputs and sends them into the app as visible student-facing
            state.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 42 }}>
          {outputs.map((item, index) => {
            const itemOpacity = fade(frame, 1380 + index * 10, 1415 + index * 10);
            return (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  opacity: itemOpacity,
                  fontSize: 24,
                  fontWeight: 820,
                  color: palette.ink,
                  padding: "22px 20px",
                  minHeight: 86,
                  borderRadius: 18,
                  background: "#fff",
                  border: "1px solid #dbe4ef",
                  boxShadow: "0 16px 38px rgba(15,23,42,0.08)",
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    flex: "0 0 auto",
                    borderRadius: 999,
                    background: [palette.blue, palette.orange, palette.green, palette.purple, palette.red][index % 5],
                    boxShadow: `0 0 0 6px ${
                      [palette.blue, palette.orange, palette.green, palette.purple, palette.red][index % 5]
                    }22`,
                  }}
                />
                {item}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function ClosingStage({ frame }: { frame: number }) {
  const opacity = fade(frame, 1540, 1600);
  return (
    <AbsoluteFill
      style={{
        opacity,
        background: "linear-gradient(135deg, #f7fbff 0%, #fff8f1 100%)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: 1120, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 30 }}>
          <BrandMark />
        </div>
        <SectionLabel>Academic Ally</SectionLabel>
        <div style={{ fontSize: 76, lineHeight: 1.02, fontWeight: 950, color: palette.ink, marginTop: 12 }}>
          One orchestrator. Five specialist agents. Clear responsibilities.
        </div>
        <div style={{ fontSize: 30, lineHeight: 1.38, color: palette.muted, marginTop: 30 }}>
          The system turns scattered syllabi, study limits, diagnostic signals, and progress updates into a confirmed plan
          the app can execute.
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function AgentArchitectureClip() {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #f3f7fb 0%, #fffaf5 52%, #eef5ff 100%)",
        overflow: "hidden",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(79,120,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(79,120,184,0.12) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          opacity: 0.34,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 80,
          top: 54,
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 22,
          alignItems: "center",
          opacity: fade(frame, 0, 30) * leave(frame, 1500, 1560),
        }}
      >
        <BrandMark />
        <div>
          <SectionLabel>System Overview</SectionLabel>
          <div style={{ fontSize: 58, lineHeight: 1.02, fontWeight: 950, color: palette.ink, marginTop: 10 }}>
            Academic Ally Agent Structure
          </div>
          <div style={{ fontSize: 25, color: palette.muted, marginTop: 12 }}>
            Parent orchestration, five specialist agents, and guarded execution.
          </div>
        </div>
      </div>

      <FlowStage frame={frame} />
      <GuardrailStage frame={frame} />
      <DashboardStage frame={frame} />
      <ClosingStage frame={frame} />

      <div
        style={{
          position: "absolute",
          right: 70,
          top: 62,
          display: "flex",
          gap: 8,
          opacity: fade(frame, 35, 70) * leave(frame, 1500, 1560),
        }}
      >
        <Pill accent={palette.blue} dimmed>
          Parent routing
        </Pill>
        <Pill accent={palette.green} dimmed>
          Confirm before save
        </Pill>
      </div>
    </AbsoluteFill>
  );
}
