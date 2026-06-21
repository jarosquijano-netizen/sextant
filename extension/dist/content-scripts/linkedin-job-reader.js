;(function(){
function g(e){return(e||"").toLowerCase().replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim()}function k(e){return g(e).split(" ").filter(n=>n.length>2)}function I(e,n){const t=e.length,o=n.length,s=Array.from({length:t+1},(i,r)=>Array.from({length:o+1},(a,l)=>r===0?l:l===0?r:0));for(let i=1;i<=t;i++)for(let r=1;r<=o;r++)s[i][r]=e[i-1]===n[r-1]?s[i-1][r-1]:1+Math.min(s[i-1][r],s[i][r-1],s[i-1][r-1]);return s[t][o]}function y(e,n){const t=g(e),o=g(n);if(o.includes(t))return!0;const s=t.split(" ");for(const i of s){if(i.length<3)continue;if(o.includes(i))return!0;const r=o.split(" ");for(const a of r)if(a.length>=3&&I(i,a)<=1)return!0}return!1}function T(e,n){const{title:t="",description:o="",snippet:s=""}=e,i=g([t,o,s].join(" ")),r=[];let a=0,l=!1;if(n.targetTitles&&n.targetTitles.length){for(const u of n.targetTitles)if(y(u,t)){l=!0,a=40;break}if(!l){const u=k(t);for(const E of n.targetTitles){const w=k(E),S=w.filter(z=>u.includes(z));S.length>0&&(a=Math.max(a,Math.round(S.length/w.length*25)))}}}let c=0;const p=n.targetDomains||[],d=p.filter(u=>y(u,i));p.length>0&&(c=Math.round(d.length/p.length*30),r.push(...d));let b=0;const f=[];if(n.skills)for(const u of Object.values(n.skills))Array.isArray(u)&&f.push(...u);const v=f.filter(u=>y(u,i));f.length>0&&(b=Math.round(v.length/f.length*30),r.push(...v));const L=Math.min(100,a+c+b),B=[...new Set(r)].slice(0,5);return{score:L,matchedKeywords:B,titleMatch:l}}const x="sextant-badge-root";function h(e){return new Promise(n=>{const t=setTimeout(()=>n(null),5e3);try{chrome.runtime.sendMessage(e,o=>{clearTimeout(t),chrome.runtime.lastError?n(null):n(o)})}catch{clearTimeout(t),n(null)}})}function q(e){return e>=70?"#22c55e":e>=40?"#eab308":"#ef4444"}function m(e){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function $(e,n){const t=q(e.score),o=e.matchedKeywords.length?e.matchedKeywords.map(s=>`<span class="kw">${m(s)}</span>`).join(""):'<span class="kw-none">No keywords matched</span>';return`
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
        background: conic-gradient(${t} ${e.score*3.6}deg, #e2e8f0 0deg);
        display: flex; align-items: center; justify-content: center;
      }
      #score-inner {
        width: 36px; height: 36px; border-radius: 50%; background: #fff;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 13px; color: ${t};
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
          <div id="badge-sub">${m(n.title||"Job Posting")}</div>
        </div>
      </div>
      <div id="keywords">${o}</div>
      <button id="save-btn" class="btn">Save to Pipeline</button>
      <button id="bullets-btn" class="btn">✨ Suggest bullets to lead with</button>
      <div id="bullets-panel"></div>
    </div>
  `}function C(e,n){if(document.getElementById(x))return;const t=document.createElement("div");t.id=x,document.body.appendChild(t);const o=t.attachShadow({mode:"closed"});o.innerHTML=$(e,n),o.getElementById("close-btn").addEventListener("click",()=>t.remove());let s=null;const i=o.getElementById("save-btn");i.addEventListener("click",async()=>{var c;i.disabled=!0,i.textContent="Saving…";const l=await h({type:"SAVE_JOB",job:{title:n.title,company:n.company,url:location.href,description:n.description,match_score:e.score,matched_skills:e.matchedKeywords,source:"linkedin"}});l!=null&&l.error?(i.disabled=!1,i.textContent="Save to Pipeline",o.getElementById("bullets-panel").innerHTML=`<div class="err">${m(l.error)}</div>`,o.getElementById("bullets-panel").classList.add("open")):(s=(c=l==null?void 0:l.job)==null?void 0:c.id,i.textContent="✓ Saved to Pipeline")});const r=o.getElementById("bullets-btn"),a=o.getElementById("bullets-panel");r.addEventListener("click",async()=>{if(a.classList.contains("open")&&a.dataset.loaded){a.classList.toggle("open");return}r.disabled=!0,r.textContent="Generating…";const l=s?{jobId:s}:{jobDescription:n.description},c=await h({type:"BULLET_SUGGESTIONS",payload:l});if(c!=null&&c.error)a.innerHTML=`<div class="err">Error: ${m(c.error)}</div>`;else{const p=(c==null?void 0:c.suggestedBullets)||[];p.length?(a.innerHTML=p.map(d=>{const b=typeof d=="string"?d:d.bullet,f=typeof d=="object"?d.rationale:"";return`<div class="bullet-item">• ${m(b)}${f?`<div class="bullet-rationale">↳ ${m(f)}</div>`:""}</div>`}).join(""),a.dataset.loaded="1"):a.innerHTML='<div class="err">No suggestions returned.</div>'}a.classList.add("open"),r.disabled=!1,r.textContent="✨ Suggest bullets to lead with"})}function P(e){const n=q(e),t=document.createElement("div"),o=t.attachShadow({mode:"closed"});return o.innerHTML=`
    <style>
      :host { display: inline-block; }
      #chip {
        display: inline-flex; align-items: center; gap: 4px;
        background: ${n}18; border: 1px solid ${n};
        border-radius: 999px; padding: 2px 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 11px; font-weight: 700; color: ${n}; white-space: nowrap;
      }
    </style>
    <span id="chip">🧭 ${e}</span>
  `,t}function j(e){document.querySelectorAll([".job-card-container:not([data-sextant-scored])",".jobs-search-results__list-item:not([data-sextant-scored])","[data-job-id]:not([data-sextant-scored])",'li[class*="jobs-search"]:not([data-sextant-scored])'].join(", ")).forEach(t=>{var p,d,b;t.setAttribute("data-sextant-scored","1");const o=t.querySelector('.job-card-list__title, .job-card-container__link, [class*="job-card"][class*="title"], a[href*="/jobs/view/"]'),s=t.querySelector('.job-card-container__primary-description, .artdeco-entity-lockup__subtitle, [class*="primary-description"], [class*="company-name"]'),i=t.querySelector('.job-card-list__insight, .job-card-container__metadata-item, [class*="insight"], [class*="metadata-item"]'),r={title:((p=o==null?void 0:o.innerText)==null?void 0:p.trim())||"",company:((d=s==null?void 0:s.innerText)==null?void 0:d.trim())||"",description:"",snippet:((b=i==null?void 0:i.innerText)==null?void 0:b.trim())||""},a=T(r,e),l=P(a.score);(t.querySelector(".job-card-list__footer-wrapper, .job-card-container__footer-wrapper, .job-card-container__metadata-wrapper")||t).appendChild(l)})}function A(){var s,i,r,a;const e=document.querySelector(".job-details-jobs-unified-top-card__job-title h1")||document.querySelector(".job-details-jobs-unified-top-card__job-title")||document.querySelector('[class*="top-card"][class*="job-title"]')||document.querySelector("h1.t-24")||document.querySelector("h1"),n=document.querySelector(".job-details-jobs-unified-top-card__company-name")||document.querySelector(".jobs-unified-top-card__company-name")||document.querySelector('[class*="top-card"][class*="company-name"]')||document.querySelector('[class*="company-name"] a'),t=document.querySelector(".jobs-description__content")||document.querySelector(".jobs-box__html-content")||document.querySelector("#job-details")||document.querySelector('[class*="jobs-description"]')||document.querySelector('[id*="job-details"]'),o=document.querySelector(".job-details-jobs-unified-top-card__bullet")||document.querySelector('[class*="top-card"][class*="bullet"]');return{title:((s=e==null?void 0:e.innerText)==null?void 0:s.trim())||"",company:((i=n==null?void 0:n.innerText)==null?void 0:i.trim())||"",location:((r=o==null?void 0:o.innerText)==null?void 0:r.trim())||"",description:((a=t==null?void 0:t.innerText)==null?void 0:a.trim())||"",snippet:""}}async function M(){let e=await h({type:"GET_PROFILE"});if(e!=null&&e.profile||(await new Promise(t=>setTimeout(t,1500)),e=await h({type:"GET_PROFILE"})),!(e!=null&&e.profile))return;const n=e.profile;if(location.href.includes("/jobs/view/")){const t=()=>{const o=A();return!o.title&&!o.description?!1:(C(T(o,n),o),!0)};if(!t()){const o=new MutationObserver(()=>{t()&&o.disconnect()});o.observe(document.body,{childList:!0,subtree:!0}),setTimeout(()=>o.disconnect(),1e4)}}else{const t=document.querySelector(".jobs-search-results-list")||document.querySelector(".jobs-search__results-list")||document.body;j(n),new MutationObserver(()=>j(n)).observe(t,{childList:!0,subtree:!0})}}let _=location.href;new MutationObserver(()=>{var e;location.href!==_&&(_=location.href,(e=document.getElementById(x))==null||e.remove(),setTimeout(M,800))}).observe(document.body,{childList:!0,subtree:!0});M();

})();
