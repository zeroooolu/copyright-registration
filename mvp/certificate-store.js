/* Copyright Registration MVP – certificate fulfillment demo.
   Official API, OCR and issuance are not backed by a server. Metadata uses
   localStorage, certificate PNG file bytes use IndexedDB on the same origin. */
(function(global){
  'use strict';
  const META_KEY='copyright-registration:mvp:certificates:v1';
  const REG_KEY='copyright-registration:mvp:registration-numbers:v1';
  const DB_NAME='copyright-registration:mvp:certificate-files';
  const MAX_BYTES=20*1024*1024;
  const now=()=>new Date().toLocaleString('zh-CN',{hour12:false});
  const copy=v=>JSON.parse(JSON.stringify(v));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const appSamples=[
    {id:'CR202510150001',workId:'2145541433589761',work:'关上世界的窗',owner:'欢唱网络科技（上海）有限公司',type:'录音制品',status:'issued',statusName:'已发证',source:'batch',regNumberDemo:'沪作登字-2025-S-03886487'},
    {id:'CR202608250001',workId:'',work:'青花瓷',owner:'看见音乐（上海）有限公司',type:'录音制品',status:'pending_first_review',statusName:'待初审',source:'self',regNumberDemo:''},
    {id:'CR202609030001',workId:'',work:'晴天',owner:'看见音乐（上海）有限公司',type:'录音制品',status:'pending_first_review',statusName:'待初审',source:'self',regNumberDemo:''},
    {id:'CR202609030003',workId:'5650902849421523',work:'溺空',owner:'姚晓雄',type:'录音制品',status:'pending_accept',statusName:'待受理',source:'batch',regNumberDemo:''},
    {id:'CR202608270021',workId:'5641044037206017',work:'青苔经过晨岸',owner:'欢唱网络科技（上海）有限公司',type:'录音制品',status:'pending_registration',statusName:'待登记',source:'batch',regNumberDemo:''},
    {id:'CR202608270022',workId:'5641043835879516',work:'山寺初有春水',owner:'欢唱网络科技（上海）有限公司',type:'录音制品',status:'pending_registration',statusName:'待登记',source:'batch',regNumberDemo:''},
    {id:'CR202608270023',workId:'5641043634552914',work:'轻盈田野装满橘光',owner:'欢唱网络科技（上海）有限公司',type:'录音制品',status:'pending_registration',statusName:'待登记',source:'batch',regNumberDemo:''},
    {id:'CR202608270024',workId:'5641043450003527',work:'潮声与窗灯',owner:'欢唱网络科技（上海）有限公司',type:'录音制品',status:'pending_registration',statusName:'待登记',source:'batch',regNumberDemo:''},
    {id:'CR202608270025',workId:'5641043248677038',work:'悠长花火沉入塔影',owner:'欢唱网络科技（上海）有限公司',type:'录音制品',status:'pending_re_review',statusName:'待复审',source:'batch',regNumberDemo:''},
    {id:'CR202608270026',workId:'5641043064127615',work:'蔷薇写给长街',owner:'欢唱网络科技（上海）有限公司',type:'录音制品',status:'issued',statusName:'已发证',source:'batch',regNumberDemo:'沪作登字-2026-S-00000026'},
    {id:'CR202609030004',workId:'',work:'溺空',owner:'姚晓雄',type:'录音制品',status:'failed',statusName:'失败',source:'batch',regNumberDemo:''}
  ];
  const applications=appSamples.map(x=>Object.freeze(x));
  const read=(key,fallback)=>{
    try {const v=JSON.parse(localStorage.getItem(key)||'null');return v===null?fallback:v}
    catch(_){return fallback}
  };
  const emit=()=>{try{global.dispatchEvent(new Event('copyright-certificate-updated'))}catch(_){}};
  const save=(key,v)=>{localStorage.setItem(key,JSON.stringify(v));emit()};
  const all=()=>read(META_KEY,[]);
  const regMap=()=>read(REG_KEY,{});
  const app=id=>applications.find(a=>a.id===id)||null;
  const workIdFor=id=>app(id)?.workId||'';
  function normalizeReg(v){
    return String(v||'').normalize('NFKC').replace(/\s/g,'').replace(/[—–－﹣]/g,'-').replace(/[：:]/g,'').toUpperCase();
  }
  function extractReg(text){
    const n=normalizeReg(text).replace(/登记号[：:]?/g,'');
    const match=n.match(/[\u4e00-\u9fff]{1,3}作登字-?20\d{2}-?[A-Z]-?\d{6,10}/);
    if(!match)return '';
    let val=match[0].replace(/作登字-?/,'作登字-');
    const reg=val.match(/^(.*?作登字)-?(20\d{2})-?([A-Z])-?(\d{6,10})$/);
    return reg?reg[1]+'-'+reg[2]+'-'+reg[3]+'-'+reg[4]:val;
  }
  const getReg=id=>regMap()[id]||null;
  function sync(ids){
    const target=Array.isArray(ids)?ids:applications.map(a=>a.id);
    const previous=regMap(),result=[];
    target.forEach(id=>{
      const a=app(id);
      if(!a)return;
      if(!a.workId){result.push({id,code:'no_work_id',message:'尚未取得官方 WorkID'});return}
      // Mock only: real integration must call the authenticated server-side API.
      if(!a.regNumberDemo){result.push({id,code:'not_ready',message:'模拟接口暂未返回登记号'});return}
      const number=normalizeReg(a.regNumberDemo);
      const duplicate=Object.entries(previous).find(([k,v])=>k!==id&&normalizeReg(v.number)===number);
      if(duplicate){result.push({id,code:'duplicate',message:'登记号已属于 '+duplicate[0]});return}
      previous[id]={number,workId:a.workId,source:'mock_api',syncedAt:now()};
      result.push({id,code:'success',number});
    });
    save(REG_KEY,previous);
    return result;
  }
  function bindManually(id,number){
    const a=app(id);if(!a)throw Error('未找到登记申请');
    const normalized=extractReg(number);if(!normalized)throw Error('作品登记号格式不正确');
    const map=regMap(),collision=Object.entries(map).find(([k,v])=>k!==id&&normalizeReg(v.number)===normalizeReg(normalized));
    if(collision)throw Error('该登记号已经关联 '+collision[0]);
    map[id]={number:normalized,workId:a.workId,source:'manual',syncedAt:now()};
    save(REG_KEY,map);
    rematchAll();
    return map[id];
  }
  function match(number,workName,owner){
    const n=normalizeReg(number);
    if(!n)return {status:'unreadable',appId:null,reason:'未识别出作品登记号'};
    const matches=Object.entries(regMap()).filter(([,v])=>normalizeReg(v.number)===n);
    if(!matches.length)return {status:'unmatched',appId:null,reason:'尚无登记申请关联该作品登记号'};
    if(matches.length!==1)return {status:'conflict',appId:null,reason:'作品登记号匹配到多条申请'};
    const a=app(matches[0][0]);if(!a)return {status:'unmatched',appId:null,reason:'申请已不存在'};
    const mismatches=[];
    if(workName&&String(workName).trim()!==a.work)mismatches.push('作品名称不一致');
    if(owner&&String(owner).trim()!==a.owner)mismatches.push('著作权人不一致');
    return {status:mismatches.length?'review':'matched',appId:a.id,reason:mismatches.join('；')||'作品登记号唯一匹配'};
  }
  function db(){
    return new Promise((resolve,reject)=>{
      if(!global.indexedDB){reject(Error('浏览器不支持 IndexedDB'));return}
      const request=global.indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>{const d=request.result;if(!d.objectStoreNames.contains('png'))d.createObjectStore('png')};
      request.onerror=()=>reject(request.error||Error('文件存储初始化失败'));
      request.onsuccess=()=>resolve(request.result);
    });
  }
  async function putBlob(id,file){
    const d=await db();
    try{await new Promise((resolve,reject)=>{const tx=d.transaction('png','readwrite');tx.objectStore('png').put(file,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('文件保存失败'))})}
    finally{d.close()}
  }
  async function getBlob(id){
    const d=await db();
    try{return await new Promise((resolve,reject)=>{const tx=d.transaction('png','readonly');const req=tx.objectStore('png').get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error)})}
    finally{d.close()}
  }
  const getRecord=id=>all().find(x=>x.id===id)||null;
  const getDelivered=id=>all().find(x=>x.appId===id&&x.delivery==='delivered')||null;
  async function upload(file){
    if(!file||!file.name)throw Error('请选择 PNG 证书');
    if(file.size>MAX_BYTES)throw Error('单张 PNG 不得超过 20MB');
    if(!/\.png$/i.test(file.name))throw Error('只支持 PNG 图片');
    if(file.type&&file.type!=='image/png')throw Error('文件类型不是 PNG');
    const id='CERT'+Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,6);
    await putBlob(id,file);
    const fromFile=extractReg(file.name);
    const item={id,fileName:file.name,fileSize:file.size,createdAt:now(),regNumber:fromFile,
      workName:'',owner:'',ocrText:'',recognition:fromFile?'filename':'pending',
      matchStatus:'unreadable',matchReason:'待识别',appId:null,delivery:'pending',deliveredAt:null};
    const m=match(item.regNumber);item.matchStatus=m.status;item.matchReason=m.reason;item.appId=m.appId;
    const list=all();list.unshift(item);save(META_KEY,list);return copy(item);
  }
  function patch(id,changes){
    const items=all(),pos=items.findIndex(x=>x.id===id);if(pos<0)throw Error('未找到证书');
    if(items[pos].delivery==='delivered')throw Error('已发放证书不可直接修改，请走人工换证流程');
    Object.assign(items[pos],changes);
    const m=match(items[pos].regNumber,items[pos].workName,items[pos].owner);
    const dup=items.find(x=>x.id!==id&&normalizeReg(x.regNumber)&&normalizeReg(x.regNumber)===normalizeReg(items[pos].regNumber));
    items[pos].matchStatus=dup?'duplicate':m.status;
    items[pos].matchReason=dup?'本批次已存在相同作品登记号':m.reason;
    items[pos].appId=dup?null:m.appId;
    save(META_KEY,items);return copy(items[pos]);
  }
  function rematchAll(){
    const items=all();let changed=false;
    items.filter(x=>x.delivery!=='delivered').forEach(x=>{
      const m=match(x.regNumber,x.workName,x.owner);
      const dup=items.find(y=>y.id!==x.id&&normalizeReg(y.regNumber)&&normalizeReg(y.regNumber)===normalizeReg(x.regNumber));
      x.matchStatus=dup?'duplicate':m.status;x.matchReason=dup?'本批次存在相同作品登记号':m.reason;x.appId=dup?null:m.appId;changed=true;
    });
    if(changed)save(META_KEY,items);
  }
  function deliver(ids){
    const list=all(),done=[],rejected=[];
    ids.forEach(id=>{
      const r=list.find(x=>x.id===id);
      if(!r){rejected.push({id,reason:'记录不存在'});return}
      if(r.delivery==='delivered'){rejected.push({id,reason:'已经发放'});return}
      const m=match(r.regNumber,r.workName,r.owner);
      const duplicate=list.some(x=>x.id!==id&&normalizeReg(x.regNumber)===normalizeReg(r.regNumber));
      const delivered=list.find(x=>x.id!==id&&x.delivery==='delivered'&&x.appId===m.appId&&m.appId);
      if(m.status!=='matched'||duplicate||delivered){
        rejected.push({id,reason:duplicate?'登记号重复':delivered?'该申请已有已发放证书':m.reason});return
      }
      r.matchStatus='matched';r.appId=m.appId;r.delivery='delivered';r.deliveredAt=now();r.deliveredBy='后台运营';
      done.push(id);
    });
    if(done.length)save(META_KEY,list);
    return {done,rejected};
  }
  const stats=()=>{const records=all();return {total:records.length,matched:records.filter(x=>x.matchStatus==='matched'&&x.delivery!=='delivered').length,
    exceptions:records.filter(x=>x.matchStatus!=='matched'&&x.delivery!=='delivered').length,delivered:records.filter(x=>x.delivery==='delivered').length}};
  global.CopyrightCertificate={applications,app,workIdFor,getReg,sync,bindManually,normalizeReg,extractReg,
    match,all,getRecord,getDelivered,upload,patch,rematchAll,deliver,getBlob,stats,esc};
})(window);
