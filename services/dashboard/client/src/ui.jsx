import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons.jsx';

// The dashboard's own controls, drawn as Discord draws its own: a dropdown, a dialog, confirmations and tooltips

// A dropdown: a closed box showing the pick, and a list under it that keyboard and mouse both work.
// `options` are { value, label }
export function Select({ value, options, onChange, disabled = false, className = '', ariaLabel }) {
    const [open, setOpen] = useState(false);
    const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
    const [active, setActive] = useState(selectedIndex);
    const rootRef = useRef(null);
    const listId = useId();

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => {
            if (!rootRef.current?.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    function openList() {
        setActive(selectedIndex);
        setOpen(true);
    }

    function pick(index) {
        onChange(options[index].value);
        setOpen(false);
    }

    function onKeyDown(e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) return openList();
            const step = e.key === 'ArrowDown' ? 1 : -1;
            setActive((index) => (index + step + options.length) % options.length);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (open) pick(active);
            else openList();
        } else if (e.key === 'Escape' && open) {
            e.stopPropagation();
            setOpen(false);
        } else if (e.key === 'Tab') {
            setOpen(false);
        }
        return undefined;
    }

    return (
        <div className={`select ${open ? 'open' : ''} ${className}`} ref={rootRef}>
            <button
                type="button"
                className="select-control"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                aria-label={ariaLabel}
                disabled={disabled}
                onClick={() => (open ? setOpen(false) : openList())}
                onKeyDown={onKeyDown}
            >
                <span className="select-value">{options[selectedIndex]?.label}</span>
                <Icon name="chevronDown" className="select-chevron" />
            </button>
            {open && (
                <div className="select-popout" role="listbox" id={listId}>
                    {options.map((option, index) => {
                        const isSelected = option.value === value;
                        return (
                            <div
                                key={String(option.value)}
                                role="option"
                                aria-selected={isSelected}
                                className={`select-option ${index === active ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                                onMouseEnter={() => setActive(index)}
                                // Keeps the focus on the box, so the keyboard still works after a click
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => pick(index)}
                            >
                                <span>{option.label}</span>
                                {isSelected ? <span className="select-check"><Icon name="check" size={14} strokeWidth={3} /></span> : null}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// A dialog over the page: Escape, the close button and a click outside all close it
export function Modal({ title, children, footer, onClose, className = '' }) {
    const titleId = useId();

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    return createPortal(
        <div className="modal-layer">
            <div className="modal-backdrop" onClick={onClose} />
            <div className={`modal ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
                <div className="modal-head">
                    <h2 id={titleId}>{title}</h2>
                    <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
                        <Icon name="x" size={24} />
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                {footer ? <div className="modal-foot">{footer}</div> : null}
            </div>
        </div>,
        document.body,
    );
}

const ConfirmContext = createContext(null);

// Lets any page ask before doing something: `await confirm({ title, body, confirmLabel, danger })` is whether the
// question was answered yes
export function ConfirmProvider({ children }) {
    const [request, setRequest] = useState(null);
    const confirm = useCallback((options) => new Promise((resolve) => setRequest({ ...options, resolve })), []);

    const finish = useCallback((answer) => {
        setRequest((current) => {
            current?.resolve(answer);
            return null;
        });
    }, []);
    const cancel = useCallback(() => finish(false), [finish]);

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {request && (
                <Modal
                    title={request.title}
                    onClose={cancel}
                    footer={(
                        <>
                            <button type="button" className="button link" onClick={cancel}>Cancel</button>
                            <button type="button" className={`button ${request.danger ? 'danger' : 'brand'}`} autoFocus onClick={() => finish(true)}>
                                {request.confirmLabel ?? 'Confirm'}
                            </button>
                        </>
                    )}
                >
                    {typeof request.body === 'string' ? <p>{request.body}</p> : request.body}
                </Modal>
            )}
        </ConfirmContext.Provider>
    );
}

export const useConfirm = () => useContext(ConfirmContext);

const TIP_GAP = 8;
const EDGE = 8;

// Draws the tooltip of whatever with a `data-tip` the pointer or the keyboard is on, above it, or beside it with
// `data-tip-side="right"`. One layer for the whole page, outside every scrolling box, so no tooltip is cut off
export function TooltipLayer() {
    const [tip, setTip] = useState(null); // { target, text, side }
    const [place, setPlace] = useState(null);
    const tipRef = useRef(null);

    useEffect(() => {
        const read = (target) => ({
            target,
            text: target.getAttribute('data-tip'),
            side: target.getAttribute('data-tip-side') || 'top',
        });
        function show(e) {
            const target = e.target.closest?.('[data-tip]');
            if (!target || !target.getAttribute('data-tip')) return;
            setTip((current) => (current?.target === target ? current : read(target)));
        }
        function hide(e) {
            const target = e.target.closest?.('[data-tip]');
            if (!target || target.contains(e.relatedTarget)) return;
            setTip((current) => (current?.target === target ? null : current));
        }
        const clear = () => setTip(null);

        document.addEventListener('mouseover', show);
        document.addEventListener('mouseout', hide);
        document.addEventListener('focusin', show);
        document.addEventListener('focusout', hide);
        window.addEventListener('scroll', clear, true);
        window.addEventListener('resize', clear);
        return () => {
            document.removeEventListener('mouseover', show);
            document.removeEventListener('mouseout', hide);
            document.removeEventListener('focusin', show);
            document.removeEventListener('focusout', hide);
            window.removeEventListener('scroll', clear, true);
            window.removeEventListener('resize', clear);
        };
    }, []);

    // A tooltip whose words change while it shows ("Copied!") follows them; one whose target leaves the page goes
    useEffect(() => {
        if (!tip) return undefined;
        const observer = new MutationObserver(() => {
            if (!tip.target.isConnected || !tip.target.getAttribute('data-tip')) return setTip(null);
            return setTip((current) => (current ? { ...current, text: tip.target.getAttribute('data-tip') } : current));
        });
        observer.observe(tip.target, { attributes: true, attributeFilter: ['data-tip'] });
        const watch = setInterval(() => !tip.target.isConnected && setTip(null), 300);
        return () => {
            observer.disconnect();
            clearInterval(watch);
        };
    }, [tip?.target]); // eslint-disable-line react-hooks/exhaustive-deps

    // Placed by what the tip is, not by its object: React may hand back a fresh but equal one on any render, and
    // placing again each time would render again for ever. An unchanged place isn't set again either
    useLayoutEffect(() => {
        const settle = (next) => setPlace((current) => (
            current && next && ['left', 'top', 'arrow', 'side'].every((key) => current[key] === next[key]) ? current : next
        ));
        if (!tip || !tipRef.current) return settle(null);

        const rect = tip.target.getBoundingClientRect();
        const { width, height } = tipRef.current.getBoundingClientRect();
        if (tip.side === 'right') {
            return settle({ left: rect.right + TIP_GAP + 4, top: rect.top + rect.height / 2 - height / 2, arrow: height / 2 });
        }

        const centre = rect.left + rect.width / 2;
        const left = Math.min(Math.max(EDGE, centre - width / 2), window.innerWidth - width - EDGE);
        const above = rect.top - height - TIP_GAP;
        const side = above < EDGE ? 'bottom' : 'top';
        return settle({ left, top: side === 'top' ? above : rect.bottom + TIP_GAP, arrow: centre - left, side });
    }, [tip?.target, tip?.text, tip?.side]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!tip) return null;
    const side = tip.side === 'right' ? 'right' : place?.side ?? 'top';

    return createPortal(
        <div
            ref={tipRef}
            className={`tooltip ${side} ${place ? 'shown' : ''}`}
            role="tooltip"
            style={{ left: place?.left ?? -9999, top: place?.top ?? -9999, '--arrow': `${place?.arrow ?? 0}px` }}
        >
            {tip.text}
        </div>,
        document.body,
    );
}

// Copies `text`, saying so in its tooltip for a moment
export function CopyButton({ text, tip = 'Copy', className = '' }) {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return undefined;
        const timer = setTimeout(() => setCopied(false), 1500);
        return () => clearTimeout(timer);
    }, [copied]);

    async function copy() {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
        } catch {
            // A browser that refuses the clipboard leaves the text to be selected by hand
        }
    }

    return (
        <button type="button" className={`icon-button ${copied ? 'copied' : ''} ${className}`} data-tip={copied ? 'Copied!' : tip} aria-label={tip} onClick={copy}>
            <Icon name={copied ? 'check' : 'copy'} size={16} />
        </button>
    );
}
