import type { SVGProps } from "react";

export function PatchCordIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" width={props.width ?? 20} height={props.height ?? 20} {...props} className={props.className}>
            <text
                x="12"
                y="16.5"
                textAnchor="middle"
                fill="currentColor"
                fontSize="14"
                fontWeight="700"
                fontFamily="gg sans, Noto Sans, Helvetica Neue, Helvetica, Arial, sans-serif"
            >
                PC
            </text>
        </svg>
    );
}

const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><text x='12' y='16.5' text-anchor='middle' fill='currentColor' font-size='14' font-weight='700' font-family='gg sans, Noto Sans, Helvetica Neue, Helvetica, Arial, sans-serif'>PC</text></svg>`;
export const PC_ICON_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export default PatchCordIcon;
