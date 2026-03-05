import { useEffect, useMemo, useRef, useState } from "react";

export type DropdownOption<T extends string | number> = {
  value: T;
  label: string;
};

type Props<T extends string | number> = {
  value: T;
  options: readonly DropdownOption<T>[];
  onChange: (v: T) => void;

  disabled?: boolean;
  ariaLabel?: string;
  width?: number | string;
  align?: "left" | "right";
  direction?: "down" | "up"; // ✅ bottomDock에서는 up 추천
};

export default function Dropdown<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
  ariaLabel,
  width,
  align = "left",
  direction = "down",
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === value),
    ),
  );

  const rootRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => options.find((o) => o.value === value) ?? options[0], [options, value]);

  // close on outside click
  useEffect(() => {
    if (!open) return;

    const onDown = (e: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (e.target instanceof Node && !root.contains(e.target)) setOpen(false);
    };

    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  // sync activeIndex when open/value changes
  useEffect(() => {
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [options, value]);

  // focus list when open
  useEffect(() => {
    if (!open) return;
    // 다음 tick에 포커스
    const t = window.setTimeout(() => {
      listRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const listboxId = useMemo(() => `dd_${Math.random().toString(36).slice(2)}`, []);

  function commit(idx: number) {
    const opt = options[idx];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
    btnRef.current?.focus();
  }

  function move(delta: number) {
    setActiveIndex((prev) => {
      const next = Math.min(options.length - 1, Math.max(0, prev + delta));
      return next;
    });
  }

  function onButtonKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((v) => !v);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      return;
    }
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      btnRef.current?.focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(options.length - 1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      commit(activeIndex);
      return;
    }
  }

  return (
    <div ref={rootRef} className="dd" style={{ width }}>
      <button
        ref={btnRef}
        type="button"
        className="ddBtn"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onButtonKeyDown}
      >
        <span className="ddBtnLabel">{selected?.label ?? String(value)}</span>
        <span className="ddChevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div
          id={listboxId}
          ref={listRef}
          className={`ddMenu ${align === "right" ? "right" : "left"} ${direction === "up" ? "up" : "down"}`}
          role="listbox"
          tabIndex={-1}
          onKeyDown={onListKeyDown}
        >
          {options.map((o, idx) => {
            const selected = o.value === value;
            const active = idx === activeIndex;

            return (
              <button
                key={String(o.value)}
                type="button"
                className={`ddItem ${selected ? "selected" : ""} ${active ? "active" : ""}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => commit(idx)}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}