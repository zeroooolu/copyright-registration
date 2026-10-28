/* MVP prototype only: browser-local workflow metadata, not an upload backend. */
(function(global){
  'use strict';
  const KEY='copyright-registration:mvp:supplement-requests:v1';
  const MATERIALS=[
    {key:'audio',name:'作品附件',file:'晴天.wav',accept:'.wav,.mp3,.flac,.m4a,audio/*'},
    {key:'identity',name:'证件附件',file:'营业执照.jpg',accept:'.pdf,.jpg,.jpeg,.png,application/pdf,image/*'},
    {key:'authorization',name:'原授权书',file:'著作权登记授权委托协议.pdf',accept:'.pdf,.jpg,.jpeg,.png,application/pdf,image/*'},
    {key:'extra_authorization',name:'补充授权书',file:'',accept:'.pdf,.jpg,.jpeg,.png,application/pdf,image/*'},
    {key:'other',name:'其他证明材料',file:'',accept:'.pdf,.jpg,.jpeg,.png,.doc,.docx'}
  ];
  const TYPES=[
    {value:'incomplete',label:'内容不完整'},
    {value:'unclear',label:'文件模糊 / 无法识别'},
    {value:'unsigned',label:'缺少签字 / 盖章'},
    {value:'broken',label:'文件无法打开'},
    {value:'format',label:'格式不符合要求'},
    {value:'missing',label:'缺少必要附件'},
    {value:'mismatch',label:'与登记信息不一致'},
    {value:'other',label:'其他'}
  ];
  const now=()=>new Date().toLocaleString('zh-CN',{hour12:false});
  const clone=v=>JSON.parse(JSON.stringify(v));
  function all(){
    try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}
    catch(e){return []}
  }
  function save(list){
    try{localStorage.setItem(KEY,JSON.stringify(list));global.dispatchEvent(new Event('copyright-supplement-updated'))}
    catch(e){throw new Error('本地演示数据保存失败，请检查浏览器是否禁用了本地存储。')}
  }
  function list(appNo){return all().filter(x=>x.appNo===String(appNo)).sort((a,b)=>b.createdAtMs-a.createdAtMs)}
  function latest(appNo){return list(appNo)[0]||null}
  function active(appNo){return list(appNo).find(x=>x.status!=='completed')||null}
  function event(label,detail){return {at:now(),label,detail:detail||''}}
  function create(payload){
    if(!payload||!payload.appNo)throw new Error('缺少登记申请编号');
    if(active(payload.appNo))throw new Error('当前申请存在未完成的补充任务，请先处理后再发起');
    if(!Array.isArray(payload.items)||!payload.items.length)throw new Error('请至少选择一项附件');
    const items=payload.items.map(x=>{
      const base=MATERIALS.find(m=>m.key===x.key);
      if(!base)throw new Error('不支持的附件类型');
      if(!String(x.requirement||'').trim())throw new Error(base.name+'需要填写具体补充要求');
      return {key:base.key,name:base.name,original:x.original||base.file||'',mode:x.mode||'replace',reason:x.reason||'other',requirement:String(x.requirement).trim(),replacement:null,approved:false,versions:[]};
    });
    const record={
      id:'SUP'+Date.now().toString(36).toUpperCase(),
      appNo:String(payload.appNo),source:payload.source==='official'?'official':'platform',
      triggerStatus:payload.triggerStatus||'pending_accept',
      status:'needs_upload',createdAtMs:Date.now(),createdAt:now(),
      operator:payload.operator||'运营人员',officialNote:payload.officialNote||'',
      officialFile:payload.officialFile||null,deadline:payload.deadline||'',
      items,events:[event('发起材料补充',payload.source==='official'?'官方补正':'平台审核退回')]
    };
    const records=all();records.push(record);save(records);return clone(record);
  }
  function change(appNo,fn){
    const records=all(),idx=records.findIndex(x=>x.appNo===String(appNo)&&x.status!=='completed');
    if(idx<0)throw new Error('当前没有待处理的补充任务');
    const record=records[idx];fn(record);save(records);return clone(record);
  }
  function submit(appNo,files){
    return change(appNo,r=>{
      if(r.status!=='needs_upload')throw new Error('当前状态不允许重复提交');
      const outstanding=r.items.filter(x=>!x.approved);
      if(!outstanding.length)throw new Error('没有需要补充的附件');
      for(const item of outstanding){
        const file=files?.[item.key];
        if(!file||!file.name)throw new Error('请上传：'+item.name);
        if(file.size>20*1024*1024)throw new Error(item.name+'超过演示文件大小限制 20 MB');
        const extensions={
          audio:/\.(wav|mp3|flac|m4a)$/i,
          identity:/\.(pdf|jpg|jpeg|png)$/i,
          authorization:/\.(pdf|jpg|jpeg|png)$/i,
          extra_authorization:/\.(pdf|jpg|jpeg|png)$/i,
          other:/\.(pdf|jpg|jpeg|png|doc|docx)$/i
        };
        if(!extensions[item.key].test(file.name))throw new Error(item.name+'文件格式不符合要求，请重新选择');
      }
      outstanding.forEach(item=>{
        const file=files[item.key],meta={name:file.name,size:file.size||0,type:file.type||'',at:now()};
        item.versions.push(meta);item.replacement=meta;
      });
      r.status='reviewing';r.submittedAt=now();r.events.unshift(event('用户提交补充材料','待运营复核'));
    });
  }
  function review(appNo,action,keys=[],comment=''){
    return change(appNo,r=>{
      if(r.status!=='reviewing')throw new Error('请等待用户提交补充材料');
      if(action==='approve'){
        r.items.forEach(i=>i.approved=true);
        r.status=r.source==='official'?'awaiting_official':'completed';
        r.reviewedAt=now();r.events.unshift(event('材料复核通过',comment||'附件审核通过'));
      }else if(action==='reject'){
        if(!keys.length)throw new Error('请勾选仍需重新补充的附件');
        r.items.forEach(i=>i.approved=!keys.includes(i.key));
        r.items.filter(i=>!i.approved).forEach(i=>{if(comment)i.requirement=comment});
        r.status='needs_upload';r.events.unshift(event('再次要求补充',comment||'附件仍不符合要求'));
      }else throw new Error('无效复核操作');
    });
  }
  function markOfficial(appNo,receipt){
    return change(appNo,r=>{
      if(r.source!=='official'||r.status!=='awaiting_official')throw new Error('仅已通过复核的官方补正可确认转交');
      if(!String(receipt||'').trim())throw new Error('请填写官方提交凭证或说明');
      r.status='completed';r.officialReceipt=receipt.trim();r.sentAt=now();
      r.events.unshift(event('已提交官方',r.officialReceipt));
    });
  }
  const statusText=status=>({needs_upload:'待用户补充',reviewing:'待后台复核',awaiting_official:'待提交官方',completed:'已完成'})[status]||status;
  const sourceText=source=>source==='official'?'官方补正':'平台审核退回';
  const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  global.CopyrightSupplement={MATERIALS,TYPES,list,latest,active,create,submit,review,markOfficial,statusText,sourceText,escapeHTML};
})(window);
