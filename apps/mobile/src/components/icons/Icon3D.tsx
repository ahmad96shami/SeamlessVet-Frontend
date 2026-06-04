import { useId } from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

/**
 * The design's 3D-clay client avatars (chicken / cow / house / farm) — ported from
 * the prototype's icons-3d set. These decorate customer & farm rows everywhere a
 * "photo" appears in the design (visits list, client picker, statements…).
 *
 * ART palette note: these are ILLUSTRATION colours (gradients, skin tints, wood…),
 * not UI tokens — they live here by design and are the one sanctioned exception to
 * the "no hex outside src/theme/tokens.js" rule. The reds are deliberately MUTED
 * versus the prototype (terracotta instead of fire-engine) per the MoD colour pass.
 */
const ART = {
  // chicken
  bodyTop: "#FFFDF7",
  bodyBottom: "#E9DFC9",
  combTop: "#E08A77", // prototype #FF7A6B — muted
  combBottom: "#A84A38", // prototype #C8331E — muted
  beak: "#E0A23F", // prototype #F2A027 — slightly muted
  legs: "#D09433", // prototype #E0982E — slightly muted
  // cow
  cowTop: "#FFFFFF",
  cowBottom: "#E9D6CC",
  earPink: "#EFB4B4", // prototype #F4ADAD — softened
  snoutPink: "#EDB8BE", // prototype #F2B3BB — softened
  // house / farm
  roof: "#A85D4A", // prototype #C84A3A — muted terracotta
  roofDark: "#7E4136", // prototype #8A2E22 — muted
  door: "#7A4A2D",
  knob: "#E5C45C", // prototype #F2C84B — slightly muted
  window: "#8CBFDC", // prototype #7BC0E5 — slightly muted
  silo: "#F4EAD2",
  siloCap: "#E2D3B0",
  barnDoor: "#FFF7E8",
  barnTrim: "#8A4A2E",
  inkDark: "#1B1B1B",
} as const;

export type Icon3DName = "chicken" | "cow" | "house" | "farm";

type Scene = React.ComponentType<{ uid: string }>;

const ContactShadow = () => <Ellipse cx={32} cy={60} rx={20} ry={2.5} fill="#000" opacity={0.1} />;

const Chicken: Scene = ({ uid }) => (
  <G>
    <Defs>
      <LinearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={ART.bodyTop} />
        <Stop offset="1" stopColor={ART.bodyBottom} />
      </LinearGradient>
      <LinearGradient id={`${uid}-comb`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={ART.combTop} />
        <Stop offset="1" stopColor={ART.combBottom} />
      </LinearGradient>
    </Defs>
    <ContactShadow />
    {/* tail */}
    <Path d="M14 30 Q9 24 13 18 Q17 22 18 30 Z" fill="#FFF" opacity={0.95} />
    <Path d="M14 30 Q9 24 13 18 Q17 22 18 30 Z" fill="#000" opacity={0.06} />
    {/* body */}
    <Ellipse cx={36} cy={38} rx={18} ry={15} fill={`url(#${uid}-body)`} />
    {/* wing */}
    <Path d="M28 36 Q34 32 42 36 Q38 44 30 44 Z" fill="#000" opacity={0.06} />
    {/* legs */}
    <Path
      d="M30 52 v6 m1.5 0 h-3 m9 -6 v6 m1.5 0 h-3"
      stroke={ART.legs}
      strokeWidth={2}
      strokeLinecap="round"
      fill="none"
    />
    {/* head */}
    <Circle cx={46} cy={26} r={9} fill={`url(#${uid}-body)`} />
    {/* comb */}
    <Path
      d="M40 18 q1 -3 3 -2 q1 -3 3 -2 q1 -3 3 -1 q-1 4 -4 4 q-3 0 -5 1z"
      fill={`url(#${uid}-comb)`}
    />
    {/* wattle */}
    <Path d="M51 30 q3 1 2 4 q-2 1 -3 -1 z" fill={`url(#${uid}-comb)`} />
    {/* beak */}
    <Path d="M52 26 l5 1 -5 3 z" fill={ART.beak} />
    {/* eye */}
    <Circle cx={46} cy={24} r={1.6} fill={ART.inkDark} />
    <Circle cx={46.5} cy={23.5} r={0.6} fill="#fff" />
  </G>
);

const Cow: Scene = ({ uid }) => (
  <G>
    <Defs>
      <LinearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={ART.cowTop} />
        <Stop offset="1" stopColor={ART.cowBottom} />
      </LinearGradient>
    </Defs>
    <ContactShadow />
    {/* ears */}
    <Ellipse cx={17} cy={22} rx={5} ry={4} fill={ART.earPink} transform="rotate(-20 17 22)" />
    <Ellipse cx={47} cy={22} rx={5} ry={4} fill={ART.earPink} transform="rotate(20 47 22)" />
    {/* head */}
    <Path
      d="M16 32 Q16 16 32 16 Q48 16 48 32 Q48 50 32 50 Q16 50 16 32 Z"
      fill={`url(#${uid}-body)`}
    />
    {/* spots */}
    <Ellipse cx={22} cy={24} rx={4} ry={3} fill={ART.inkDark} opacity={0.85} transform="rotate(-15 22 24)" />
    <Ellipse cx={44} cy={38} rx={3} ry={2.5} fill={ART.inkDark} opacity={0.85} transform="rotate(20 44 38)" />
    {/* snout */}
    <Ellipse cx={32} cy={40} rx={11} ry={7} fill={ART.snoutPink} />
    <Circle cx={28} cy={40} r={1.4} fill={ART.inkDark} />
    <Circle cx={36} cy={40} r={1.4} fill={ART.inkDark} />
    {/* eyes */}
    <Circle cx={26} cy={30} r={1.8} fill={ART.inkDark} />
    <Circle cx={38} cy={30} r={1.8} fill={ART.inkDark} />
    <Circle cx={26.5} cy={29.5} r={0.6} fill="#fff" />
    <Circle cx={38.5} cy={29.5} r={0.6} fill="#fff" />
  </G>
);

const House: Scene = () => (
  <G>
    <ContactShadow />
    {/* base */}
    <Path d="M14 32 L32 16 L50 32 V52 H14 Z" fill="#FFFFFF" />
    <Path d="M14 32 L32 16 L50 32 V52 H14 Z" fill="#000" opacity={0.05} />
    {/* roof */}
    <Path d="M12 33 L32 14 L52 33 L48 33 L32 19 L16 33 Z" fill={ART.roof} />
    {/* door */}
    <Rect x={28} y={38} width={8} height={14} rx={1.5} fill={ART.door} />
    <Circle cx={34} cy={46} r={0.7} fill={ART.knob} />
    {/* windows */}
    <Rect x={18} y={36} width={7} height={7} rx={1} fill={ART.window} />
    <Path d="M21.5 36 v7 M18 39.5 h7" stroke="#FFF" strokeWidth={0.8} />
    <Rect x={39} y={36} width={7} height={7} rx={1} fill={ART.window} />
    <Path d="M42.5 36 v7 M39 39.5 h7" stroke="#FFF" strokeWidth={0.8} />
    {/* chimney */}
    <Rect x={40} y={18} width={4} height={6} fill={ART.roof} />
  </G>
);

const Farm: Scene = () => (
  <G>
    <ContactShadow />
    {/* silo */}
    <Rect x={14} y={22} width={9} height={28} rx={1} fill={ART.silo} />
    <Ellipse cx={18.5} cy={22} rx={4.5} ry={2} fill={ART.siloCap} />
    {/* barn body */}
    <Path d="M26 30 H52 V50 H26 Z" fill={ART.roof} />
    {/* roof */}
    <Path d="M24 30 L39 18 L54 30 Z" fill={ART.roofDark} />
    {/* doors */}
    <Rect x={35} y={36} width={10} height={14} fill={ART.barnDoor} />
    <Path d="M35 36 L45 50 M45 36 L35 50" stroke={ART.barnTrim} strokeWidth={1.4} />
    <Path d="M35 36 H45 V50 H35 Z" fill="none" stroke={ART.barnTrim} strokeWidth={1} />
    <Rect x={28} y={38} width={5} height={5} fill={ART.barnDoor} />
    <Rect x={47} y={38} width={3} height={5} fill={ART.barnDoor} />
  </G>
);

const SCENES: Record<Icon3DName, Scene> = {
  chicken: Chicken,
  cow: Cow,
  house: House,
  farm: Farm,
};

export function Icon3D({ name, size = 48 }: { name: Icon3DName; size?: number }) {
  // Gradient ids must be unique per mounted instance or RN-SVG cross-wires defs.
  const uid = useId();
  const Scene = SCENES[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Scene uid={uid} />
    </Svg>
  );
}
