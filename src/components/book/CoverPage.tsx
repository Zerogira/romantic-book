import { forwardRef } from "react";
import { Heart, Sparkles } from "lucide-react";

export const CoverPage = forwardRef<HTMLDivElement>(function CoverPage(_, ref) {
  return (
    <div className="book-cover" ref={ref}>
      <div className="cover-border">
        <Sparkles className="cover-sparkle sparkle-top" size={19} />
        <div className="cover-flower">✿</div>
        <span className="cover-kicker">UM LIVRO SOBRE NÓS</span>
        <h2>365 dias<br /><em>de nós</em></h2>
        <div className="cover-rule"><span /><Heart size={15} fill="currentColor" /><span /></div>
        <p>uma história feita de<br />pequenos infinitos</p>
        <div className="cover-bottom">NOSSO PRIMEIRO ANO</div>
        <Sparkles className="cover-sparkle sparkle-bottom" size={16} />
      </div>
    </div>
  );
});