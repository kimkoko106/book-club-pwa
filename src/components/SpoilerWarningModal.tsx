import React, { useState } from 'react';
import { ShieldAlert, ArrowRight } from 'lucide-react';

interface SpoilerWarningModalProps {
  isOpen: boolean;
  onConfirm: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

export default function SpoilerWarningModal({ isOpen, onConfirm, onCancel }: SpoilerWarningModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[120] flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-card-bg border border-card-border rounded-3xl p-6 shadow-2xl max-w-sm w-full flex flex-col items-center text-center gap-5 relative overflow-hidden">
        {/* 데코레이션 링 */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-sage-light/20 rounded-full -z-10" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-warm-beige/10 rounded-full -z-10" />

        <div className="w-14 h-14 bg-sage-light/50 rounded-2xl flex justify-center items-center text-sage-dark">
          <ShieldAlert size={28} />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-black text-sage-medium uppercase tracking-widest">스포일러 주의 🌲</span>
          <h3 className="text-base font-black text-foreground">잠시 이야기방에 들르기 전에</h3>
        </div>

        <div className="flex flex-col gap-3 text-xs text-foreground/60 leading-relaxed font-semibold">
          <p className="bg-foreground/5 p-3 rounded-xl">
            “아직 읽지 않은 페이지의 이야기가 담겨 있을 수 있어요.”
          </p>
          <div className="flex flex-col gap-1.5 text-left px-1 mt-1 text-[11px]">
            <p className="flex gap-1.5 items-start">
              <span className="text-sage-dark flex-shrink-0">•</span>
              <span>서로의 독서 속도가 다른 만큼, 조심스럽게 이야기를 나눠주세요.</span>
            </p>
            <p className="flex gap-1.5 items-start">
              <span className="text-sage-dark flex-shrink-0">•</span>
              <span>예상치 못한 중요한 장면의 스포일러가 포함될 수 있습니다.</span>
            </p>
          </div>
        </div>

        {/* 다시 보지 않기 체크박스 */}
        <label className="flex items-center gap-2 text-[11px] font-semibold text-foreground/75 cursor-pointer self-start pl-1 mt-1">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-card-border text-sage-medium focus:ring-sage-light cursor-pointer accent-sage-medium"
          />
          <span>이 책에서는 다시 보지 않기</span>
        </label>

        {/* 버튼 영역 */}
        <div className="flex flex-col gap-2 w-full mt-1">
          <button
            onClick={() => onConfirm(dontShowAgain)}
            className="w-full py-3 bg-sage-dark hover:bg-sage-medium text-white rounded-xl text-xs font-black flex justify-center items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <span>괜찮아요, 계속 볼게요</span>
            <ArrowRight size={13} />
          </button>
          
          <button
            onClick={onCancel}
            className="w-full py-3 bg-foreground/5 hover:bg-foreground/10 text-foreground/70 rounded-xl text-xs font-black flex justify-center items-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-card-border/40"
          >
            <span>아니요, 돌아갈래요</span>
          </button>
        </div>
      </div>
    </div>
  );
}
