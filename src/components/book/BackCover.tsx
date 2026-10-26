import { forwardRef } from "react";
import { Heart } from "lucide-react";

export const BackCover = forwardRef<HTMLDivElement>(function BackCover(_, ref) {
  return (
    <div className="paper-page back-cover" ref={ref}>
      <div className="back-cover-inner">
        <Heart size={25} strokeWidth={1.2} />
        <span>continua...</span>
        <small>com amor, sempre.</small>
      </div>
    </div>
  );
});
