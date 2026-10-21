import { useTheme } from "../theme/ThemeProvider";

// Full logo; switches to the white version on dark backgrounds.
export default function Logo({ height = 34, white = false, className = "" }) {
  const { theme } = useTheme();
  const src = white || theme === "dark" ? "/bizhub-logo-white.svg" : "/bizhub-logo.svg";
  return <img src={src} alt="BizHub" height={height} style={{ height, width: "auto", display: "block" }} className={className} />;
}
