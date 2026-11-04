// Uso (desde apps/mobile): node scripts/slice-wilo-greet.cjs assets/images/wilo/wilo-greet.png assets/images/wilo/greet
// pngjs llega como dependencia transitiva de Expo.
// Separa wilo-greet.png en capas articulables del mismo tamaño de lienzo (720×688).
const {Buffer}=require('buffer');
const {PNG}=require(process.cwd()+'/node_modules/pngjs');const fs=require('fs');
const [,,inp,outDir]=process.argv;
const src=PNG.sync.read(fs.readFileSync(inp));const W=src.width,H=src.height;
const inPoly=(poly,x,y)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const[xi,yi]=poly[i],[xj,yj]=poly[j];
 if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c};
const TAIL=[[0,120],[205,120],[205,295],[282,318],[262,352],[200,446],[170,492],[0,512]];
const TAIL_HIDDEN=[[0,120],[205,120],[205,305],[232,340],[176,440],[148,488],[0,508]]; // lo que el cuerpo no dibuja
const EAR=[[316,92],[352,78],[368,100],[368,152],[316,152]];
const EAR_HIDDEN=[[318,92],[350,80],[350,150],[318,150]];
const marks=(x,y)=>x>=604&&y<72;
const head=(x,y)=>x>=250&&!marks(x,y)&&!inPoly(EAR_HIDDEN,x,y)&&(x<335?y<285:y<262);
const bodyHiddenHead=(x,y)=>x>=250&&(x<335?y<285:x<628?y<228:y<250);
// Nariz: píxeles oscuros dentro de su caja, con los brillos interiores rellenados.
const NB={x0:546,y0:94,x1:609,y1:140};
const dark=new Uint8Array(W*H);
for(let y=NB.y0;y<=NB.y1;y++)for(let x=NB.x0;x<=NB.x1;x++){const i=(y*W+x)*4;if(src.data[i]+src.data[i+1]+src.data[i+2]<330&&src.data[i+3]>200)dark[y*W+x]=1}
const outside=new Uint8Array(W*H);const st=[];
for(let x=NB.x0;x<=NB.x1;x++){st.push([x,NB.y0],[x,NB.y1])}for(let y=NB.y0;y<=NB.y1;y++){st.push([NB.x0,y],[NB.x1,y])}
while(st.length){const[x,y]=st.pop();if(x<NB.x0||x>NB.x1||y<NB.y0||y>NB.y1)continue;const k=y*W+x;if(dark[k]||outside[k])continue;outside[k]=1;st.push([x+1,y],[x-1,y],[x,y+1],[x,y-1])}
const noseCore=(x,y)=>x>=NB.x0&&x<=NB.x1&&y>=NB.y0&&y<=NB.y1&&!outside[y*W+x];
const nose=(x,y)=>{for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(noseCore(x+dx,y+dy))return true;return false};
const layers={
 tail:(x,y)=>inPoly(TAIL,x,y),
 body:(x,y)=>!inPoly(TAIL_HIDDEN,x,y)&&!bodyHiddenHead(x,y),
 head, ear:(x,y)=>inPoly(EAR,x,y), nose, marks,
};
fs.mkdirSync(outDir,{recursive:true});
for(const[name,fn]of Object.entries(layers)){const o=new PNG({width:W,height:H});
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(fn(x,y)){const i=(y*W+x)*4;src.data.copy(o.data,i,i,i+4)}
 fs.writeFileSync(`${outDir}/${name}.png`,PNG.sync.write(o,{deflateLevel:9}));}
// Verificación: recompone y cuenta píxeles distintos del original.
const comp=Buffer.alloc(W*H*4);
for(const name of Object.keys(layers)){const l=PNG.sync.read(fs.readFileSync(`${outDir}/${name}.png`));
 for(let k=0;k<W*H;k++){const a=l.data[k*4+3]/255;if(!a)continue;for(let c=0;c<4;c++)comp[k*4+c]=c<3?Math.round(l.data[k*4+c]*a+comp[k*4+c]*(1-a)):Math.round(255*(a+comp[k*4+3]/255*(1-a)))}}
let diff=0,gap=0;for(let k=0;k<W*H;k++){const d=comp[k*4+3]-src.data[k*4+3];if(Math.abs(d)>8)diff++;if(d<-8){gap++;if(gap<5)console.log("hueco",k%W,Math.floor(k/W))}}console.log("huecos",gap);
console.log('píxeles con alfa distinto tras recomponer:',diff);
