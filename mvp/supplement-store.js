/* MVP prototype only: browser-local workflow metadata, not an upload backend. */
(function(global){
  'use strict';
  const KEY='copyright-registration:mvp:supplement-requests:v1';
  const MATERIALS=[
    {key:'audio',name:'作品附件',file:'晴天.wav',accept:'.wav,.mp3,.flac,.m4a,audio/*'},
    {key:'identity',name:'证件附件',file:'营业执照.jpg',accept:'.pdf,.jpg,.jpeg,.png,application/pdf,image/*'},
    {key:'authorization',name:'原授权书',file:'著作权登记授权委托协议.pdf',accept:'.pdf,.jpg,.jpeg,.png,application/pdf,image/*'},
    {key:'extra_authorization',name:'补充授权书',file:'',accept:'.pdf,.jpg,.jpeg,.png,application/pdf,image/*'},
    {key:'other',name:'其他证明材料',file:'',accept:'.pdf,.jpg,.jpeg,.png,.doc,.docx'},
    {key:'agent_authorization',name:'代理委托书',file:'代理登记委托书.pdf',accept:'.pdf,.jpg,.jpeg,.png,application/pdf,image/*'}
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
  function customerTasks(){return all().filter(r=>r.status!=='completed'&&r.appSource==='self').sort((a,b)=>b.createdAtMs-a.createdAtMs)}
  function active(appNo){return list(appNo).find(x=>x.status!=='completed')||null}
  function event(label,detail){return {at:now(),label,detail:detail||''}}
  const attachmentId=item=>item.id||item.key;
  const FILE_LIMIT=20*1024*1024;
  const EXTENSIONS={
    audio:/\.(wav|mp3|flac|m4a)$/i,
    identity:/\.(pdf|jpg|jpeg|png)$/i,
    authorization:/\.(pdf|jpg|jpeg|png)$/i,
    extra_authorization:/\.(pdf|jpg|jpeg|png)$/i,
    agent_authorization:/\.(pdf|jpg|jpeg|png)$/i,
    other:/\.(pdf|jpg|jpeg|png|doc|docx)$/i
  };
  function validateAttachmentFile(key,file){
    if(!MATERIALS.some(m=>m.key===key))throw new Error('未知的附件类型');
    if(!file||!file.name)throw new Error('请选择需要上传的文件');
    if(Number(file.size||0)>FILE_LIMIT)throw new Error('单个文件不能超过 20 MB');
    if(!EXTENSIONS[key].test(file.name))throw new Error('文件格式不符合「'+MATERIALS.find(m=>m.key===key).name+'」的要求');
    return true;
  }
  function create(payload){
    if(!payload||!payload.appNo)throw new Error('缺少登记申请编号');
    if(active(payload.appNo))throw new Error('当前申请存在未完成的补充任务，请先处理后再发起');
    const description=String(payload.description||'').trim();
    if(!description)throw new Error('请填写补证说明');
    if(description.length>2000)throw new Error('补证说明不超过 2000 字');
    if(!Array.isArray(payload.items))throw new Error('补充附件列表格式错误');
    const items=payload.items.map((x,i)=>{
      const base=MATERIALS.find(m=>m.key===x.key);
      if(!base||base.key==='other')throw new Error('不支持的附件类型');
      const original=x.original||base.file||'';
      const mode=x.mode==='append'||!original?'append':'replace';
      return {id:'I'+Date.now().toString(36)+i.toString(36),key:base.key,name:base.name,
        original,mode,reason:x.reason||'other',requirement:String(x.requirement||'').trim(),
        replacement:null,approved:false,versions:[]};
    });
    const record={
      id:'SUP'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,5).toUpperCase(),
      appNo:String(payload.appNo),workTitle:String(payload.workTitle||''),appSource:String(payload.appSource||'self'),
      source:payload.source==='official'?'official':'platform',
      description,selectionMode:items.length?'specified':'self',
      triggerStatus:payload.triggerStatus||'pending_accept',
      status:'needs_upload',createdAtMs:Date.now(),createdAt:now(),
      operator:payload.operator||'运营人员',
      items,events:[event('发起材料补充',payload.source==='official'?'官方补正':'平台审核退回')]
    };
    const records=all();records.push(record);save(records);return clone(record);
  }
  function change(appNo,fn){
    const records=all(),idx=records.findIndex(x=>x.appNo===String(appNo)&&x.status!=='completed');
    if(idx<0)throw new Error('当前没有待处理的补充任务');
    const record=records[idx];fn(record);save(records);return clone(record);
  }
  function submit(appNo,files,freeChoices){
    return change(appNo,r=>{
      if(r.status!=='needs_upload')throw new Error('当前状态不允许重复提交');
      // If the operator did not specify material items, the customer classifies each uploaded file.
      if(!r.items.length){
        if(!Array.isArray(freeChoices)||!freeChoices.length)throw new Error('请至少上传一份补充附件并选择类型');
        if(freeChoices.length>20)throw new Error('单次最多补充 20 份附件');
        const timestamp=Date.now().toString(36);
        const prepared=freeChoices.map((entry,i)=>{
          if(!entry||entry.key==='other')throw new Error('请选择有效的附件类型');
          validateAttachmentFile(entry.key,entry.file);
          const material=MATERIALS.find(m=>m.key===entry.key),file=entry.file;
          const fallback=entry.key==='audio'&&r.workTitle?r.workTitle+'.wav':material.file||'';
          const current=getAttachment(appNo,entry.key,fallback);
          const meta={name:file.name,size:file.size||0,type:file.type||'',at:now()};
          return {id:'SELF'+timestamp+i.toString(36),key:entry.key,name:material.name,original:current.entries.map(x=>x.name).join('、'),
            mode:'append',reason:'other',requirement:'',replacement:meta,approved:false,versions:[meta]};
        });
        r.items=prepared;
        r.selectionMode='self';
      }else{
        const outstanding=r.items.filter(x=>!x.approved);
        if(!outstanding.length)throw new Error('没有需要补充的附件');
        const uploadList=outstanding.map(item=>{
          const file=files?.[attachmentId(item)]||files?.[item.key];
          validateAttachmentFile(item.key,file);
          return {item,file};
        });
        uploadList.forEach(({item,file})=>{
          const meta={name:file.name,size:file.size||0,type:file.type||'',at:now()};
          item.versions.push(meta);item.replacement=meta;
        });
      }
      r.status='reviewing';r.submittedAt=now();
      r.events.unshift(event('用户提交补充材料',r.items.length+' 项文件待运营复核'));
    });
  }
  function review(appNo,action,ids=[],comment=''){
    const activeRequest=active(appNo);
    if(!activeRequest||activeRequest.status!=='reviewing')throw new Error('请等待用户提交补充材料');
    if(action==='approve'){
      // Validate before persisting the review transition; this prevents an invalid
      // empty-attachment "replace" from leaving the request in a completed state.
      const approved=activeRequest.items.filter(i=>i.replacement);
      const promotions=approved.map(item=>{
        validateAttachmentFile(item.key,item.replacement);
        const base=MATERIALS.find(m=>m.key===item.key);
        const current=getAttachment(appNo,item.key,item.original||base.file||'');
        const mode=item.mode==='replace'&&current.entries.length?'replace':'append';
        return {appNo,key:item.key,mode,file:item.replacement,
          fallbackName:item.original||base.file||'',operator:'用户补充 · 运营复核通过',
          note:'来自补充任务 '+activeRequest.id,source:'supplement',bypassTask:true};
      });
      promotions.forEach(commitAttachment);
      return change(appNo,r=>{
        r.items.forEach(i=>i.approved=true);
        r.status=r.source==='official'?'awaiting_official':'completed';
        r.reviewedAt=now();
        r.events.unshift(event('材料复核通过',comment||'附件审核通过'));
      });
    }
    if(action==='reject'){
      if(!ids.length)throw new Error('请勾选仍需重新补充的附件');
      if(!String(comment||'').trim())throw new Error('请填写再次补充要求');
      const target=new Set(ids);
      return change(appNo,r=>{
        if(!r.items.some(i=>target.has(attachmentId(i))))throw new Error('未选择有效的附件');
        r.items.forEach(i=>i.approved=!target.has(attachmentId(i)));
        r.items.filter(i=>!i.approved).forEach(i=>i.requirement=comment.trim());
        r.status='needs_upload';
        r.events.unshift(event('再次要求补充',comment.trim()));
      });
    }
    throw new Error('无效复核操作');
  }
  function markOfficial(appNo,receipt){
    return change(appNo,r=>{
      if(r.source!=='official'||r.status!=='awaiting_official')throw new Error('仅已通过复核的官方补正可确认转交');
      if(!String(receipt||'').trim())throw new Error('请填写官方提交凭证或说明');
      r.status='completed';r.officialReceipt=receipt.trim();r.sentAt=now();
      r.events.unshift(event('已提交官方',r.officialReceipt));
    });
  }
  /* Per-application current attachment roster and audit history (metadata-only prototype). */
  const FILE_KEY='copyright-registration:mvp:application-files:v1';
  function fileRecords(){
    try{const v=JSON.parse(localStorage.getItem(FILE_KEY)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
    catch(err){return {}}
  }
  const newEntry=(file,source,operator)=>({
    id:'F'+Math.random().toString(36).slice(2,10)+Date.now().toString(36),
    name:file.name,size:file.size||0,type:file.type||'',at:now(),
    source:source||'admin',operator:operator||'后台运营'
  });
  function getAttachment(appNo,key,fallbackName){
    if(!MATERIALS.some(m=>m.key===key))throw new Error('未知的附件类型');
    const saved=fileRecords()[String(appNo)]?.[key];
    if(saved)return clone(saved);
    const base=fallbackName===undefined?(MATERIALS.find(m=>m.key===key)?.file||''):fallbackName;
    return {entries:base?[{id:'original-'+key,name:base,size:0,type:'',at:'初始提交',source:'original',operator:'用户提交'}]:[],history:[]};
  }
  function commitAttachment(opts){
    const {appNo,key,mode,file,files,targetId,fallbackName,operator,note,source,bypassTask}=opts||{};
    if(!appNo||!key)throw new Error('缺少登记申请或附件信息');
    if(mode!=='replace'&&mode!=='append')throw new Error('请选择上传方式');
    const incoming=Array.isArray(files)?files:[file];
    if(!incoming.length||incoming.some(x=>!x))throw new Error('请选择文件');
    if(mode==='replace'&&incoming.length!==1)throw new Error('替换文件一次只能上传一个');
    incoming.forEach(f=>validateAttachmentFile(key,f));
    if(!bypassTask&&active(appNo)?.items.some(i=>i.key===key)){
      throw new Error('该附件处于材料补充任务中，请先完成本轮用户补充及复核');
    }
    const current=getAttachment(appNo,key,fallbackName);
    const target=mode==='replace'?(current.entries.find(x=>x.id===targetId)||current.entries[0]):null;
    if(mode==='replace'&&!target)throw new Error('该附件暂无文件，请使用补充上传');
    if(mode==='replace'){
      const fresh=newEntry(incoming[0],source,operator);
      current.entries=current.entries.map(x=>x.id===target.id?fresh:x);
      current.history.unshift({at:now(),action:'replace',from:target.name,to:fresh.name,operator:operator||'后台运营',note:note||'',source:source||'admin'});
    }else{
      incoming.forEach(f=>{
        const entry=newEntry(f,source,operator);
        current.entries.push(entry);
        current.history.unshift({at:now(),action:'append',from:'',to:entry.name,operator:operator||'后台运营',note:note||'',source:source||'admin'});
      });
    }
    const records=fileRecords();
    if(!records[String(appNo)])records[String(appNo)]={};
    records[String(appNo)][key]=current;
    try{
      localStorage.setItem(FILE_KEY,JSON.stringify(records));
      global.dispatchEvent(new Event('copyright-attachments-updated'));
    }catch(err){throw new Error('文件修改记录保存失败，请检查本地存储设置')}
    return clone(current);
  }
  const statusText=status=>({needs_upload:'待用户补充',reviewing:'待后台复核',awaiting_official:'待提交官方',completed:'已完成'})[status]||status;
  const sourceText=source=>source==='official'?'官方补正':'平台审核退回';
  const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  global.CopyrightSupplement={MATERIALS,TYPES,list,latest,active,customerTasks,create,submit,review,markOfficial,statusText,sourceText,escapeHTML,getAttachment,commitAttachment,validateAttachmentFile,attachmentId};
})(window);
