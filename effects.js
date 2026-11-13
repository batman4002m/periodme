/* جلوه‌ی ستاره‌ها: تمام مدت پریود پس‌زمینه مشکی + باران ستاره‌ی رنگی می‌مونه؛
   با «اوکی شروع شد» هم یه انفجار رنگی اول کار اضافه می‌شه. بعد از پایان پریود همه چیز برمی‌گرده. */
(function(){
  const COLORS=['#ff6fa5','#ffd166','#7bdff2','#b388ff','#8affc1','#ff9e6d','#ffffff','#ff4d8d'];
  const GLYPHS=['★','✦','✧','✶','⋆','✹'];
  const AMBIENT_PER_SEC=5;     // ستاره‌ی جدید در ثانیه، تا وقتی پریودی
  const BURST_RAIN_PER_SEC=14; // ستاره‌ی جدید در ثانیه، بعد از انفجار اولیه (کوتاه)
  const BURST_RAIN_MS=3000;
  let canvas=null, ctx=null, parts=[], raf=0, lastT=0, ambient=false, burstEndAt=0, rainAcc=0;

  const rand=(a,b)=>a+Math.random()*(b-a);
  const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
  const reduceMotion=()=>!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);

  function resize(){
    const dpr=window.devicePixelRatio||1;
    canvas.width=Math.floor(innerWidth*dpr);
    canvas.height=Math.floor(innerHeight*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function ensureCanvas(){
    if(canvas) return true;
    if(!document.body) return false;
    canvas=document.createElement('canvas');
    canvas.id='fxCanvas';
    canvas.setAttribute('aria-hidden','true');
    document.body.appendChild(canvas);
    ctx=canvas.getContext('2d');
    resize();
    window.addEventListener('resize',resize);
    return true;
  }
  function burst(x,y,count){
    for(let i=0;i<count;i++){
      const a=rand(0,Math.PI*2), sp=rand(3,11);
      parts.push({kind:'burst',x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,g:0.13,
        size:rand(10,24),color:pick(COLORS),glyph:pick(GLYPHS),rot:rand(0,6.28),vr:rand(-.2,.2),
        life:1,decay:rand(.008,.016),tw:0});
    }
  }
  function rainStar(){
    parts.push({kind:'rain',x:rand(0,innerWidth),y:rand(-40,-10),vx:rand(-.4,.4),vy:rand(1.4,4.2),g:0,
      size:rand(9,22),color:pick(COLORS),glyph:pick(GLYPHS),rot:rand(0,6.28),vr:rand(-.03,.03),
      life:1,decay:0,tw:rand(0,6.28)});
  }
  function step(p,k){
    p.x+=p.vx*k; p.y+=p.vy*k;
    if(p.kind==='burst'){ p.vx*=Math.pow(.985,k); p.vy+=p.g*k; p.life-=p.decay*k; }
    p.rot+=p.vr*k; p.tw+=0.05*k;
  }
  function draw(p){
    const alpha=p.kind==='rain'?0.55+0.45*Math.sin(p.tw):Math.max(0,p.life);
    ctx.save();
    ctx.globalAlpha=Math.max(0,Math.min(1,alpha));
    ctx.translate(p.x,p.y);
    ctx.rotate(p.rot);
    ctx.font=`${p.size}px serif`;
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillStyle=p.color;
    ctx.shadowColor=p.color;
    ctx.shadowBlur=10;
    ctx.fillText(p.glyph,0,0);
    ctx.restore();
  }
  function frame(now){
    const W=innerWidth,H=innerHeight;
    const k=lastT?Math.min(now-lastT,50)/16.67:1;
    lastT=now;
    const bursting=now<burstEndAt;
    if(ambient||bursting){
      rainAcc+=(k*16.67/1000)*(bursting?BURST_RAIN_PER_SEC:AMBIENT_PER_SEC);
      while(rainAcc>=1){rainStar();rainAcc-=1;}
    }
    ctx.clearRect(0,0,W,H);
    parts=parts.filter(p=>{
      step(p,k);
      return p.life>0 && p.y<H+40 && p.x>-60 && p.x<W+60;
    });
    parts.forEach(draw);
    if(ambient||bursting||parts.length){
      raf=requestAnimationFrame(frame);
    }else{
      raf=0; lastT=0; rainAcc=0;
      ctx.clearRect(0,0,W,H);
    }
  }
  function kick(){
    if(!raf){ lastT=0; raf=requestAnimationFrame(frame); }
  }

  // حالت پریود: روشن = پس‌زمینه مشکی + باران ستاره تا وقتی پریود تموم نشده
  window.setStarMode=function(on){
    on=!!on && !reduceMotion();
    if(on){
      if(!ensureCanvas()) return;
      ambient=true;
      document.documentElement.classList.add('starry');
      kick();
    }else{
      ambient=false;
      burstEndAt=0;
      parts=[];
      if(ctx) ctx.clearRect(0,0,innerWidth,innerHeight);
      document.documentElement.classList.remove('starry');
    }
  };

  // «اوکی شروع شد»: انفجار رنگی + باران شدید کوتاه، و بعدش حالت پریود
  window.celebrateStars=function(){
    if(reduceMotion()) return;
    if(!ensureCanvas()) return;
    document.documentElement.classList.add('starry');
    const cx=innerWidth/2, cy=innerHeight*0.42;
    burst(cx,cy,140);
    setTimeout(()=>burst(innerWidth*0.22,innerHeight*0.6,60),260);
    setTimeout(()=>burst(innerWidth*0.78,innerHeight*0.55,60),460);
    burstEndAt=performance.now()+BURST_RAIN_MS;
    kick();
  };
})();
