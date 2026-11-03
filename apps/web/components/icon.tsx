const paths = {
  leaf: "M20 4C10 3 3 8 4 15c.6 4.2 5 6 8 4 5-3 7-8 8-15ZM4 21 15 10",
  map: "m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16",
  camera: "M4 6h4l2-3h4l2 3h4v14H4V6Zm12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  layers: "m12 3 10 6-10 6L2 9l10-6ZM2 14l10 6 10-6M2 18l10 6 10-6",
  tree: "m12 2 7 8h-4l6 7h-8v5h-2v-5H3l6-7H5l7-8Z",
  plus: "M12 5v14M5 12h14",
};

export function Icon({ name, className = "" }: { name: keyof typeof paths; className?: string }) {
  return <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
