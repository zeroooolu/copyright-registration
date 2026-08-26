(()=>{
  const sidebar=document.querySelector('.sidebar'),topbar=document.querySelector('.topbar');
  if(!sidebar||!topbar)return;
  const active='copyright';
  const nav=[
    ['home','#','<path fill="currentColor" d="M3 10.6 12 3l9 7.6V21h-6v-6H9v6H3V10.6Z"/>','主页'],
    ['albums','#','<circle cx="12" cy="12" r="8.2" fill="currentColor"/><circle cx="12" cy="12" r="2.3" fill="#fff"/>','专辑列表'],
    ['video','#','<rect x="3.2" y="6.5" width="12.8" height="11" rx="1.5" fill="currentColor"/><path d="M16 9.7 21 7.4v9.2L16 14.3V9.7Z" fill="currentColor"/>','视频'],
    ['artist','#','<circle cx="9" cy="8" r="4" fill="currentColor"/><path d="M2.8 20c.4-4.1 2.7-6.2 6.2-6.2 3.4 0 5.8 2.1 6.2 6.2H2.8Z" fill="currentColor"/>','艺人'],
    ['promotion','#','<path d="M2.7 13.1c2.8-1.2 4.4-3.4 5.1-6.4 4.9-.3 8.7 1 11.5 4-1 4.7-4 7.6-8.9 8.8-2.8.7-5.3-.1-7.2-2.5 1.1-.9 1.8-2.2 2-3.8-.9.3-1.7.3-2.5-.1Z" fill="currentColor"/>','音乐推广'],
    ['copyright','index.html','<path d="M5 3h10l4 4v14H5V3Z" fill="currentColor"/><path d="M15 3v4h4M8 11h8M8 15h6" stroke="#fff" stroke-width="1.4"/><path d="m9 18 1.6 1.6L14 16.2" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>','著作权登记'],
    ['royalty','#','<rect x="4" y="3.5" width="16" height="17" rx="3" fill="currentColor"/><path d="M8.4 9.1h7.2M8.4 14.9h7.2M12 6.8v10.4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>','我的版税'],
    ['contract','#','<path d="M5 2.8h10l4 4V21H5V2.8Z" fill="currentColor"/><path d="M15 2.8v4h4M8 11h8M8 15h8" stroke="#fff" stroke-width="1.4"/>','我的合同'],
    ['analysis','#','<rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor"/><path d="M6.5 15.8 10 12.3l2.5 2.2 5-5" fill="none" stroke="#fff" stroke-width="1.6"/>','销售分析']
  ];
  sidebar.setAttribute('aria-label','星球发行主导航');
  sidebar.innerHTML=`<div class="brand"><div class="brand-logo"><img src="https://star.kanjian.com/app/release/images/star-logo.png" alt="星球发行"></div></div><nav class="nav">${nav.map(([id,href,icon,label])=>`<a class="nav-item${id===active?' active':''}" href="${href}"${id===active?' aria-current="page"':''}><svg class="nav-icon" viewBox="0 0 24 24">${icon}</svg><span class="nav-label">${label}</span></a>`).join('')}</nav>`;
  topbar.innerHTML=`<div class="topbar-actions"><a class="topbar-action" href="#"><svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9.8 9.2a2.4 2.4 0 1 1 4.6 1c-.35.8-1.1 1.2-1.7 1.7-.5.4-.7.9-.7 1.7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="17.1" r="1" fill="currentColor"/></svg><span>帮助中心</span></a><a class="topbar-action" href="#"><span>简体中文</span><svg class="caret" viewBox="0 0 12 12"><path d="m2 4 4 4 4-4H2Z" fill="currentColor"/></svg></a><a class="topbar-action" href="#"><span>环环</span><svg class="caret" viewBox="0 0 12 12"><path d="m2 4 4 4 4-4H2Z" fill="currentColor"/></svg></a></div>`;

  const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(file==='index.html'){
    const start=document.getElementById('continueBtn');
    if(start){
      start.addEventListener('click',()=>{
        if(start.disabled)return;
        const title=document.getElementById('selectedName')?.textContent?.trim()||'';
        const meta=document.getElementById('selectedArtist')?.textContent?.trim()||'';
        const parts=meta.split(' · ');
        const artist=parts[0]||'';
        const album=parts.slice(1).join(' · ');
        const cover=document.querySelector('#selectedSong .selected-cover')?.textContent?.trim()||title.slice(0,1);
        const p=new URLSearchParams({title,artist,album,cover});
        location.href='registration-step1.html?'+p.toString();
      });
    }
  }

  if(file==='registration-step1.html'){
    const next=document.getElementById('nextBtn');
    if(next){
      next.addEventListener('click',e=>{
        if(next.disabled)return;
        e.preventDefault();
        e.stopImmediatePropagation();
        const p=new URLSearchParams(location.search);
        const title=p.get('title')||document.getElementById('songName')?.textContent?.trim()||'晴天';
        const meta=document.getElementById('songMeta')?.textContent?.trim()||'';
        const parts=meta.split(' · ');
        const artist=p.get('artist')||parts[0]||'';
        const album=p.get('album')||parts.slice(1).join(' · ');
        const cover=p.get('cover')||document.getElementById('songCover')?.textContent?.trim()||title.slice(0,1);
        const types=[...document.querySelectorAll('.type-card.selected')].map(card=>card.dataset.type).filter(Boolean);
        const amount=(types.length*9.9).toFixed(1);
        const q=new URLSearchParams({title,artist,album,cover,types:types.join(','),amount});
        location.href='registration-step2.html?'+q.toString();
      },true);
    }
  }
})();
