// The BizHub POS desktop apps offered on the homepage (#pos).
// The files are in the public GitHub repo penvisamef-git/bizhub-pos, folder downloads/ (Firebase's free plan refuses
// .exe files). A new version = replace the two files there with the same names, then update `version` / `size` here.
const GH = "https://github.com/penvisamef-git/bizhub-pos/raw/main/downloads";
export const POS_DOWNLOADS = {
  version: "1.0.0",
  test: true, // not signed yet → the page explains the one-time "open anyway" step
  windows: { url: `${GH}/BizHub-POS-Setup.exe`, size: "16 MB", needs: "Windows 10 / 11 (64-bit)" },
  mac: { url: `${GH}/BizHub-POS.dmg`, size: "29 MB", needs: "macOS 10.15+ · Apple silicon & Intel" },
};
