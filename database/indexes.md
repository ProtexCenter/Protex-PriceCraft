# PriceCraf Appwrite Database Indexes Specification

รายการ Indexes สำหรับทุก Collection เพื่อประสิทธิภาพในการค้นหา กรองตามสิทธิ์ RBAC/RLS และป้องกันข้อมูลซ้ำ

| Collection | Index Key | Type | Attributes | Order | Purpose |
|---|---|---|---|---|---|
| `users` | `idx_users_email_uq` | `unique` | `email` | `ASC` | ป้องกันอีเมลซ้ำและใช้ตรวจสอบตอนเข้าสู่ระบบ |
| `users` | `idx_users_empcode_uq` | `unique` | `employeeCode` | `ASC` | ป้องกันรหัสพนักงานซ้ำ |
| `customers` | `idx_customers_code_uq` | `unique` | `customerCode` | `ASC` | ป้องกันรหัสลูกค้าซ้ำ |
| `customers` | `idx_customers_search_ft`| `fulltext`| `companyName`, `contactPerson` | - | ค้นหาชื่อลูกค้าอย่างรวดเร็ว |
| `products` | `idx_products_code_uq` | `unique` | `productCode` | `ASC` | ป้องกันรหัสสินค้าซ้ำ |
| `products` | `idx_products_search_ft` | `fulltext`| `productCode`, `name`, `specification` | - | ค้นหาสินค้าใน Data Grid |
| `cost_requests`| `idx_costreq_docnum_uq` | `unique` | `documentNumber` | `ASC` | ป้องกันเลขที่เอกสารซ้ำในระดับ Database |
| `cost_requests`| `idx_costreq_owner_stat`| `key` | `isDeleted`, `createdBy`, `status`, `createdAt` | `ASC`, `ASC`, `ASC`, `DESC` | กรองเอกสารตามสิทธิ์ผู้สร้าง (RLS) |
| `cost_requests`| `idx_costreq_status_dt` | `key` | `isDeleted`, `status`, `documentDate` | `ASC`, `ASC`, `DESC` | คิวรออนุมัติสำหรับ Approver/Admin |
| `cost_items` | `idx_costitems_req_line`| `key` | `requestId`, `lineNumber` | `ASC`, `ASC` | ดึงแถวรายการสินค้าตามลำดับในเอกสาร |
| `approvals` | `idx_approvals_req_time`| `key` | `requestId`, `createdAt` | `ASC`, `ASC` | ประวัติการอนุมัติของแต่ละเอกสาร |
| `audit_logs` | `idx_audit_created_desc`| `key` | `createdAt` | `DESC` | ตรวจสอบ Audit Trail ล่าสุด |

