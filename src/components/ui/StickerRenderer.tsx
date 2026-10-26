import React from "react";
import { Heart, Sparkles, Star } from "lucide-react";
import type { StickerItem } from "../../data/stickersConfig";

type Props = {
  sticker: StickerItem;
  isEditMode: boolean;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
};

export function StickerRenderer({ sticker, isEditMode, onPointerDown }: Props) {
  const { id, type, x, y, rotation, caption } = sticker;

  const style: React.CSSProperties = {
    left: `${x}%`,
    top: `${y}%`,
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    cursor: isEditMode ? "grab" : "default",
    touchAction: isEditMode ? "none" : "auto",
  };

  return (
    <div
      className={`sticker-item sticker-${type} ${isEditMode ? "is-editing" : ""}`}
      style={style}
      onPointerDown={(e) => onPointerDown(e, id)}
      id={`sticker-${id}`}
    >
      {isEditMode && <div className="sticker-badge">{sticker.label}</div>}

      {/* GATINHO ROSA */}
      {type === "cat-pink" && (
        <div className="cat-sticker pink-cat">
          <svg viewBox="0 0 100 110" width="85" height="95" className="cat-svg">
            {/* Sombra suave */}
            <ellipse cx="50" cy="100" rx="34" ry="7" fill="rgba(166, 111, 112, 0.16)" />
            {/* Rabinho */}
            <path d="M 72 82 Q 94 80 88 56 Q 84 52 80 58 Q 84 72 68 76 Z" fill="#f4abbb" />
            {/* Corpo */}
            <ellipse cx="50" cy="74" rx="28" ry="24" fill="#f7b7c5" />
            {/* Barriguinha branca */}
            <ellipse cx="50" cy="77" rx="16" ry="17" fill="#fff5f7" />
            {/* Patinhas traseiras */}
            <circle cx="28" cy="88" r="9" fill="#f4abbb" />
            <circle cx="72" cy="88" r="9" fill="#f4abbb" />
            {/* Patinhas dianteiras */}
            <ellipse cx="43" cy="89" rx="6" ry="8" fill="#ffffff" />
            <ellipse cx="57" cy="89" rx="6" ry="8" fill="#ffffff" />
            {/* Orelha Esquerda */}
            <polygon points="26,40 38,15 50,38" fill="#f4abbb" />
            <polygon points="30,38 38,21 46,37" fill="#fbd3dc" />
            {/* Orelha Direita */}
            <polygon points="74,40 62,15 50,38" fill="#f4abbb" />
            <polygon points="70,38 62,21 54,37" fill="#fbd3dc" />
            {/* Cabeça */}
            <ellipse cx="50" cy="46" rx="27" ry="22" fill="#f7b7c5" />
            {/* Bochechas rosadas */}
            <circle cx="34" cy="52" r="5" fill="#f28d9f" opacity="0.6" />
            <circle cx="66" cy="52" r="5" fill="#f28d9f" opacity="0.6" />
            {/* Olhos fechadinhos e felizes (arcos) */}
            <path d="M 33 44 Q 38 39 43 44" fill="none" stroke="#684a4f" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 57 44 Q 62 39 67 44" fill="none" stroke="#684a4f" strokeWidth="2.2" strokeLinecap="round" />
            {/* Focinho e boquinha :3 */}
            <polygon points="48,48 52,48 50,51" fill="#e27387" />
            <path d="M 46 52 Q 50 56 50 52 Q 50 56 54 52" fill="none" stroke="#684a4f" strokeWidth="1.8" strokeLinecap="round" />
            {/* Bigodes */}
            <line x1="22" y1="46" x2="12" y2="44" stroke="#684a4f" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="22" y1="50" x2="13" y2="52" stroke="#684a4f" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="78" y1="46" x2="88" y2="44" stroke="#684a4f" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="78" y1="50" x2="87" y2="52" stroke="#684a4f" strokeWidth="1.4" strokeLinecap="round" />
            {/* Lacinho delicado na orelha */}
            <circle cx="35" cy="22" r="3.5" fill="#e5677d" />
            <path d="M 32 19 Q 27 18 29 25 Z" fill="#e5677d" />
            <path d="M 38 19 Q 43 18 41 25 Z" fill="#e5677d" />
          </svg>
          <div className="floating-heart">
            <Heart size={12} fill="#f28d9f" color="#f28d9f" />
          </div>
        </div>
      )}

      {/* GATINHO AZUL */}
      {type === "cat-blue" && (
        <div className="cat-sticker blue-cat">
          <svg viewBox="0 0 100 110" width="85" height="95" className="cat-svg">
            {/* Sombra suave */}
            <ellipse cx="50" cy="100" rx="34" ry="7" fill="rgba(110, 140, 166, 0.16)" />
            {/* Rabinho */}
            <path d="M 28 82 Q 6 80 12 56 Q 16 52 20 58 Q 16 72 32 76 Z" fill="#9bc4e2" />
            {/* Corpo */}
            <ellipse cx="50" cy="74" rx="28" ry="24" fill="#aed4f2" />
            {/* Barriguinha branca */}
            <ellipse cx="50" cy="77" rx="16" ry="17" fill="#f0f7fd" />
            {/* Patinhas traseiras */}
            <circle cx="28" cy="88" r="9" fill="#9bc4e2" />
            <circle cx="72" cy="88" r="9" fill="#9bc4e2" />
            {/* Patinhas dianteiras */}
            <ellipse cx="43" cy="89" rx="6" ry="8" fill="#ffffff" />
            <ellipse cx="57" cy="89" rx="6" ry="8" fill="#ffffff" />
            {/* Orelha Esquerda */}
            <polygon points="26,40 38,15 50,38" fill="#9bc4e2" />
            <polygon points="30,38 38,21 46,37" fill="#cbe3f8" />
            {/* Orelha Direita */}
            <polygon points="74,40 62,15 50,38" fill="#9bc4e2" />
            <polygon points="70,38 62,21 54,37" fill="#cbe3f8" />
            {/* Cabeça */}
            <ellipse cx="50" cy="46" rx="27" ry="22" fill="#aed4f2" />
            {/* Bochechas rosadas */}
            <circle cx="34" cy="52" r="5" fill="#f4aab8" opacity="0.6" />
            <circle cx="66" cy="52" r="5" fill="#f4aab8" opacity="0.6" />
            {/* Olhinhos meigos redondinhos com brilho */}
            <circle cx="38" cy="43" r="3.6" fill="#3a4f66" />
            <circle cx="39.2" cy="41.8" r="1.3" fill="#ffffff" />
            <circle cx="62" cy="43" r="3.6" fill="#3a4f66" />
            <circle cx="63.2" cy="41.8" r="1.3" fill="#ffffff" />
            {/* Focinho e boquinha */}
            <polygon points="48,48 52,48 50,51" fill="#7ba5cb" />
            <path d="M 46 52 Q 50 56 50 52 Q 50 56 54 52" fill="none" stroke="#3a4f66" strokeWidth="1.8" strokeLinecap="round" />
            {/* Bigodes */}
            <line x1="22" y1="46" x2="12" y2="44" stroke="#3a4f66" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="22" y1="50" x2="13" y2="52" stroke="#3a4f66" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="78" y1="46" x2="88" y2="44" stroke="#3a4f66" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="78" y1="50" x2="87" y2="52" stroke="#3a4f66" strokeWidth="1.4" strokeLinecap="round" />
            {/* Gravatinha borboleta azul escura no peito */}
            <polygon points="44,65 50,67 44,69" fill="#5b88b2" />
            <polygon points="56,65 50,67 56,69" fill="#5b88b2" />
            <circle cx="50" cy="67" r="1.8" fill="#3f6c96" />
          </svg>
          <div className="floating-star">
            <Star size={12} fill="#ffdd80" color="#e8b835" />
          </div>
        </div>
      )}

      {/* POLAROID COM FITA ADESIVA */}
      {type === "polaroid" && (
        <div className="sticker-polaroid">
          <div className="washi-tape" />
          <div className="polaroid-inner">
            <div className="polaroid-photo-area">
              <Heart size={20} className="photo-heart-icon" />
              <span>foto especial</span>
            </div>
            <span className="polaroid-caption">{caption}</span>
          </div>
        </div>
      )}

      {/* BILHETINHO ADESIVO (POST-IT) */}
      {type === "sticky-note" && (
        <div className="sticker-postit">
          <div className="washi-tape tape-center" />
          <p className="postit-text">{caption}</p>
          <div className="postit-pin">
            <Heart size={10} fill="#e11d48" color="#e11d48" />
          </div>
        </div>
      )}

      {/* GRUPO DE ESTRELAS E CORAÇÕES */}
      {type === "stars-cluster" && (
        <div className="sticker-stars">
          <Sparkles size={18} className="star-sparkle star-1" />
          <Star size={14} className="star-sparkle star-2" fill="#ffd166" color="#ffd166" />
          <Heart size={13} className="star-sparkle star-3" fill="#f497a9" color="#f497a9" />
        </div>
      )}
    </div>
  );
}
