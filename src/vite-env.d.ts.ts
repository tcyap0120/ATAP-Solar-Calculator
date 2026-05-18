/// <reference types="vite/client" />

declare module 'html2canvas' {
    export default function html2canvas(element: HTMLElement, options?: any): Promise<HTMLCanvasElement>;
}