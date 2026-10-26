import { forwardRef } from "react";
import { Heart, Sparkles } from "lucide-react";
import { bookCoverInfo } from "../../data/bookContent";

export const CoverPage = forwardRef<HTMLDivElement>(function CoverPage(_, ref) {
  return (
    <div className="book-cover hard-page" ref={ref} data-density="hard">
      <div className="cover-border">
        <Sparkles className="cover-sparkle sparkle-top" size={18} />
        <div className="cover-flower">✿</div>
        <span className="cover-kicker">{bookCoverInfo.kicker}</span>

        <h2>
          365 dias
          <br />
          <em>de nós</em>
        </h2>

        <div className="cover-rule">
          <span />
          <Heart size={15} fill="currentColor" />
          <span />
        </div>

        <p>{bookCoverInfo.subtitle}</p>

        <div className="cover-bottom">{bookCoverInfo.dateText}</div>
        <Sparkles className="cover-sparkle sparkle-bottom" size={16} />
      </div>
    </div>
  );
});

CoverPage.displayName = "CoverPage";