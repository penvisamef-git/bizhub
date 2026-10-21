import { useEffect } from "react";

export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · BizHub` : "BizHub · One account. Every business you run.";
  }, [title]);
}
