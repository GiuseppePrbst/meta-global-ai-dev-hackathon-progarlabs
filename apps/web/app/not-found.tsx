import Link from "next/link";
export default function NotFound() { return <div className="page-shell empty-state"><p className="eyebrow">404 · FUERA DEL SENDERO</p><h1>Esta página no está aquí.</h1><Link href="/" className="button">Volver al inicio</Link></div>; }
