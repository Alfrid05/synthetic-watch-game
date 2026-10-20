(() => {
  'use strict';
  const KEY = 'synthetic-move-session-v1';
  const SCORES_KEY = 'synthetic-move-scores-v1';
  const $ = id => document.getElementById(id);
  const canvas = $('chart');
  const context = canvas.getContext('2d');
  const FREEZE = 77, RELEASE = 80, FINAL = 94;
  let offset = 0;
  let hover = null;
  let storageAvailable = true;
  const now = () => Date.now() + offset;

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { storageAvailable = false; return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { storageAvailable = false; }
  }
  let scores = read(SCORES_KEY, []);
  if (!Array.isArray(scores)) scores = [];
  scores = scores.filter(x => x && Number.isFinite(x.score) && Number.isFinite(x.attempts) && Number.isFinite(x.at));
  let session = read(KEY, null);
  if (!session || session.version !== 1 || !['home','replay','choose','reveal','result','finish','board'].includes(session.phase)
      || !Array.isArray(session.rounds) || session.rounds.length !== 5
      || session.rounds.some(r => !r || !Array.isArray(r.prices) || r.prices.length !== 160 || r.prices.some(p => !Number.isFinite(p)))) session = null;
  const persist = () => { if (session) write(KEY, session); };

  function randomGenerator(seed) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function makeRounds() {
    const seed = window.crypto?.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : Math.floor(Math.random() * 4294967296);
    const random = randomGenerator(seed);
    const assets = ['Rates','FX','Fixed Income','Energy'];
    for (let i = assets.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [assets[i], assets[j]] = [assets[j], assets[i]]; }
    assets.push(assets[Math.floor(random() * 4)]);
    const releases = ['Demo inflation report','Demo jobs report','Demo growth report','Demo supply report','Demo activity report'];
    const currencies = ['GBP','EUR','JPY','USD','AUD'];
    return assets.map((asset, n) => {
      const base = asset === 'FX' ? 1.25 : asset === 'Rates' ? 4 : 100;
      const amplitude = base * 0.003;
      const sign = random() < .5 ? -1 : 1;
      const phase = random() * Math.PI * 2;
      const prices = Array.from({length:160}, (_, i) => Number((base + amplitude * Math.sin(i / 9 + phase)
        + amplitude * .3 * Math.sin(i / 2.8) + (i >= RELEASE ? sign * amplitude * .35 * (i - RELEASE) : 0)).toFixed(6)));
      return { asset, currency:currencies[n], title:releases[n], prices, forecast:'2.0%', previous:'1.9%', actual:sign > 0 ? '2.3%' : '1.7%' };
    });
  }
  function startGame() {
    session = {version:1, id:String(Date.now()) + '-' + Math.random().toString(36).slice(2), phase:'replay', index:0,
      rounds:makeRounds(), score:0, attempts:0, skipped:0, startedAt:now(), chooseDeadline:now()+33000,
      prediction:null, revealAt:null, correct:null, saved:false};
    persist(); render();
  }
  function tick() {
    if (!session) return;
    const t = now();
    if (session.phase === 'replay' && t >= session.startedAt + 3000) { session.phase = 'choose'; persist(); }
    if (session.phase === 'choose' && t >= session.chooseDeadline) {
      session.phase = 'result'; session.prediction = null; session.correct = null; session.skipped++; persist();
      announce('Time expired. Round skipped without adding an attempt.');
    }
    if (session.phase === 'reveal' && t >= session.revealAt + 7250) {
      session.phase = 'result'; persist(); announce(session.correct ? 'Correct. One point.' : 'Incorrect. No point.');
    }
  }
  function predict(direction) {
    tick();
    if (session?.phase !== 'choose') return;
    const prices = session.rounds[session.index].prices;
    session.prediction = direction;
    session.correct = direction === (prices[FINAL] > prices[FREEZE] ? 'UP' : 'DOWN');
    session.score += Number(session.correct); session.attempts++;
    session.revealAt = now(); session.phase = 'reveal'; persist(); render();
  }
  function nextRound() {
    if (session?.phase !== 'result') return;
    if (session.index === 4) {
      session.phase = 'finish';
      if (!session.saved) {
        if (!scores.some(x => x.id === session.id)) scores.push({id:session.id, score:session.score, attempts:session.attempts, skipped:session.skipped, at:now()});
        scores.sort((a,b) => b.score-a.score || (b.attempts ? b.score/b.attempts : 0)-(a.attempts ? a.score/a.attempts : 0) || a.at-b.at);
        scores = scores.slice(0,10); write(SCORES_KEY,scores); session.saved = true;
      }
    } else {
      session.index++; session.phase='replay'; session.startedAt=now(); session.chooseDeadline=now()+33000;
      session.prediction=null; session.correct=null; session.revealAt=null;
    }
    hover=null; persist(); render();
  }
  function visibleTick() {
    if (!session) return 0;
    if (session.phase === 'replay') return Math.min(FREEZE,Math.floor((now()-session.startedAt)/3000*FREEZE));
    if (session.phase === 'choose' || session.phase === 'result' && !session.prediction) return FREEZE;
    if (session.phase === 'reveal') {
      const elapsed=Math.max(0,now()-session.revealAt);
      return elapsed < 2250 ? FREEZE + Math.min(5,Math.floor(elapsed/450)) : Math.min(FINAL,82+Math.floor((elapsed-2250)/5000*12));
    }
    return FINAL;
  }
  function announce(text) { $('announcement').textContent=text; }
  function showBoard() { if (session) { session.returnPhase=session.phase;session.phase='board';persist(); } else session={version:1,phase:'board',rounds:makeRounds(),returnPhase:'home'}; render(); }
  function renderBoard() {
    $('score-list').replaceChildren();
    scores.forEach((entry, index) => {
      const item=document.createElement('li'), label=document.createElement('span'), points=document.createElement('b');
      label.textContent=`#${index+1} / ${new Date(entry.at).toLocaleDateString(undefined,{month:'short',day:'numeric'})}`;
      points.textContent=`${entry.score}/5`;item.append(label,points);$('score-list').append(item);
    });
    $('no-scores').hidden=scores.length>0;
  }
  function render() {
    tick();
    const phase=session?.phase || 'home';
    for (const screen of ['home','game','finish','board']) $(screen).hidden=screen!==(phase==='board'?'board':phase==='finish'?'finish':['replay','choose','reveal','result'].includes(phase)?'game':'home');
    if (phase==='board') { renderBoard(); return; }
    if (phase==='finish') {
      $('final-score').textContent=`${session.score} / 5`;
      $('final-detail').textContent=`${session.attempts ? Math.round(session.score/session.attempts*100) : 0}% accuracy / ${session.skipped} skipped.`;
      return;
    }
    if ($('game').hidden) return;
    const round=session.rounds[session.index], idx=visibleTick();
    $('round-label').textContent=`ROUND ${session.index+1} / 5`;
    $('score-label').textContent=`${session.score} POINT${session.score===1?'':'S'}`;
    $('market').textContent=`${round.asset} / ${round.currency} / SYNTHETIC`;
    $('headline').textContent=round.title;
    $('forecast').textContent=round.forecast;$('previous').textContent=round.previous;
    $('actual').textContent=idx>=RELEASE?round.actual:'--';
    $('up').disabled=$('down').disabled=phase!=='choose';
    $('calls').hidden=phase==='result';$('result').hidden=phase!=='result';
    $('status').textContent=phase==='replay'?'Watch the run-up':phase==='choose'?'Which way next?':phase==='reveal'?`Your call: ${session.prediction}`:'Round settled';
    $('timer').textContent=phase==='replay'?`${Math.max(0,Math.ceil((session.startedAt+3000-now())/1000))}s`:phase==='choose'?`${Math.max(0,Math.ceil((session.chooseDeadline-now())/1000))}s`:'';
    $('chart-status').textContent=phase==='choose'?'TAPE FROZEN':idx>=RELEASE?'RELEASE':'REPLAY';
    if (phase==='result') {
      const direction=round.prices[FINAL]>round.prices[FREEZE]?'UP':'DOWN';
      $('result-text').textContent=!session.prediction?'Time expired. Unscored skip.':session.correct?`Correct! ${direction} / +1 point`:`Market moved ${direction}. +0 points`;
      $('next').textContent=session.index===4?'See my score':'Next round';
    }
    draw(idx);
  }
  function draw(idx) {
    const bounds=canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const dpr=Math.min(window.devicePixelRatio || 1,2);
    if (canvas.width!==Math.round(bounds.width*dpr) || canvas.height!==Math.round(bounds.height*dpr)) { canvas.width=Math.round(bounds.width*dpr);canvas.height=Math.round(bounds.height*dpr); }
    context.setTransform(dpr,0,0,dpr,0,0);
    const w=bounds.width,h=bounds.height, small=w<341, left=small?24:48,right=small?10:50,top=small?16:30,bottom=small?15:28;
    context.clearRect(0,0,w,h);
    const prices=session.rounds[session.index].prices;
    const visible=prices.slice(0,idx+1);
    let min=Math.min(...visible),max=Math.max(...visible);
    const pad=Math.max((max-min)*.2,Math.abs(prices[0])*.0008);
    min-=pad;max+=pad;
    const x=i=>left+i/FINAL*(w-left-right), y=p=>top+(max-p)/(max-min)*(h-top-bottom);
    context.strokeStyle='#dfe5e8';context.lineWidth=1;
    for (let i=0;i<4;i++) { const gy=top+i/3*(h-top-bottom);context.beginPath();context.moveTo(left,gy);context.lineTo(w-right,gy);context.stroke(); }
    context.font=`${small?7:10}px monospace`;context.fillStyle='#687585';
    context.fillText(max.toFixed(small?2:4),2,top+3);context.fillText(min.toFixed(small?2:4),2,h-bottom);
    context.fillText('11:45',left,h-3);context.fillText('12:00 UTC',Math.min(x(RELEASE)-20,w-60),h-3);
    context.save();context.strokeStyle='#c5982c';context.setLineDash([3,4]);context.beginPath();context.moveTo(x(RELEASE),top);context.lineTo(x(RELEASE),h-bottom);context.stroke();context.restore();
    const path=(start,end,color)=> { context.strokeStyle=color;context.lineWidth=small?1.8:2.5;context.lineJoin='round';context.beginPath();for(let i=start;i<=end;i++) { if(i===start)context.moveTo(x(i),y(prices[i]));else context.lineTo(x(i),y(prices[i])); }context.stroke(); };
    path(0,Math.min(idx,FREEZE),'#c5982c');
    if(idx>FREEZE)path(FREEZE,idx,prices[idx]>prices[FREEZE]?'#197d50':'#c13e3a');
    context.fillStyle=idx>FREEZE?(prices[idx]>prices[FREEZE]?'#197d50':'#c13e3a'):'#c5982c';context.beginPath();context.arc(x(idx),y(prices[idx]),small?2:4,0,Math.PI*2);context.fill();
    if(hover!==null) {
      const i=Math.min(idx,Math.max(0,Math.round((hover-left)/(w-left-right)*FINAL)));
      context.strokeStyle='#06396a77';context.setLineDash([2,2]);context.beginPath();context.moveTo(x(i),top);context.lineTo(x(i),h-bottom);context.moveTo(left,y(prices[i]));context.lineTo(w-right,y(prices[i]));context.stroke();context.setLineDash([]);
      const seconds=Math.round(i/159*1800), label=`${String(11+Math.floor((2700+seconds)/3600)).padStart(2,'0')}:${String(Math.floor((2700+seconds)%3600/60)).padStart(2,'0')} UTC  ${prices[i].toFixed(4)}`;
      context.fillStyle='#061b32';context.fillText(label,left,Math.max(9,top-6));
    }
  }
  $('start').onclick=startGame;$('again').onclick=startGame;
  $('up').onclick=()=>predict('UP');$('down').onclick=()=>predict('DOWN');$('next').onclick=nextRound;
  $('scores').onclick=$('finish-scores').onclick=showBoard;
  $('back').onclick=()=>{session.phase=session.returnPhase || 'home';persist();render();};
  $('clear').onclick=()=>{if(confirm('Delete scores saved on this device?')){scores=[];write(SCORES_KEY,scores);renderBoard();}};
  canvas.onpointermove=event=>{hover=event.clientX-canvas.getBoundingClientRect().left;};canvas.onpointerleave=()=>{hover=null;};
  window.onresize=render;
  window.render_game_to_text=()=>JSON.stringify({screen:$('game').hidden?(session?.phase || 'home'):'game',phase:session?.phase || 'home',round:(session?.index ?? -1)+1,score:session?.score || 0,attempts:session?.attempts || 0,skipped:session?.skipped || 0,
    visibleTick:session?visibleTick():0,freezeIdx:FREEZE,releaseIdx:RELEASE,scoringIdx:FINAL,actualVisible:session?visibleTick()>=RELEASE:false,prediction:session?.prediction || null,correct:session?.correct ?? null,synthetic:true,storageAvailable,
    decisionDeadline:session?.chooseDeadline || null,chartCoordinates:'origin top-left; time increases right, price increases up'});
  window.advanceTime=ms=>{offset+=Math.max(0,Number(ms)||0);render();};
  function frame(){render();requestAnimationFrame(frame);}frame();
})();
