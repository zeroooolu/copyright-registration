# 著作权登记：支付提交后拆分独立申请

## 1. 目的

星球发行的著作权登记支持用户在一次登记操作中同时选择：

- 登记录音的著作权
- 登记词曲的著作权

用户侧在填写、签约和付款阶段保持一次连续操作；**支付成功并提交后，系统按登记项目生成独立登记申请**。

核心原则：

> 提交前是一笔登记任务；提交后一个登记项目对应一条登记申请。

例如用户同时选择录音和词曲：

```text
一次登记任务
  ├─ 登记录音的著作权 ¥9.9
  └─ 登记词曲的著作权 ¥9.9
          ↓
一次签约
          ↓
一次支付 ¥19.8
          ↓
支付成功并提交
          ↓
  ├─ 录音登记申请 A → 独立状态 → 独立补正 → 独立证书
  └─ 词曲登记申请 B → 独立状态 → 独立补正 → 独立证书
```

---

## 2. 建议的数据模型

### 2.1 RegistrationSubmission｜登记提交

代表用户提交前的一次登记任务，也是录音/词曲两个项目的共同上下文。

建议至少包含：

```text
id / submission_no
user_id
cp_id
work_id
selected_types[]        recording / composition
status                  draft / pending_sign / pending_payment / submitted
authorization_id
payment_order_id
created_at
submitted_at
```

提交前的草稿、待签约、待付款状态属于 `RegistrationSubmission`，不属于最终登记申请。

### 2.2 PaymentOrder｜支付订单

一次提交只产生一笔支付订单。

```text
id / order_no
submission_id
item_count
item_fee                9.90
order_total
balance_deduct
paid_amount
payment_method
payment_status
paid_at
```

可提现余额抵扣发生在支付订单层，不要求分摊到单条登记申请。

### 2.3 RegistrationApplication｜登记申请

支付成功并提交后，根据 `selected_types` 逐项生成。

```text
id / application_no
submission_id
payment_order_id
work_id
registration_type       recording / composition
item_fee                9.90
status
accepted_at
completed_at
certificate_id
created_at
```

如果一次提交选择两个登记项目，应生成两条 `RegistrationApplication`。

---

## 3. 拆分时机

**唯一拆分点：支付成功并完成提交。**

提交前不要提前生成正式登记申请，避免草稿、签约失败、支付失败产生无效申请记录。

建议服务端流程：

```text
支付成功回调 / 余额全额抵扣确认
        ↓
锁定 RegistrationSubmission
        ↓
校验 submission 尚未 submitted
        ↓
创建 PaymentOrder / 确认支付结果
        ↓
按照 selected_types 批量创建 RegistrationApplication
        ↓
更新 submission.status = submitted
        ↓
提交各 RegistrationApplication 到登记接口
```

该操作需要保证幂等，避免支付回调重试生成重复登记申请。

建议使用：

```text
unique(submission_id, registration_type)
```

作为数据库唯一约束之一。

---

## 4. 状态归属

### 4.1 提交前状态｜RegistrationSubmission

```text
draft            草稿
pending_sign     待签约
pending_payment  待付款
submitted        已提交 / 已拆分
```

### 4.2 提交后状态｜RegistrationApplication

每条申请独立维护：

```text
pending_accept         待受理
pending_supplement     待补证
pending_registration   待登记
pending_first_review   待初审
pending_re_review      待复审
pending_certificate    待制证
issued                 已发证
```

`待补证` 是条件状态，不代表所有申请必经。

录音和词曲申请必须允许出现不同状态，例如：

```text
录音申请：待初审
词曲申请：待补证
```

其中一条待补证，不应暂停或覆盖另一条申请的办理状态。

---

## 5. 30 个工作日规则

官方说明：

> 自受理申请材料之日起 30 个工作日内完成作品版权登记事项，申请人补正时间不计算在内。

系统按**单条 RegistrationApplication** 计算办理状态和时间：

- `pending_accept`：尚未开始计算 30 个工作日。
- 受理后：开始计算当前申请办理时限。
- `pending_supplement`：当前申请补正期间暂停计时。
- 另一条同次提交申请不受影响。
- `issued`：当前申请完成。

---

## 6. 前端展示规则

### 6.1 填写 / 签约 / 付款

始终按一次 `RegistrationSubmission` 展示。

同时选择两项时：

```text
登记录音的著作权  ¥9.9
登记词曲的著作权  ¥9.9
合计               ¥19.8
```

付款前明确提示：

> 支付提交后，每个登记项目将生成一条独立登记申请，分别办理、分别更新状态和证书。

### 6.2 支付成功页

支付成功后直接展示系统生成的申请列表：

```text
申请 1
登记录音的著作权
CRxxxxxxxx0001
待受理

申请 2
登记词曲的著作权
CRxxxxxxxx0002
待受理
```

同时保留一笔共享：

```text
submission_no
payment_order_no
order_total
balance_deduct
paid_amount
```

### 6.3 我的登记列表

规则：

- 提交前：一行 = 一条 `RegistrationSubmission`。
- 支付提交后：一行 = 一条 `RegistrationApplication`。
- 同次提交产生的多条申请通过 `submission_no` 做轻量关联展示。
- 列表状态必须显示单条申请真实状态，不再使用一个笼统的“办理中”覆盖多个申请。

示例：

```text
青花瓷  登记录音的著作权  待初审  CRSUB001
青花瓷  登记词曲的著作权  待补证  CRSUB001
```

### 6.4 登记详情

支付提交后的详情页必须是 **单 RegistrationApplication 详情**。

页面只展示当前申请的：

- application_no
- registration_type
- 当前状态
- 官方办理节点
- 补正要求
- 当前申请材料
- 状态记录
- 登记证书

同时提供“同次提交的登记”区块，用 `submission_id` 查询其他申请，并允许快速切换。

费用区域需区分：

```text
本项登记服务费       ¥9.90
本次提交共 2 项      ¥19.80
余额抵扣             -¥5.00   // 共享订单
本次订单实际支付      ¥14.80   // 共享订单
```

不要把 ¥14.80 解释为当前单条申请的实付金额。

---

## 7. API 建议

### 创建/更新提交任务

```text
POST /copyright/registration-submissions
PATCH /copyright/registration-submissions/{id}
```

### 完成支付并提交

建议由服务端原子完成拆分：

```text
POST /copyright/registration-submissions/{id}/submit
```

返回：

```json
{
  "submission_no": "CRSUB202608260001",
  "payment_order_no": "CRPAY202608260001",
  "applications": [
    {
      "application_no": "CR202608260001",
      "registration_type": "recording",
      "status": "pending_accept"
    },
    {
      "application_no": "CR202608260002",
      "registration_type": "composition",
      "status": "pending_accept"
    }
  ]
}
```

### 我的登记列表

建议接口返回统一视图或分别返回 submission/application，由前端按规则展示。

提交后的主查询对象应以 `RegistrationApplication` 为主。

### 登记详情

```text
GET /copyright/registration-applications/{application_no}
```

同时返回：

```text
submission
payment_order
sibling_applications[]
```

用于详情页“同次提交的登记”切换。

---

## 8. 验收标准

1. 只选录音并支付后，只生成 1 条录音登记申请。
2. 只选词曲并支付后，只生成 1 条词曲登记申请。
3. 同时选择录音和词曲并支付后，生成 2 条申请，且 `submission_id`、`payment_order_id` 相同。
4. 两条申请拥有不同 `application_no`。
5. 两条申请状态可以独立变化。
6. 一条进入待补证时，另一条可以继续进入初审/复审等状态。
7. 每条申请独立生成、关联自己的登记证书。
8. 首页/我的登记在支付后按两行展示。
9. 详情页一次只展示一条申请，并可切换同次提交的另一条申请。
10. 余额抵扣和实际支付只记录在共享支付订单，不重复扣款或按申请再次结算。
11. 支付回调重试不得重复生成申请。
12. 官方 30 个工作日办理时限按单条申请的受理/补正状态处理。
