# MVP：证书批量上传、匹配与发放原型

> 本期仅修改 `mvp/` 下的静态原型，不依赖真实官方 API、服务端 OCR 或服务器文件存储；**此演示不能作为真实版权证书交付系统使用**。

## 原型入口

- 后台：`mvp/admin/pages/certificate-upload.html`
- 登记申请列表：`mvp/admin/pages/registration-applications.html`
- 登记申请详情：`mvp/admin/pages/registration-application-detail.html?id=CR202510150001`
- 用户登记详情：`mvp/frontend/star-release/registration-detail.html?app_no=CR202510150001&title=关上世界的窗&registration_name=关上世界的窗&status=issued`

## 操作流程

1. 在后台「证书上传」点击 **批量同步作品登记号**。演示数据中 `CR202510150001` 的 WorkID 为 `2145541433589761`，模拟返回 `沪作登字-2025-S-03886487`。**这是前端假数据，不代表真实官方接口返回的关联**。
2. 点击 **生成并上传演示证书**，或者上传真实 PNG。真实 PNG 会尝试加载浏览器端 Tesseract.js 进行中文 OCR；无法识别或组件不可用时，人工录入登记号。演示证书使用预设文字，不声称 OCR 识别成功。
3. 后台核对唯一作品登记号及作品名称、著作权人，异常记录进入 **人工处理**。存在重复登记号、PNG 内容重复、辅助信息不一致时禁止直接发放。
4. 选择唯一匹配记录，点击 **确认批量发放**；或在详情右侧执行单张发放。前台「登记详情」通过本地演示数据展示 PNG 预览、下载。
5. 已发放证书登记号锁定；如需更换证书，真实系统需设计授权换证/作废审计流程。

## 官方接口

```http
GET /Works/Index/GetWorksRegNumber?WorkID=2145541433589761
Authorization: <access_token>
```

示例结构：

```json
{
  "code": 1,
  "msg": "",
  "data": {"RegNumber": "沪作登字-2020-H-00000127"}
}
```

必须由服务端持凭证调用、处理失败及重试；**WorkID 是长整数字符串，应以字符串或数据库 BIGINT 承载**，避免前端 Number 精度损失。登记申请的内部 `application_id`、官方 `WorkID` 和 `RegNumber` 必须独立存储。当前页面把旧「登记 ID」作为 WorkID 候选字段展示，正式接入需核实来源是官方「添加作品」接口返回值。

## 推荐服务端数据

- `registration_application`：`official_work_id`、`official_registration_no`、`reg_no_sync_status`、`reg_no_synced_at`、`certificate_delivery_status`
- `certificate_upload_batch`：`id`、`created_by`、`total_count`、`matched_count`、`exception_count`、`created_at`
- `certificate`：`id`、`batch_id`、`application_id`、`reg_number`、`file_key`、`sha256`、`ocr_text`、`match_status`、`delivered_at`、`delivered_by`
- `certificate_audit`：`certificate_id`、`actor_id`、`action`、`before`、`after`、`created_at`

建议将文件存储在私有对象存储，下载使用短时签名 URL，服务端强制验证用户对申请的访问权限。OCR 置信度不足、无唯一登记号、资料不一致、重复文件、重复已发证关联必须阻断自动交付。

## 演示存储说明

- 登记号及证书元数据保存在同源浏览器 `localStorage`
- PNG 二进制保存于同源浏览器 `IndexedDB`，支持在同一浏览器中真正打开/下载刚上传的文件
- 无服务端存储、无跨设备同步，也不会通知真实用户
- OCR 可尝试从 CDN 加载 Tesseract.js 的中文语言包，网络失败时只能手动录入
- 演示数据的 WorkID 与作品登记号关联是预设样例，不构成真实数据映射
