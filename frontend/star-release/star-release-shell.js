(()=>{
  const sidebar=document.querySelector('.sidebar'),topbar=document.querySelector('.topbar');
  if(!sidebar||!topbar)return;

  const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const currentParams=new URLSearchParams(location.search);
  const isOuterPaymentPage=file==='payment-center-checkout.html'||file==='payment-success.html';
  const copyrightHome=isOuterPaymentPage?'star-release/index.html':'index.html';
  const active='copyright';
  const escapeHTML=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const registrationLabel=type=>type==='composition'?'登记词曲的著作权':'登记录音的著作权';
  const url=(target,params=currentParams)=>{const q=params.toString();return target+(q?'?'+q:'')};
  const registrationParams=()=>{
    const keys=['title','artist','album','cover','types','amount','submission_no'];
    const q=new URLSearchParams();
    keys.forEach(key=>{const value=currentParams.get(key);if(value!==null&&value!=='')q.set(key,value)});
    return q;
  };
  const applicationParams=(statusValue)=>{
    const q=new URLSearchParams();
    const keys=['title','artist','album','cover','type','app_no','submission_no','order_no','submission_count','order_total','balance_deduct','paid_amount','paired','sibling_type','sibling_app_no','sibling_status'];
    keys.forEach(key=>{const value=currentParams.get(key);if(value!==null&&value!=='')q.set(key,value)});
    q.set('status',statusValue||currentParams.get('status')||'pending_supplement');
    return q;
  };
  const detailUrl=statusValue=>url('registration-detail.html',applicationParams(statusValue));
  const supplementEditUrl=()=>{
    const q=applicationParams('pending_supplement');
    q.delete('status');
    q.set('supplement','1');
    q.set('types',currentParams.get('type')||'recording');
    q.set('amount','9.9');
    return 'registration-step1.html?'+q.toString();
  };
  const step3FromPayment=()=>{
    const q=new URLSearchParams();
    ['title','artist','album','cover','types','submission_no'].forEach(key=>{const value=currentParams.get(key);if(value!==null&&value!=='')q.set(key,value)});
    const total=currentParams.get('order_total');
    if(total)q.set('amount',total);
    return 'star-release/registration-step3.html'+(q.toString()?'?'+q.toString():'');
  };
  const successRecordsUrl=(viewRecords=true)=>{
    const title=currentParams.get('title')||'晴天';
    const artist=currentParams.get('artist')||'周杰伦';
    const album=currentParams.get('album')||'叶惠美';
    const cover=currentParams.get('cover')||title.slice(0,1);
    const types=(currentParams.get('types')||'recording').split(',').filter(Boolean);
    const total=Number(currentParams.get('order_total')||types.length*9.9||9.9);
    const deduct=Number(currentParams.get('balance_deduct')||0);
    const paid=Number(currentParams.get('paid_amount')||Math.max(0,total-deduct));
    const submissionNo=currentParams.get('submission_no')||'CRSUB202608260001';
    const orderNo=currentParams.get('order_no')||'CRPAY202608260001';
    const appNos=types.map((type,index)=>'CR20260826'+String(index+1).padStart(4,'0'));
    const q=new URLSearchParams({
      payment:'success',title,artist,album,cover,types:types.join(','),app_nos:appNos.join(','),
      submission_no:submissionNo,order_no:orderNo,order_total:total.toFixed(1),
      balance_deduct:deduct.toFixed(1),paid_amount:paid.toFixed(1),submitted_at:'2026-08-26 14:38'
    });
    if(viewRecords)q.set('view','records');
    return 'star-release/index.html?'+q.toString();
  };

  const addDemoStyles=()=>{
    if(document.getElementById('registrationDemoStyles'))return;
    const style=document.createElement('style');
    style.id='registrationDemoStyles';
    style.textContent=`
      .supplement-edit-banner{display:flex;align-items:flex-start;gap:12px;margin:0 0 16px;padding:14px 16px;border:1px solid #f0d39c;border-radius:6px;background:#fff9ed;color:#745d31;line-height:1.65}
      .supplement-edit-badge{display:inline-flex;align-items:center;justify-content:center;min-width:54px;height:25px;padding:0 9px;border-radius:999px;background:#fff0c9;color:#c17808;font-size:11px;font-weight:600;flex:none}
      .supplement-edit-copy{font-size:12px}.supplement-edit-copy strong{display:block;margin-bottom:3px;color:#694f20;font-size:13px}.supplement-edit-copy span{color:#8b754b}.supplement-edit-requirement{margin-top:6px;color:#7e632e;font-weight:500}
      .supplement-submit-banner{margin:0 0 16px;padding:12px 15px;border:1px solid #cfe7db;border-radius:6px;background:#f3fbf7;color:#4e735f;font-size:12px;line-height:1.6}.supplement-submit-banner strong{color:#2f6049}
      .demo-preview-mask{position:fixed;inset:0;z-index:300;display:none;align-items:center;justify-content:center;padding:36px;background:rgba(20,24,32,.58)}.demo-preview-mask.show{display:flex}
      .demo-preview-dialog{width:min(760px,82vw);max-height:86vh;overflow:hidden;border-radius:8px;background:#fff;box-shadow:0 24px 80px rgba(0,0,0,.28)}
      .demo-preview-head{height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;border-bottom:1px solid #e8ebef;color:#30343a;font-size:14px;font-weight:600}
      .demo-preview-close{width:32px;height:32px;border:0;border-radius:4px;background:transparent;color:#808791;font-size:22px;line-height:1}.demo-preview-close:hover{background:#f3f4f6;color:#333}
      .demo-preview-body{max-height:calc(86vh - 54px);overflow:auto;padding:24px;background:#f4f5f7;text-align:center}.demo-preview-body img{display:block;max-width:100%;margin:0 auto;background:#fff;box-shadow:0 2px 14px rgba(31,35,48,.12)}
    `;
    document.head.appendChild(style);
  };
  const ensurePreviewModal=()=>{
    let mask=document.getElementById('registrationDemoPreview');
    if(mask)return mask;
    addDemoStyles();
    mask=document.createElement('div');
    mask.id='registrationDemoPreview';
    mask.className='demo-preview-mask';
    mask.innerHTML='<div class="demo-preview-dialog" role="dialog" aria-modal="true"><div class="demo-preview-head"><span id="registrationDemoPreviewTitle">图片预览</span><button class="demo-preview-close" type="button" aria-label="关闭">×</button></div><div class="demo-preview-body"><img id="registrationDemoPreviewImage" alt="预览图片"></div></div>';
    document.body.appendChild(mask);
    const close=()=>mask.classList.remove('show');
    mask.querySelector('.demo-preview-close').onclick=close;
    mask.addEventListener('click',e=>{if(e.target===mask)close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
    return mask;
  };
  const openDemoImage=label=>{
    const mask=ensurePreviewModal();
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1180" viewBox="0 0 900 1180"><rect width="900" height="1180" fill="#fff"/><rect x="48" y="48" width="804" height="1084" rx="8" fill="none" stroke="#d9dde5" stroke-width="2"/><text x="450" y="210" text-anchor="middle" font-size="38" font-family="Arial,sans-serif" fill="#30343a">Business License</text><text x="450" y="268" text-anchor="middle" font-size="22" font-family="Arial,sans-serif" fill="#8a919c">Copyright Registration Demo</text><rect x="130" y="350" width="640" height="54" rx="4" fill="#f5f6f8"/><rect x="130" y="430" width="640" height="54" rx="4" fill="#f5f6f8"/><rect x="130" y="510" width="640" height="54" rx="4" fill="#f5f6f8"/><rect x="130" y="590" width="420" height="54" rx="4" fill="#f5f6f8"/><circle cx="682" cy="850" r="92" fill="none" stroke="#d25a5a" stroke-width="8" opacity=".55"/><text x="682" y="860" text-anchor="middle" font-size="24" font-family="Arial,sans-serif" fill="#d25a5a" opacity=".72">DEMO</text></svg>`;
    mask.querySelector('#registrationDemoPreviewTitle').textContent=label||'营业执照.jpg';
    mask.querySelector('#registrationDemoPreviewImage').src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
    mask.classList.add('show');
  };
  const makeDemoPdfBlob=(label='Copyright Registration Document')=>{
    const safe=String(label).replace(/[()\\]/g,' ').replace(/[^\x20-\x7E]/g,' ');
    const stream=`BT\n/F1 20 Tf\n72 720 Td\n(Copyright Registration Demo PDF) Tj\n0 -34 Td\n/F1 12 Tf\n(${safe}) Tj\n0 -28 Td\n(This file is reserved for browser PDF preview in the prototype.) Tj\nET`;
    const objects=[
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n',
      `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
    ];
    let pdf='%PDF-1.4\n',offsets=[0];
    objects.forEach(obj=>{offsets.push(pdf.length);pdf+=obj});
    const xref=pdf.length;
    pdf+='xref\n0 6\n0000000000 65535 f \n';
    for(let i=1;i<=5;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
    pdf+=`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new Blob([pdf],{type:'application/pdf'});
  };
  const openDemoPdf=label=>{
    const blob=makeDemoPdfBlob(label);
    const href=URL.createObjectURL(blob);
    const win=window.open(href,'_blank','noopener');
    if(!win)location.href=href;
    setTimeout(()=>URL.revokeObjectURL(href),60000);
  };

  document.body.classList.add('star-page-'+file.replace(/\.html$/,''));

  const nav=[
    ['home','#','<path fill="currentColor" d="M3 10.6 12 3l9 7.6V21h-6v-6H9v6H3V10.6Z"/>','主页'],
    ['albums','#','<circle cx="12" cy="12" r="8.2" fill="currentColor"/><circle cx="12" cy="12" r="2.3" fill="#fff"/>','专辑列表'],
    ['video','#','<rect x="3.2" y="6.5" width="12.8" height="11" rx="1.5" fill="currentColor"/><path d="M16 9.7 21 7.4v9.2L16 14.3V9.7Z" fill="currentColor"/>','视频'],
    ['artist','#','<circle cx="9" cy="8" r="4" fill="currentColor"/><path d="M2.8 20c.4-4.1 2.7-6.2 6.2-6.2 3.4 0 5.8 2.1 6.2 6.2H2.8Z" fill="currentColor"/>','艺人'],
    ['promotion','#','<path d="M2.7 13.1c2.8-1.2 4.4-3.4 5.1-6.4 4.9-.3 8.7 1 11.5 4-1 4.7-4 7.6-8.9 8.8-2.8.7-5.3-.1-7.2-2.5 1.1-.9 1.8-2.2 2-3.8-.9.3-1.7.3-2.5-.1Z" fill="currentColor"/>','音乐推广'],
    ['copyright',copyrightHome,'<path d="M5 3h10l4 4v14H5V3Z" fill="currentColor"/><path d="M15 3v4h4M8 11h8M8 15h6" stroke="#fff" stroke-width="1.4"/><path d="m9 18 1.6 1.6L14 16.2" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>','著作权登记'],
    ['royalty','#','<rect x="4" y="3.5" width="16" height="17" rx="3" fill="currentColor"/><path d="M8.4 9.1h7.2M8.4 14.9h7.2M12 6.8v10.4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>','我的版税'],
    ['contract','#','<path d="M5 2.8h10l4 4V21H5V2.8Z" fill="currentColor"/><path d="M15 2.8v4h4M8 11h8M8 15h8" stroke="#fff" stroke-width="1.4"/>','我的合同'],
    ['analysis','#','<rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor"/><path d="M6.5 15.8 10 12.3l2.5 2.2 5-5" fill="none" stroke="#fff" stroke-width="1.6"/>','销售分析']
  ];

  let context=null;
  if(file==='registration-step1.html'){
    if(currentParams.get('supplement')==='1'){
      const back=detailUrl('pending_supplement');
      context={back,crumbs:[['著作权登记','index.html'],['登记详情',back],['补充登记材料']],hide:['.page-head .back']};
    }else{
      context={back:'index.html',crumbs:[['著作权登记','index.html'],['填写登记信息']],hide:['.page-head .back']};
    }
  }else if(file==='registration-step2.html'){
    const back=url('registration-step1.html',registrationParams());
    context={back,crumbs:[['著作权登记','index.html'],['填写登记信息',back],['签署登记授权']],hide:['.page-head .back']};
  }else if(file==='registration-step3.html'){
    const back=url('registration-step2.html',registrationParams());
    context={back,crumbs:[['著作权登记','index.html'],['签署登记授权',back],['确认付款并提交']],hide:['.page-head .back']};
  }else if(file==='registration-detail.html'){
    context={back:'index.html',crumbs:[['著作权登记','index.html'],['登记详情']],hide:['.page-head .head-left a']};
  }else if(file==='payment-center-checkout.html'){
    const back=step3FromPayment();
    context={back,crumbs:[['著作权登记','star-release/index.html'],['确认付款并提交',back],['统一收银台']],hide:['.host>.head .back']};
  }else if(file==='payment-success.html'){
    const back=successRecordsUrl(true);
    context={back,crumbs:[['著作权登记','star-release/index.html'],['支付并提交'],['提交成功']],hide:[]};
  }

  sidebar.setAttribute('aria-label','星球发行主导航');
  sidebar.innerHTML=`<div class="brand"><div class="brand-logo"><img src="https://star.kanjian.com/app/release/images/star-logo.png" alt="星球发行"></div></div><nav class="nav">${nav.map(([id,href,icon,label])=>`<a class="nav-item${id===active?' active':''}" href="${href}"${id===active?' aria-current="page"':''}><svg class="nav-icon" viewBox="0 0 24 24">${icon}</svg><span class="nav-label">${label}</span></a>`).join('')}</nav>`;

  const contextHtml=context?`<div class="topbar-context"><a class="topbar-back" href="${escapeHTML(context.back)}" aria-label="返回上一层"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.8 4.5 7.3 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><span>返回</span></a><span class="topbar-context-divider"></span><nav class="topbar-breadcrumb" aria-label="面包屑">${context.crumbs.map((item,i)=>{const label=item[0],href=item[1],last=i===context.crumbs.length-1;return `${i?'<span class="topbar-breadcrumb-separator">/</span>':''}${last||!href?`<span class="topbar-breadcrumb-current">${escapeHTML(label)}</span>`:`<a href="${escapeHTML(href)}">${escapeHTML(label)}</a>`}`}).join('')}</nav></div>`:'';
  topbar.innerHTML=`${contextHtml}<div class="topbar-actions"><a class="topbar-action" href="#"><svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9.8 9.2a2.4 2.4 0 1 1 4.6 1c-.35.8-1.1 1.2-1.7 1.7-.5.4-.7.9-.7 1.7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="17.1" r="1" fill="currentColor"/></svg><span>帮助中心</span></a><a class="topbar-action" href="#"><span>简体中文</span><svg class="caret" viewBox="0 0 12 12"><path d="m2 4 4 4 4-4H2Z" fill="currentColor"/></svg></a><a class="topbar-action" href="#"><span>环环</span><svg class="caret" viewBox="0 0 12 12"><path d="m2 4 4 4 4-4H2Z" fill="currentColor"/></svg></a></div>`;

  if(context){
    document.body.classList.add('star-has-context-nav');
    (context.hide||[]).forEach(selector=>document.querySelectorAll(selector).forEach(el=>el.classList.add('shell-return-migrated')));
  }

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

    const rows=[...document.querySelectorAll('.record-table tbody tr')];
    const pendingRow=rows.find(row=>row.querySelector('.status')?.textContent?.trim()==='待付款');
    if(pendingRow){
      const workCopy=pendingRow.querySelector('.work-copy');
      if(workCopy&&!workCopy.querySelector('.group-note')){
        const note=document.createElement('div');
        note.className='group-note';
        note.textContent='登记任务 · CRSUB202608260001';
        workCopy.appendChild(note);
      }
      const payLink=pendingRow.querySelector('.action-link');
      if(payLink){
        payLink.textContent='去付款';
        const rawHref=payLink.getAttribute('href')||'';
        if(rawHref.includes('registration-step3.html')){
          const target=new URL(rawHref,location.href);
          target.searchParams.set('submission_no','CRSUB202608260001');
          payLink.setAttribute('href',target.pathname.split('/').pop()+'?'+target.searchParams.toString());
        }
      }
    }

    const state=new URLSearchParams(location.search);
    if(state.get('payment')==='success'&&pendingRow){
      const title=state.get('title')||pendingRow.querySelector('.work-title')?.textContent?.trim()||'晴天';
      const artist=state.get('artist')||'周杰伦';
      const album=state.get('album')||'叶惠美';
      const cover=state.get('cover')||title.slice(0,1);
      const types=(state.get('types')||'recording,composition').split(',').filter(Boolean);
      const submissionNo=state.get('submission_no')||'CRSUB202608260001';
      const orderNo=state.get('order_no')||'CRPAY202608260001';
      const orderTotal=Number(state.get('order_total')||types.length*9.9||9.9);
      const balanceDeduct=Number(state.get('balance_deduct')||0);
      const paidAmount=Number(state.get('paid_amount')||Math.max(0,orderTotal-balanceDeduct));
      const submittedAt=state.get('submitted_at')||'2026-08-26 14:38';
      const suppliedAppNos=(state.get('app_nos')||'').split(',').filter(Boolean);
      const appNos=types.map((type,index)=>suppliedAppNos[index]||('CR20260826'+String(index+1).padStart(4,'0')));
      const rowsHTML=types.map((type,index)=>{
        const siblingIndex=types.length>1?(index===0?1:0):-1;
        const q=new URLSearchParams({
          status:'pending_accept',title,artist,album,cover,type,
          app_no:appNos[index],submission_no:submissionNo,order_no:orderNo,
          submission_count:String(types.length),order_total:orderTotal.toFixed(1),
          balance_deduct:balanceDeduct.toFixed(1),paid_amount:paidAmount.toFixed(1),
          paired:types.length>1?'1':'0',
          sibling_type:siblingIndex>=0?(types[siblingIndex]||''):'',
          sibling_app_no:siblingIndex>=0?(appNos[siblingIndex]||''):'',
          sibling_status:siblingIndex>=0?'pending_accept':''
        });
        return `<tr class="${types.length>1?'same-submission':''}"><td><div class="work-cell"><div class="work-cover" style="background:linear-gradient(135deg,#6476ea,#9b78d5)">${escapeHTML(cover)}</div><div class="work-copy"><div class="work-title">${escapeHTML(title)}</div><div class="work-artist">${escapeHTML(artist)} · ${escapeHTML(album)}</div><div class="group-note">同次提交 · ${escapeHTML(submissionNo)}</div></div></div></td><td><span class="type-tag">${escapeHTML(registrationLabel(type))}</span></td><td><span class="status processing"><i class="status-dot"></i>待受理</span></td><td><span class="date">${escapeHTML(submittedAt)}</span></td><td><a class="action-link" href="registration-detail.html?${q.toString()}">查看详情</a></td></tr>`;
      }).join('');
      pendingRow.insertAdjacentHTML('beforebegin',rowsHTML);
      pendingRow.remove();

      const count=document.querySelectorAll('.record-table tbody tr').length;
      const totalLabel=document.querySelector('.records-footer > span');
      if(totalLabel)totalLabel.textContent='共 '+count+' 条记录';

      const toast=document.getElementById('toast');
      if(toast){
        toast.textContent='支付成功，已生成 '+types.length+' 条独立登记申请';
        toast.classList.add('show');
        setTimeout(()=>toast.classList.remove('show'),2200);
      }
      if(state.get('view')==='records'){
        setTimeout(()=>document.querySelector('.records-card')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
      }
    }
  }

  if(file==='registration-step1.html'){
    const isSupplement=currentParams.get('supplement')==='1';
    if(isSupplement){
      addDemoStyles();
      const page=document.querySelector('.workspace .page');
      const head=page?.querySelector('.page-head');
      if(head&&!document.querySelector('.supplement-edit-banner')){
        const banner=document.createElement('div');
        banner.className='supplement-edit-banner';
        banner.innerHTML='<span class="supplement-edit-badge">待补证</span><div class="supplement-edit-copy"><strong>需要你补充当前申请材料</strong><span>补正所需时间不计算在官方 30 个工作日办理时限内。另一条同次提交申请会继续按自己的状态办理。</span><div class="supplement-edit-requirement">补正要求：请重新核对并上传当前申请的主体证明材料。</div></div>';
        head.insertAdjacentElement('afterend',banner);
      }
      const next=document.getElementById('nextBtn');
      if(next){
        next.addEventListener('click',e=>{
          e.preventDefault();
          e.stopImmediatePropagation();
          const q=applicationParams('pending_registration');
          q.set('supplement_submitted','1');
          location.href='registration-detail.html?'+q.toString();
        },true);
      }
      setTimeout(()=>{
        const title=document.querySelector('.page-title');
        const sub=document.querySelector('.page-sub');
        if(title)title.textContent='补充登记材料';
        if(sub)sub.textContent='请根据登记机构的补正要求修改并重新提交当前申请材料。';
        const currentType=currentParams.get('type')||'recording';
        document.querySelectorAll('.type-card').forEach(card=>{
          const selected=card.dataset.type===currentType;
          card.classList.toggle('selected',selected);
          card.style.pointerEvents='none';
          card.setAttribute('aria-disabled','true');
          const input=card.querySelector('input[type="checkbox"]');
          const check=card.querySelector('.type-check');
          if(input)input.checked=selected;
          if(check)check.textContent=selected?'✓':'';
        });
        const reselect=document.getElementById('reselectBtn');
        if(reselect){reselect.disabled=true;reselect.textContent='当前申请作品';}
        if(next)next.textContent='提交补充材料';
        const save=document.querySelector('.save');
        if(save)save.style.display='none';
      },0);
    }

    const next=document.getElementById('nextBtn');
    if(next&&!isSupplement){
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

  if(file==='registration-detail.html'){
    addDemoStyles();
    document.addEventListener('click',e=>{
      const primary=e.target.closest('#primaryBtn');
      if(primary&&new URLSearchParams(location.search).get('status')==='pending_supplement'){
        e.preventDefault();
        e.stopImmediatePropagation();
        location.href=supplementEditUrl();
        return;
      }
      const certificate=e.target.closest('#certificateBtn');
      if(certificate){
        e.preventDefault();
        e.stopImmediatePropagation();
        openDemoPdf('Copyright Registration Certificate');
        return;
      }
      const link=e.target.closest('.link');
      if(!link)return;
      const text=link.textContent.trim();
      if(text==='查看已签协议'||/\.pdf$/i.test(text)){
        e.preventDefault();
        e.stopImmediatePropagation();
        openDemoPdf(text==='查看已签协议'?'Signed Authorization Agreement':text);
      }else if(/\.(jpe?g|png|webp)$/i.test(text)){
        e.preventDefault();
        e.stopImmediatePropagation();
        openDemoImage(text);
      }
    },true);
    if(currentParams.get('supplement_submitted')==='1'){
      const page=document.querySelector('.workspace .page');
      const head=page?.querySelector('.page-head');
      if(head&&!document.querySelector('.supplement-submit-banner')){
        const banner=document.createElement('div');
        banner.className='supplement-submit-banner';
        banner.innerHTML='<strong>补充材料已提交。</strong> 当前申请已恢复办理，后续状态将继续按当前申请独立更新。';
        head.insertAdjacentElement('afterend',banner);
      }
    }
  }

  if(file==='payment-success.html'){
    const goBack=viewRecords=>{location.href=successRecordsUrl(viewRecords)};
    const recordsBtn=document.getElementById('recordsBtn');
    if(recordsBtn){
      recordsBtn.addEventListener('click',e=>{
        e.preventDefault();
        e.stopImmediatePropagation();
        goBack(true);
      },true);
    }
    const homeBtn=document.getElementById('homeBtn');
    if(homeBtn){
      homeBtn.addEventListener('click',e=>{
        e.preventDefault();
        e.stopImmediatePropagation();
        goBack(false);
      },true);
    }
  }
})();
