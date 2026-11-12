# PriceCraf Database Collections & Security Schema (Appwrite Database)

ระบบ **Pricecraft (PROTEX GROUP)** ออกแบบฐานข้อมูลบน **Appwrite Database (`pricecraf_db`)** โดยบังคับใช้ **Zero Public Access (`Role.any()` และ `Role.guests()` ถูกปิดทั้งหมด)** ร่วมกับ **Row-Level Security (RLS) / Document Security** และ **Role-Based Access Control (RBAC)** ผ่าน Backend Server SDK

---

## 1. Security & Access Model (RLS + RBAC)

- **Document Security (`documentSecurity: true`)**: เปิดใช้งานในทุก Collection ที่มีข้อมูลความลับทางธุรกิจ
- **Appwrite Teams / Roles Mapping**:
  - `Role.team('admins')`: ผู้ดูแลระบบ (`ADMIN`)
  - `Role.team('approvers')`: ผู้มีอำนาจอนุมัติ (`APPROVER`)
  - `Role.user(creatorUserId)`: พนักงานผู้สร้างเอกสาร (`STAFF`)
- **Strict Permission Lifecycle (`cost_requests` & `cost_items`)**:
  - **ขณะเป็น `DRAFT` หรือ `RETURNED`**:
    - `Permission.read(Role.user(creatorId))`, `Permission.update(Role.user(creatorId))`
    - `Permission.read(Role.team('approvers'))`, `Permission.read(Role.team('admins'))`
    - `Permission.update(Role.team('admins'))`
  - **เมื่อส่งอนุมัติ (`PENDING_APPROVAL`) หรืออนุมัติแล้ว (`APPROVED`)**:
    - ถอนสิทธิ์ `Permission.update(Role.user(creatorId))` ทันที เพื่อป้องกันผู้สร้างแก้ไขข้อมูลทับหลังจากส่งอนุมัติหรืออนุมัติแล้ว
    - อนุญาตเฉพาะ `Role.team('approvers')` และ `Role.team('admins')` ในการเปลี่ยนสถานะตาม State Machine

---

## 2. Collections Specification

### 2.1 `users` (Collection ID: `users`)
เก็บข้อมูลพนักงานและสิทธิ์การใช้งานภายในองค์กร (ห้ามลงทะเบียนเอง)

| Attribute | Type | Size | Required | Default | Description |
|---|---|---|---|---|---|
| `$id` | String | 36 | Yes | UUID | รหัสผู้ใช้งาน (ตรงกับ Appwrite Auth User ID) |
| `employeeCode` | String | 32 | Yes | - | รหัสพนักงาน (Unique) เช่น `EMP-0001` |
| `email` | Email | 160 | Yes | - | อีเมลองค์กร (Unique) |
| `passwordHash` | String | 256 | Yes | - | รหัสผ่านเข้ารหัสด้วย `scrypt` + Salt |
| `fullName` | String | 150 | Yes | - | ชื่อ-นามสกุลพนักงาน |
| `role` | Enum | 20 | Yes | `VIEWER` | `ADMIN`, `APPROVER`, `STAFF`, `VIEWER` |
| `department` | String | 100 | Yes | - | แผนกสังกัด |
| `position` | String | 100 | No | `""` | ตำแหน่งงาน |
| `status` | Enum | 20 | Yes | `ACTIVE` | `ACTIVE`, `DISABLED`, `LOCKED` |
| `mfaEnabled` | Boolean | - | Yes | `false` | เปิดใช้ MFA สำหรับ `ADMIN` และ `APPROVER` |
| `failedLoginAttempts`| Integer | - | Yes | `0` | จำนวนครั้งที่กรอกรหัสผ่านผิดติดต่อกัน |
| `lockedUntil` | DateTime | - | No | `null` | เวลาปลดล็อกอัตโนมัติเมื่อเกิด Brute-force |
| `approvalLimit` | String | 32 | No | `"0.00"` | วงเงินอนุมัติสูงสุด (Decimal String) |
| `lastLoginAt` | DateTime | - | No | `null` | วันเวลาที่เข้าสู่ระบบล่าสุด |
| `createdAt` | DateTime | - | Yes | Now | วันเวลาที่สร้าง |
| `updatedAt` | DateTime | - | Yes | Now | วันเวลาที่แก้ไขล่าสุด |
| `isDeleted` | Boolean | - | Yes | `false` | Soft Delete Flag |

---

### 2.2 `customers` (Collection ID: `customers`)
เก็บข้อมูลลูกค้าองค์กรสำหรับอ้างอิงในใบขอราคาต้นทุน

| Attribute | Type | Size | Required | Default | Description |
|---|---|---|---|---|---|
| `$id` | String | 36 | Yes | UUID | Primary ID |
| `customerCode` | String | 32 | Yes | - | รหัสลูกค้า (Unique) เช่น `CUST-0001` |
| `companyName` | String | 200 | Yes | - | ชื่อบริษัทลูกค้า |
| `contactPerson` | String | 150 | No | `""` | ชื่อผู้ติดต่อ |
| `phone` | String | 50 | No | `""` | เบอร์โทรศัพท์ |
| `email` | Email | 160 | No | `""` | อีเมลติดต่อ |
| `taxId` | String | 20 | No | `""` | เลขประจำตัวผู้เสียภาษี 13 หลัก |
| `address` | String | 1000 | No | `""` | ที่อยู่บริษัทลูกค้า |
| `paymentTerms` | String | 100 | No | `"Credit 30 Days"` | เงื่อนไขการชำระเงิน |
| `deliveryTerms` | String | 150 | No | `""` | เงื่อนไขการส่งมอบมาตรฐาน |
| `assignedSalesId` | String | 36 | No | `null` | รหัสพนักงานขายที่ดูแล |
| `status` | Enum | 20 | Yes | `ACTIVE` | `ACTIVE`, `INACTIVE` |
| `createdBy` | String | 36 | Yes | - | รหัสผู้สร้าง |
| `createdAt` | DateTime | - | Yes | Now | วันเวลาที่สร้าง |
| `updatedAt` | DateTime | - | Yes | Now | วันเวลาที่แก้ไขล่าสุด |
| `isDeleted` | Boolean | - | Yes | `false` | Soft Delete Flag |

---

### 2.3 `products` (Collection ID: `products`)
เก็บทะเบียนสินค้า ขนาด Specification และราคาต้นทุนมาตรฐาน

| Attribute | Type | Size | Required | Default | Description |
|---|---|---|---|---|---|
| `$id` | String | 36 | Yes | UUID | Primary ID |
| `productCode` | String | 50 | Yes | - | รหัสสินค้า (Unique) เช่น `HT-SP-1208` |
| `name` | String | 250 | Yes | - | ชื่อสินค้า |
| `category` | String | 100 | Yes | `"Heater"` | หมวดหมู่สินค้า |
| `description` | String | 2000 | No | `""` | รายละเอียดสินค้า (รองรับหลายบรรทัด) |
| `specification` | String | 2000 | No | `""` | ขนาด / Specification (รองรับหลายบรรทัด) |
| `unit` | String | 30 | Yes | `"ชิ้น"` | หน่วยนับ (`ชิ้น`, `เส้น`, `ชุด`, `ตัว`) |
| `standardUnitCost` | String | 32 | Yes | `"0.00"` | ราคาต้นทุนมาตรฐานต่อหน่วย (Decimal String) |
| `defaultDelivery` | String | 150 | No | `""` | ระยะเวลาจัดส่งมาตรฐาน |
| `defaultWhtApplicable`| Boolean | - | Yes | `false` | เข้าข่ายหักภาษี ณ ที่จ่าย 3% หรือไม่ |
| `status` | Enum | 20 | Yes | `ACTIVE` | `ACTIVE`, `DISCONTINUED` |
| `createdBy` | String | 36 | Yes | - | รหัสผู้สร้าง |
| `createdAt` | DateTime | - | Yes | Now | วันเวลาที่สร้าง |
| `updatedAt` | DateTime | - | Yes | Now | วันเวลาที่แก้ไขล่าสุด |
| `isDeleted` | Boolean | - | Yes | `false` | Soft Delete Flag |

---

### 2.4 `cost_requests` (Collection ID: `cost_requests`)
เก็บข้อมูลส่วนหัวเอกสารและยอดสรุปของใบขอราคาต้นทุนสินค้า

| Attribute | Type | Size | Required | Default | Description |
|---|---|---|---|---|---|
| `$id` | String | 36 | Yes | UUID | Primary ID |
| `documentNumber` | String | 50 | Yes | - | เลขที่เอกสารอัตโนมัติ (Unique) เช่น `PC-202611-0001` |
| `baseDocumentNumber`| String | 50 | Yes | - | เลขที่เอกสารหลักก่อนทำ Revision |
| `revisionNumber` | Integer | - | Yes | `0` | ลำดับการแก้ไขหลังอนุมัติ (`0` = ต้นฉบับ) |
| `parentRequestId` | String | 36 | No | `null` | อ้างอิงเอกสารต้นฉบับกรณีสร้าง Revision |
| `documentDate` | String | 10 | Yes | - | วันที่เอกสาร (`YYYY-MM-DD`) |
| `customerId` | String | 36 | Yes | - | รหัสอ้างอิงลูกค้า (`customers.$id`) |
| `customerName` | String | 200 | Yes | - | ชื่อลูกค้า |
| `customerCode` | String | 32 | No | `""` | รหัสลูกค้า |
| `salespersonId` | String | 36 | No | `null` | รหัสผู้ขาย (`users.$id`) |
| `salespersonName` | String | 150 | Yes | - | ชื่อผู้ขาย / พนักงานขาย |
| `department` | String | 100 | Yes | - | แผนกผู้ขอราคา |
| `status` | Enum | 30 | Yes | `DRAFT` | `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `RETURNED`, `REJECTED`, `CANCELLED` |
| `deliveryTerms` | String | 300 | No | `""` | เงื่อนไขการส่งมอบ |
| `notes` | String | 2000 | No | `""` | หมายเหตุท้ายเอกสาร |
| `vatRate` | String | 16 | Yes | `"7.00"` | อัตรา VAT (%) |
| `shippingCharge` | String | 32 | Yes | `"0.00"` | ค่าขนส่ง |
| `shippingVatMode` | Enum | 30 | Yes | `NON_TAXABLE` | `NON_TAXABLE`, `TAXABLE_EXCLUSIVE`, `TAXABLE_INCLUSIVE` |
| `discountAmount` | String | 32 | Yes | `"0.00"` | ส่วนลด |
| `subtotal` | String | 32 | Yes | `"0.00"` | ยอดรวมรายการสินค้าก่อน VAT |
| `taxableAmount` | String | 32 | Yes | `"0.00"` | ยอดฐานภาษี |
| `vatAmount` | String | 32 | Yes | `"0.00"` | ยอด VAT 7% (`subtotal * 0.07`) |
| `grandTotal` | String | 32 | Yes | `"0.00"` | ยอดรวมสุทธิ (`subtotal + vatAmount + shippingCharge - discount`) |
| `withholdingTaxTotal`| String | 32 | Yes | `"0.00"` | ยอดหักภาษี ณ ที่จ่าย 3% (แสดงแยกต่างหาก) |
| `netPayableIfWhtDeducted`| String| 32 | Yes | `"0.00"` | ยอดอ้างอิงกรณีหักภาษี ณ ที่จ่าย 3% |
| `version` | Integer | - | Yes | `1` | เลขเวอร์ชันสำหรับ Optimistic Locking |
| `createdBy` | String | 36 | Yes | - | รหัสผู้จัดทำ (`users.$id`) |
| `createdByName` | String | 150 | Yes | - | ชื่อผู้จัดทำ |
| `approvedBy` | String | 36 | No | `null` | รหัสผู้อนุมัติ |
| `approvedByName` | String | 150 | No | `null` | ชื่อผู้อนุมัติ |
| `approvedAt` | DateTime | - | No | `null` | วันเวลาที่อนุมัติ |
| `createdAt` | DateTime | - | Yes | Now | วันเวลาที่สร้าง |
| `updatedAt` | DateTime | - | Yes | Now | วันเวลาที่แก้ไขล่าสุด |
| `isDeleted` | Boolean | - | Yes | `false` | Soft Delete Flag |

---

### 2.5 `cost_items` (Collection ID: `cost_items`)
เก็บรายการสินค้าในแต่ละแถวของเอกสารขอราคาต้นทุน เชื่อมด้วย `requestId`

| Attribute | Type | Size | Required | Default | Description |
|---|---|---|---|---|---|
| `$id` | String | 36 | Yes | UUID | Primary ID |
| `requestId` | String | 36 | Yes | - | รหัสเอกสารขอราคาต้นทุน (`cost_requests.$id`) |
| `lineNumber` | Integer | - | Yes | - | ลำดับแถว (`1, 2, 3, ...`) |
| `productId` | String | 36 | No | `null` | รหัสสินค้าอ้างอิง (`products.$id`) |
| `productCode` | String | 50 | Yes | - | รหัสสินค้า |
| `productName` | String | 250 | Yes | - | รายการ / ชื่อสินค้า |
| `description` | String | 2000 | No | `""` | รายละเอียดสินค้าเพิ่มเติม (หลายบรรทัด) |
| `specification` | String | 2000 | No | `""` | ขนาด / Specification (หลายบรรทัด) |
| `quantity` | String | 32 | Yes | `"1"` | จำนวน (`> 0`) |
| `unit` | String | 30 | Yes | `"ชิ้น"` | หน่วยนับ |
| `unitCost` | String | 32 | Yes | `"0.00"` | ราคาต้นทุนต่อหน่วย (`>= 0`) |
| `lineTotal` | String | 32 | Yes | `"0.00"` | ราคารวมของแถว (`quantity * unitCost`) |
| `wht3PercentApplicable`| Boolean | - | Yes | `false` | เข้าข่ายหักภาษี ณ ที่จ่าย 3% หรือไม่ |
| `wht3PercentAmount` | String | 32 | Yes | `"0.00"` | ยอดหักภาษี 3% ของแถว (`lineTotal * 0.03`) |
| `deliverySchedule` | String | 150 | No | `""` | กำหนดการส่งมอบ |
| `remark` | String | 500 | No | `""` | หมายเหตุ |
| `createdBy` | String | 36 | Yes | - | ผู้สร้างรายการ |
| `createdAt` | DateTime | - | Yes | Now | วันเวลาที่สร้าง |
| `updatedAt` | DateTime | - | Yes | Now | วันเวลาที่แก้ไขล่าสุด |

---

### 2.6 `approvals` (Collection ID: `approvals`)
เก็บประวัติการส่งอนุมัติ อนุมัติ ส่งกลับแก้ไข หรือไม่อนุมัติ (Immutable Append-Only)

| Attribute | Type | Size | Required | Default | Description |
|---|---|---|---|---|---|
| `$id` | String | 36 | Yes | UUID | Primary ID |
| `requestId` | String | 36 | Yes | - | รหัสเอกสาร (`cost_requests.$id`) |
| `documentNumber` | String | 50 | Yes | - | เลขที่เอกสาร |
| `action` | Enum | 30 | Yes | - | `SUBMIT`, `APPROVE`, `RETURN`, `REJECT`, `CANCEL`, `REVISE` |
| `previousStatus` | String | 30 | Yes | - | สถานะก่อนดำเนินการ |
| `newStatus` | String | 30 | Yes | - | สถานะหลังดำเนินการ |
| `actorId` | String | 36 | Yes | - | รหัสผู้ดำเนินการ |
| `actorName` | String | 150 | Yes | - | ชื่อผู้ดำเนินการ |
| `actorRole` | String | 30 | Yes | - | บทบาทผู้ดำเนินการ |
| `comment` | String | 1000 | No | `""` | เหตุผลหรือความเห็นประกอบการพิจารณา |
| `verifiedGrandTotal`| String | 32 | Yes | `"0.00"` | ยอดรวมสุทธิที่ Backend คำนวณยืนยันซ้ำ |
| `createdAt` | DateTime | - | Yes | Now | วันเวลาที่บันทึก |

---

### 2.7 `audit_logs` (Collection ID: `audit_logs`)
เก็บบันทึกเหตุการณ์ด้านความปลอดภัยและการใช้งานทั้งหมด (Immutable Append-Only)

| Attribute | Type | Size | Required | Default | Description |
|---|---|---|---|---|---|
| `$id` | String | 36 | Yes | UUID | Primary ID |
| `eventType` | String | 64 | Yes | - | ประเภทเหตุการณ์ |
| `severity` | Enum | 20 | Yes | `INFO` | `INFO`, `WARNING`, `CRITICAL` |
| `actorId` | String | 36 | No | `null` | รหัสผู้กระทำ |
| `actorEmail` | String | 160 | No | `""` | อีเมลผู้กระทำ |
| `actorRole` | String | 30 | No | `""` | บทบาทผู้กระทำ |
| `targetType` | String | 50 | Yes | - | ประเภทข้อมูลเป้าหมาย |
| `targetId` | String | 64 | No | `null` | รหัสข้อมูลเป้าหมาย |
| `ipAddress` | String | 64 | No | `""` | IP Address |
| `userAgent` | String | 256 | No | `""` | ข้อมูล Browser |
| `summary` | String | 500 | Yes | - | สรุปเหตุการณ์ |
| `metadataJson` | String | 4000 | No | `"{}"` | ข้อมูลประกอบที่กรองข้อมูลลับออกแล้ว |
| `createdAt` | DateTime | - | Yes | Now | วันเวลาที่เกิดเหตุการณ์ |

---

### 2.8 `system_settings` (Collection ID: `system_settings`)
เก็บการตั้งค่าองค์กร รูปแบบเลขเอกสารอัตโนมัติ และอัตราภาษีเริ่มต้น

