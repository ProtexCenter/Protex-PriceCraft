# PriceCraf REST API Specification

ทุก API Route ภายใต้ `/api/*` บังคับตรวจสอบ Authentication Token / Session Cookie (`HttpOnly`, `SameSite=Strict`), Session Timeout, CSRF Token (`X-CSRF-Token`), และสิทธิ์ RBAC/RLS

- `POST /api/auth/login` — เข้าสู่ระบบ (พร้อม Brute-force protection & MFA)
- `POST /api/auth/logout` — ออกจากระบบและทำลายเซสชัน
- `GET /api/auth/me` — ตรวจสอบเซสชันและสิทธิ์ผู้ใช้งานปัจจุบัน
- `GET /api/products`, `POST /api/products`, `PUT /api/products/:id` — จัดการข้อมูลสินค้า
- `GET /api/customers`, `POST /api/customers`, `PUT /api/customers/:id` — จัดการข้อมูลลูกค้า
- `POST /api/costs/calculate` — คำนวณยอดเงินจาก Backend
- `GET /api/costs`, `POST /api/costs`, `GET /api/costs/:id`, `PUT /api/costs/:id` — จัดการเอกสารขอราคาต้นทุน
- `POST /api/approvals/:requestId/submit` — ส่งเอกสารขออนุมัติ
- `POST /api/approvals/:requestId/approve` — อนุมัติเอกสาร
- `POST /api/approvals/:requestId/return` — ส่งกลับแก้ไขพร้อมเหตุผล
- `POST /api/approvals/:requestId/reject` — ไม่อนุมัติพร้อมเหตุผล
- `GET /api/costs/:id/export/:format` — ส่งออกเอกสาร (`pdf`, `xlsx`, `docx`, `print-json`)

