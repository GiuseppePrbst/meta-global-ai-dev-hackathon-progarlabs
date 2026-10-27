"use client";

export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="page-shell empty-state" role="alert"><h1>Esta vista no pudo cargarse</h1><p>Vuelve a intentarlo. Tus fotografías no se publican automáticamente.</p><button className="button" onClick={reset}>Reintentar</button></div>; }
