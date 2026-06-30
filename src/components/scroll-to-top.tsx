import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <Button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      size="icon"
      aria-label="Back to top"
      className="fixed bottom-6 right-6 z-40 h-11 w-11 animate-fade-in rounded-full shadow-lg hover:shadow-xl"
    >
      <ArrowUp className="h-5 w-5" />
    </Button>
  );
}
