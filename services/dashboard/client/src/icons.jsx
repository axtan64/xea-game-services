// The dashboard's icons: 24-unit line drawings, drawn in the text's colour
const PATHS = {
    overview: <><path d="M4 20V11" /><path d="M10 20V5" /><path d="M16 20v-6" /><path d="M21 20H3" /></>,
    megaphone: <><path d="M4 10v4a1 1 0 0 0 1 1h2l5 4V5L7 9H5a1 1 0 0 0-1 1z" /><path d="M15.5 9a4.5 4.5 0 0 1 0 6" /><path d="M18.5 6a8.5 8.5 0 0 1 0 12" /></>,
    users: <><circle cx="9" cy="8" r="4" /><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1" /><path d="M16 3.5a4 4 0 0 1 0 7.5" /><path d="M22 21v-1a6 6 0 0 0-4-5.6" /></>,
    shield: <><path d="M12 3 4 6v6c0 4.8 3.4 8 8 9 4.6-1 8-4.2 8-9V6l-8-3z" /><path d="m9 12 2 2 4-4" /></>,
    building: <><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M9 7.5h1M14 7.5h1M9 11.5h1M14 11.5h1" /><path d="M10 21v-4h4v4" /></>,
    receipt: <><path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
    gamepad: <><rect x="2" y="6" width="20" height="12" rx="6" /><path d="M6.5 12h4M8.5 10v4" /><path d="M15 11h.01M17.5 13.5h.01" /></>,
    sliders: <><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" /><circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="17" cy="18" r="2" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    chevronDown: <path d="m6 9 6 6 6-6" />,
    check: <path d="M5 12.5 10 17.5 19 7" />,
    x: <path d="M18 6 6 18M6 6l12 12" />,
    logOut: <><path d="M9 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
    logIn: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="m10 17 5-5-5-5" /><path d="M15 12H3" /></>,
    refresh: <><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /></>,
    external: <><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    alert: <><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
    checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
    xCircle: <><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6M9 9l6 6" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="m6 7 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /><path d="M9 7V4h6v3" /></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
    gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" /><path d="M12 8S10.5 3 8 3a2.5 2.5 0 0 0 0 5M12 8s1.5-5 4-5a2.5 2.5 0 0 1 0 5" /></>,
    bomb: <><circle cx="11" cy="14" r="7" /><path d="m16 9 2.5-2.5M19.5 3.5 21 2M20 7h1.5M17 3V1.5" /></>,
    chart: <><path d="M3 20h18" /><path d="m4 15 5-5 4 4 7-7" /></>,
    key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M17 6l3 3M14 9l2 2" /></>,
};

export function Icon({ name, size = 20, className = '', strokeWidth = 2 }) {
    return (
        <svg
            className={`icon ${className}`}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {PATHS[name]}
        </svg>
    );
}
