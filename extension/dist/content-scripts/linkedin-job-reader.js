function m(e){return(e||"").toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim()}function _(e){return m(e).split(" ").filter(t=>t.length>2)}function I(e,t){const n=e.length,o=t.length,s=Array.from({length:n+1},(i,r)=>Array.from({length:o+1},(l,a)=>r===0?a:a===0?r:0));for(let i=1;i<=n;i++)for(let r=1;r<=o;r++)s[i][r]=e[i-1]===t[r-1]?s[i-1][r-1]:1+Math.min(s[i-1][r],s[i][r-1],s[i-1][r-1]);return s[n][o]}function h(e,t){const n=m(e),o=m(t);if(o.includes(n))return!0;const s=n.split(" ");for(const i of s){if(i.length<3)continue;if(o.includes(i))return!0;const r=o.split(" ");for(const l of r)if(l.length>=3&&I(i,l)<=1)return!0}return!1}function T(e,t){const{title:n="",description:o="",snippet:s=""}=e,i=m([n,o,s].join(" ")),r=[];let l=0,a=!1;if(t.targetTitles&&t.targetTitles.length){for(const u of t.targetTitles)if(h(u,n)){a=!0,l=40;break}if(!a){const u=_(n);for(const z of t.targetTitles){const w=_(z),k=w.filter(E=>u.includes(E));k.length>0&&(l=Math.max(l,Math.round(k.length/w.length*25)))}}}let c=0;const p=t.targetDomains||[],d=p.filter(u=>h(u,i));p.length>0&&(c=Math.round(d.length/p.length*30),r.push(...d));let b=0;const f=[];if(t.skills)for(const u of Object.values(t.skills))Array.isArray(u)&&f.push(...u);const v=f.filter(u=>h(u,i));f.length>0&&(b=Math.round(v.length/f.length*30),r.push(...v));const B=Math.min(100,l+c+b),q=[...new Set(r)].slice(0,5);return{score:B,matchedKeywords:q,titleMatch:a}}const x="sextant-badge-root";function y(e){return new Promise(t=>{try{chrome.runtime.sendMessage(e,n=>{chrome.runtime.lastError?t(null):t(n)})}catch{t(null)}})}function M(e){return e>=70?"#22c55e":e>=40?"#eab308":"#ef4444"}function g(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function $(e,t){const n=M(e.score),o=e.matchedKeywords.length?e.matchedKeywords.map(s=>`<span class="kw">${g(s)}</span>`).join(""):'<span class="kw-none">No keywords matched</span>';return`
    <style>
      :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      #badge {
        position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;
        background: #fff; border-radius: 14px; box-shadow: 0 4px 24px rgba(0,0,0,0.15);
        padding: 14px 16px; min-width: 240px; max-width: 300px;
        border: 1.5px solid #e2e8f0;
      }
      #badge-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
      #score-ring {
        width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
        background: conic-gradient(${n} ${e.score*3.6}deg, #e2e8f0 0deg);
        display: flex; align-items: center; justify-content: center;
      }
      #score-inner {
        width: 36px; height: 36px; border-radius: 50%; background: #fff;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 13px; color: ${n};
      }
      #badge-title { font-size: 13px; font-weight: 600; color: #1e293b; line-height: 1.3; }
      #badge-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
      #keywords { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
      .kw { background: #f1f5f9; color: #475569; font-size: 11px; padding: 2px 7px; border-radius: 999px; }
      .kw-none { font-size: 11px; color: #94a3b8; }
      .btn {
        width: 100%; padding: 7px 0; border: none; border-radius: 8px;
        font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s;
        font-family: inherit; margin-top: 6px; display: block;
      }
      #save-btn { background: #1e3a5f; color: #fff; }
      #save-btn:hover { background: #2d5282; }
      #save-btn:disabled { background: #94a3b8; cursor: default; }
      #bullets-btn { background: #f1f5f9; color: #1e3a5f; border: 1.5px solid #1e3a5f; }
      #bullets-btn:hover { background: #e2e8f0; }
      #bullets-btn:disabled { opacity: 0.5; cursor: default; }
      #bullets-panel {
        margin-top: 10px; background: #f8fafc; border-radius: 8px; padding: 10px;
        border: 1.5px solid #e2e8f0; display: none;
      }
      #bullets-panel.open { display: block; }
      .bullet-item { font-size: 11px; color: #1e293b; padding: 5px 0; border-bottom: 1px solid #e2e8f0; line-height: 1.4; }
      .bullet-item:last-child { border-bottom: none; }
      .bullet-rationale { font-size: 10px; color: #64748b; margin-top: 2px; font-style: italic; }
      #close-btn {
        position: absolute; top: 8px; right: 10px; background: none; border: none;
        color: #94a3b8; cursor: pointer; font-size: 16px; line-height: 1; padding: 2px;
      }
      #close-btn:hover { color: #475569; }
      .err { font-size: 11px; color: #ef4444; margin-top: 4px; }
    </style>
    <div id="badge">
      <button id="close-btn" title="Close">×</button>
      <div id="badge-header">
        <div id="score-ring"><div id="score-inner">${e.score}</div></div>
        <div>
          <div id="badge-title">🧭 Sextant Match</div>
          <div id="badge-sub">${g(t.title||"Job Posting")}</div>
        </div>
      </div>
      <div id="keywords">${o}</div>
      <button id="save-btn" class="btn">Save to Pipeline</button>
      <button id="bullets-btn" class="btn">✨ Suggest bullets to lead with</button>
      <div id="bullets-panel"></div>
    </div>
  `}function C(e,t){if(document.getElementById(x))return;const n=document.createElement("div");n.id=x,document.body.appendChild(n);const o=n.attachShadow({mode:"closed"});o.innerHTML=$(e,t),o.getElementById("close-btn").addEventListener("click",()=>n.remove());let s=null;const i=o.getElementById("save-btn");i.addEventListener("click",async()=>{var c;i.disabled=!0,i.textContent="Saving…";const a=await y({type:"SAVE_JOB",job:{title:t.title,company:t.company,url:location.href,description:t.description,match_score:e.score,matched_skills:e.matchedKeywords,source:"linkedin"}});a!=null&&a.error?(i.disabled=!1,i.textContent="Save to Pipeline",o.getElementById("bullets-panel").innerHTML=`<div class="err">${g(a.error)}</div>`,o.getElementById("bullets-panel").classList.add("open")):(s=(c=a==null?void 0:a.job)==null?void 0:c.id,i.textContent="✓ Saved to Pipeline")});const r=o.getElementById("bullets-btn"),l=o.getElementById("bullets-panel");r.addEventListener("click",async()=>{if(l.classList.contains("open")&&l.dataset.loaded){l.classList.toggle("open");return}r.disabled=!0,r.textContent="Generating…";const a=s?{jobId:s}:{jobDescription:t.description},c=await y({type:"BULLET_SUGGESTIONS",payload:a});if(c!=null&&c.error)l.innerHTML=`<div class="err">Error: ${g(c.error)}</div>`;else{const p=(c==null?void 0:c.suggestedBullets)||[];p.length?(l.innerHTML=p.map(d=>{const b=typeof d=="string"?d:d.bullet,f=typeof d=="object"?d.rationale:"";return`<div class="bullet-item">• ${g(b)}${f?`<div class="bullet-rationale">↳ ${g(f)}</div>`:""}</div>`}).join(""),l.dataset.loaded="1"):l.innerHTML='<div class="err">No suggestions returned.</div>'}l.classList.add("open"),r.disabled=!1,r.textContent="✨ Suggest bullets to lead with"})}function A(e){const t=M(e),n=document.createElement("div"),o=n.attachShadow({mode:"closed"});return o.innerHTML=`
    <style>
      :host { display: inline-block; }
      #chip {
        display: inline-flex; align-items: center; gap: 4px;
        background: ${t}18; border: 1px solid ${t};
        border-radius: 999px; padding: 2px 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 11px; font-weight: 700; color: ${t}; white-space: nowrap;
      }
    </style>
    <span id="chip">🧭 ${e}</span>
  `,n}function S(e){document.querySelectorAll(".job-card-container:not([data-sextant-scored]), .jobs-search-results__list-item:not([data-sextant-scored])").forEach(n=>{var p,d,b;n.setAttribute("data-sextant-scored","1");const o=n.querySelector(".job-card-list__title, .job-card-container__link"),s=n.querySelector(".job-card-container__primary-description, .artdeco-entity-lockup__subtitle"),i=n.querySelector(".job-card-list__insight, .job-card-container__metadata-item"),r={title:((p=o==null?void 0:o.innerText)==null?void 0:p.trim())||"",company:((d=s==null?void 0:s.innerText)==null?void 0:d.trim())||"",description:"",snippet:((b=i==null?void 0:i.innerText)==null?void 0:b.trim())||""},l=T(r,e),a=A(l.score);(n.querySelector(".job-card-list__footer-wrapper, .job-card-container__footer-wrapper, .job-card-container__metadata-wrapper")||n).appendChild(a)})}function H(){var s,i,r,l;const e=document.querySelector(".job-details-jobs-unified-top-card__job-title h1")||document.querySelector(".job-details-jobs-unified-top-card__job-title")||document.querySelector("h1"),t=document.querySelector(".job-details-jobs-unified-top-card__company-name")||document.querySelector(".jobs-unified-top-card__company-name"),n=document.querySelector(".jobs-description__content")||document.querySelector(".jobs-box__html-content")||document.querySelector("#job-details"),o=document.querySelector(".job-details-jobs-unified-top-card__bullet");return{title:((s=e==null?void 0:e.innerText)==null?void 0:s.trim())||"",company:((i=t==null?void 0:t.innerText)==null?void 0:i.trim())||"",location:((r=o==null?void 0:o.innerText)==null?void 0:r.trim())||"",description:((l=n==null?void 0:n.innerText)==null?void 0:l.trim())||"",snippet:""}}async function L(){const e=await y({type:"GET_PROFILE"});if(!(e!=null&&e.profile))return;const t=e.profile;if(location.href.includes("/jobs/view/")){const n=()=>{const o=H();return!o.title&&!o.description?!1:(C(T(o,t),o),!0)};if(!n()){const o=new MutationObserver(()=>{n()&&o.disconnect()});o.observe(document.body,{childList:!0,subtree:!0}),setTimeout(()=>o.disconnect(),1e4)}}else{const n=document.querySelector(".jobs-search-results-list")||document.querySelector(".jobs-search__results-list")||document.body;S(t),new MutationObserver(()=>S(t)).observe(n,{childList:!0,subtree:!0})}}let j=location.href;new MutationObserver(()=>{var e;location.href!==j&&(j=location.href,(e=document.getElementById(x))==null||e.remove(),setTimeout(L,800))}).observe(document.body,{childList:!0,subtree:!0});L();
