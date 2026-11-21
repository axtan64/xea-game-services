export const number = (value) => (value ?? 0).toLocaleString();

export const robux = (value) => `R$ ${number(value)}`;

export const money = (dollars) =>
    `$${(dollars ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// A share from 0 to 1, as the game keeps it
export const percent = (share) => `${Math.round((share ?? 0) * 1000) / 10}%`;

export function duration(seconds) {
    const total = Math.max(0, Math.floor(seconds ?? 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);

    if (hours > 0) return `${hours} h ${minutes} min`;
    if (minutes > 0) return `${minutes} min`;
    return `${total} s`;
}

export function timeAgo(date) {
    if (!date) return 'never';

    const seconds = Math.round((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 0) return `in ${duration(-seconds)}`;
    if (seconds < 45) return 'just now';
    if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`;
    return `${Math.round(seconds / 86400)} days ago`;
}

export const dateTime = (date) => (date ? new Date(date).toLocaleString() : '—');

export const byteLength = (text) => new TextEncoder().encode(text).length;

export const profileUrl = (userId) => `https://www.roblox.com/users/${userId}/profile`;

// A day as Discord writes "Member since": Jan 5, 2025
export const shortDate = (date) => (date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
