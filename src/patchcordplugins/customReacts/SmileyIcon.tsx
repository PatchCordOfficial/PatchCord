/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { SVGProps } from "react";

function SmileyIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" {...props}>
            <path fill="currentColor" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-2 6a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm4 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-5.894 7.803c1.11 1.737 3.176 2.697 3.894 2.697s2.785-.96 3.894-2.697a.875.875 0 1 0-1.456-.97c-.79 1.237-1.924 1.917-2.438 1.917s-1.647-.68-2.438-1.917a.875.875 0 1 0-1.456.97z" />
        </svg>
    );
}

export default SmileyIcon;
