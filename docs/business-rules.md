# PriceCraf Business Rules & Calculation Specification

## 1. กฎการคำนวณราคาต้นทุนและภาษี (Calculation Rules)
1. **ราคารวมของแต่ละแถว (`lineTotal`)**:
   $$\text{Line Total} = \text{round}_2(\text{Quantity} \times \text{Unit Cost})$$
2. **ยอดรวมก่อนภาษี (`subtotal`)**:
   $$\text{Subtotal} = \sum \text{Line Total}$$
3. **ภาษีมูลค่าเพิ่ม (`vatAmount`)**:
   $$\text{VAT 7\%} = \text{round}_2(\text{Taxable Amount} \times 0.07)$$
4. **ยอดรวมสุทธิ (`grandTotal`)**:
   $$\text{Grand Total} = \text{Subtotal} - \text{Discount} + \text{VAT 7\%} + \text{Shipping Charge}$$
5. **หักภาษี ณ ที่จ่าย 3% (`withholdingTaxTotal`) และการส่งมอบ (`deliverySchedule`)**:
   - คำนวณแยกแสดง (`Line Total * 0.03`) สำหรับรายการที่ระบุหักภาษี 3% โดยไม่นำไปหักออกจาก `Grand Total` โดยอัตโนมัติ
   - Backend คำนวณยอดทั้งหมดซ้ำด้วย Fixed-Point BigInt Decimal Arithmetic ทุกครั้งก่อนบันทึกและก่อนอนุมัติ

## 2. กฎด้านสิทธิ์และขั้นตอนการอนุมัติ (RBAC & Workflow State Machine)
- **Roles**: `ADMIN`, `APPROVER`, `STAFF`, `VIEWER`
- **Statuses**: `DRAFT` → `PENDING_APPROVAL` → `APPROVED` / `RETURNED` / `REJECTED` / `CANCELLED`
- พนักงาน (`STAFF`) แก้ไขได้เฉพาะเอกสารตนเองในสถานะ `DRAFT` หรือ `RETURNED`
- เมื่ออนุมัติ (`APPROVED`) แล้ว ห้ามแก้ไขทับโดยตรง หากต้องแก้ไขต้องสร้าง Revision (`-R1`, `-R2`)

