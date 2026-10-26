import { forwardRef } from "react";
import { Heart, Sparkles } from "lucide-react";

export const BackCover = forwardRef<HTMLDivElement>(function BackCover(_, ref) {
  return (
    <div className="paper-page back-cover hard-page" ref={ref} data-density="hard">
      <div className="back-cover-inner">
        <Sparkles size={20} className="back-sparkle" />
        <Heart size={32} strokeWidth={1.2} fill="rgba(242, 221, 202, 0.2)" />
        <span>continua...</span>
        <small>com amor, hoje e sempre.</small>
      </div>
    </div>
  );
});

BackCover.displayName = "BackCover";
