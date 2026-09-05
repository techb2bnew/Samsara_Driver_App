export const darkgrayColor = "#252837";
export const whiteColor = "#fff";
export const blackColor = "black";
export const grayColor = "#96989aff";
export const primaryRedColor = "#E94545";
export const redColor = "#E94545";
export const inputBgColor = "#F2F2F7";
export const tabBgColor = "#F3F4F6";
export const borderLightColor = "#E5E5EA";
export const purpleColor = "#9B51E0";
export const screenBgColor = "#F0F2F5";
export const goldColor = "#FFA928";
export const lightGrayColor = "#D1D4D6";
export const lightGreenColor = "#42f5a4";
export const lightGrayOpacityColor = "#e8e8e0";
export const brightTurquoiseColor = "#34ebc0";
export const blackOpacity5 = 'rgba(0,0,0,0.5)';
export const lightShadeBlue = "#bbc1d6";
export const verylightGrayColor = "#E6E6E6";
export const mediumGray = "#808080";
export const lightPink = "#FFEBEB";
export const blackOpacity7 = 'rgba(0,0,0,0.7)';
export const greenColor = "#3B8000";

export const splashBgColor = '#1C1E2B';
export const authCardBg = '#1A1D2B';
export const authInputBg = '#252837';
export const authBorderColor = 'rgba(255,255,255,0.1)';
export const authMutedColor = '#8A8D9F';
export const authLinkColor = '#5B9BD5';
export const authTabBg = '#1E2130';
export const authSocialBg = '#1E2130';
export const authStatCardBg = 'rgba(255,255,255,0.06)';



export const orangeColor = '#FF5733';
export const lightOrangeColor = '#EF502E';
export const ExtraExtralightOrangeColor = '#FFF4F1';
export const blueColor = '#3B6981';
export const lightBlueColor ='#3b698143';

// ---------------------------------------------------------------------------
// Driver app — light theme
// ---------------------------------------------------------------------------
// A cab in daylight is the hardest place to read a screen, so the app is light
// with strong contrast and one accent. The dark auth tokens above are left
// alone: they belong to another flow and removing them would break it.
//
// The accent is the red already in this file. Everything else is a neutral
// with a faint warm tint so it reads as chosen rather than as default grey.

// Grounds. `appBg` is the page, `cardBg` the raised surface on top of it.
export const appBg = '#F7F8FA';
export const cardBg = '#FFFFFF';
export const cardBgSoft = '#F2F4F7';

// Lines. `borderColor` for dividers, `borderStrong` for input outlines that
// have to be findable in sunlight.
export const borderColor = '#E7E9EE';
export const borderStrong = '#D3D7DF';

// Text. Four steps is enough; a fifth one is always too close to its neighbour.
export const textDark = '#141924';
export const textBody = '#3C4453';
export const textMuted = '#6B7383';
export const textFaint = '#9AA1AE';

// The accent, and the two tints it needs to sit on.
export const accentColor = '#E94545';
export const accentPressed = '#C93636';
export const accentSoft = '#FDECEC';
export const accentLine = '#F7C9C9';

// On a filled accent button. Near-white rather than pure, which stops the red
// vibrating against it.
export const onAccent = '#FFF7F7';

// Duty statuses. These are the four bands on the log graph and the four big
// buttons, so they have to be told apart at a glance and while moving.
export const dutyOffColor = '#8A93A3';
export const dutySleeperColor = '#5B6BC9';
export const dutyDrivingColor = '#1F9254';
export const dutyOnDutyColor = '#D98324';

// State, kept separate from the accent — "danger" must never read as "the
// button you press".
export const okColor = '#158A4E';
export const okSoft = '#E7F5EE';
export const warnColor = '#9A6410';
export const warnSoft = '#FCF2E2';
export const dangerColor = '#C0342C';
export const dangerSoft = '#FCEAE8';

// A control that is not pressable yet. Reads as "not yet", not as broken.
export const disabledBg = '#E9EBF0';
export const disabledText = '#A8AEBA';

// Onboarding progress.
export const dotActiveColor = '#E94545';
export const dotInactiveColor = '#D9DDE5';

// Shadow, used through elevation on Android and shadowColor on iOS.
export const shadowColor = '#0B1220';

// Placeholder inside an input. Muted is too dark next to typed text.
export const placeholderColor = '#A2A9B6';

// A focused field lifts off the card; an errored one takes the faintest wash
// of the danger colour. Both were inline hex in CustomTextInput.
export const inputFocusBg = '#FFFFFF';
export const inputErrorBg = '#FFF7F6';

// ---------------------------------------------------------------------------
// Translucent washes
// ---------------------------------------------------------------------------
// Alpha values, so they sit over whatever is behind them. They were written
// inline as rgba() in six files, which is the one thing the house style bans:
// a theme change had six places to find and nobody would find all six.
export const brandWashFaint = 'rgba(233,69,69,0.08)';
export const brandWashSoft = 'rgba(233,69,69,0.10)';
export const brandWashMid = 'rgba(233,69,69,0.14)';
export const brandWashStrong = 'rgba(233,69,69,0.18)';
export const brandWashDeep = 'rgba(233,69,69,0.28)';

/** On a dark ground: a splash panel, a pressed tile. */
export const lightWash = 'rgba(255,255,255,0.12)';
/** The wash over a selected duty tile, which already carries its own colour. */
export const selectedWash = 'rgba(255,255,255,0.2)';
export const splashText = 'rgba(255,247,247,0.62)';
/** Behind a modal. Cool rather than black, so the card below reads as lifted. */
export const scrim = 'rgba(15,20,30,0.45)';
