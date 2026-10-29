/* One source of truth for customer-facing MVP registration statuses.
   Priority: active supplement request > delivered certificate > official stage. */
(function(global){
  'use strict';
  const stageLabels={
    pending_accept:'待受理',pending_supplement:'待补证',
    pending_registration:'待登记',pending_first_review:'待初审',
    pending_re_review:'待复审',pending_certificate:'待制证',
    issued:'已发证',failed:'办理失败'
  };
  function resolve(appNo,stage){
    const S=global.CopyrightSupplement,C=global.CopyrightCertificate;
    const task=S?.active(appNo)||null;
    const delivered=C?.getDelivered(appNo)||null;
    const registration=C?.getReg(appNo)||null;
    if(task){
      const src=task.source==='official'?'官方补正':'平台审核退回';
      const modes={
        needs_upload:{kind:'needs_upload',label:'待补充材料',listLabel:'待补充材料',action:'补充材料',
          desc:task.items.length?'请查看补证说明并按要求补充指定附件。':'请查看补证说明，自行添加附件并选择附件类型。'},
        reviewing:{kind:'reviewing',label:'材料审核中',listLabel:'材料审核中',action:'查看进度',desc:'补充材料已提交，正在等待平台复核。'},
        awaiting_official:{kind:'awaiting_official',label:'待提交官方',listLabel:'待提交官方',action:'查看进度',desc:'材料已通过平台复核，等待工作人员转交登记机构。'}
      };
      const active=modes[task.status];
      if(active)return {...active,task,delivered,registration,stage:stage||task.triggerStatus,sourceText:src};
    }
    if(delivered)return {kind:'delivered',label:'已发证',listLabel:'已发证 · 可下载',action:'查看证书',
      desc:'电子登记证书已发放，可在线查看和下载 PNG。',stage:'issued',task:null,delivered,registration};
    if(stage==='issued')return {kind:'certificate_pending',label:'已发证',listLabel:'已发证 · 待交付',action:'查看进度',
      desc:'官方登记已完成，电子证书尚未交付。平台上传并确认发放后可在此下载。',
      stage:'issued',task:null,delivered:null,registration};
    if(stage==='pending_supplement')return {kind:'awaiting_notice',label:'待补证',listLabel:'待补证 · 待通知',action:'查看详情',
      desc:'当前登记申请需要补证，具体补证说明尚未发布。请关注本页更新。',
      stage,task:null,delivered:null,registration};
    return {kind:'standard',label:stageLabels[stage]||stageLabels.pending_accept,
      listLabel:stageLabels[stage]||stageLabels.pending_accept,action:'查看详情',desc:'',
      stage:stage||'pending_accept',task:null,delivered:null,registration};
  }
  global.CopyrightRegistrationStatus={resolve,stageLabels};
})(window);
