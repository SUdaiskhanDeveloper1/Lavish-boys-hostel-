import { forwardRef } from 'react';
import type { FeePayment, HostelSettings } from '@/types/models';
import { formatCurrency, formatDate, monthLabel } from '@/utils/format';

interface ReceiptProps {
  payment: FeePayment;
  settings: HostelSettings;
  studentName: string;
  roomNumber?: string | null;
  format: 'a4' | 'thermal';
}

/**
 * Printable receipt. Rendered off-screen and driven by react-to-print.
 * Supports A4 (professional) and 80mm thermal layouts.
 */
const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(function Receipt(
  { payment, settings, studentName, roomNumber, format },
  ref,
) {
  const thermal = format === 'thermal';
  const width = thermal ? 300 : 794; // 80mm ≈ 300px, A4 ≈ 794px @96dpi

  return (
    <div ref={ref} style={{ background: '#fff', color: '#111' }}>
      <div
        style={{
          width,
          margin: '0 auto',
          padding: thermal ? 16 : 48,
          fontFamily: thermal ? 'monospace' : 'Georgia, serif',
          fontSize: thermal ? 12 : 14,
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #1B2A4A', paddingBottom: 12 }}>
          <img src="/logo-mark.svg" alt="logo" style={{ height: thermal ? 44 : 64 }} />
          <h1 style={{ margin: '8px 0 2px', fontSize: thermal ? 16 : 24, color: '#1B2A4A' }}>
            {settings.hostel_name}
          </h1>
          {settings.address && <div style={{ fontSize: thermal ? 10 : 12 }}>{settings.address}</div>}
          {settings.phone && <div style={{ fontSize: thermal ? 10 : 12 }}>Ph: {settings.phone}</div>}
          <div style={{ fontWeight: 700, marginTop: 8, letterSpacing: 2 }}>FEE RECEIPT</div>
        </div>

        {/* Meta */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            margin: '12px 0',
            fontSize: thermal ? 11 : 13,
          }}
        >
          <span>
            <strong>Receipt #:</strong> {payment.receipt_no}
          </span>
          <span>
            <strong>Date:</strong> {formatDate(payment.paid_on)}
          </span>
        </div>

        <Row label="Student" value={studentName} thermal={thermal} />
        <Row label="Room / Seat" value={`${roomNumber ?? '—'} / ${payment.seat_number ?? '—'}`} thermal={thermal} />
        <Row label="For Month" value={monthLabel(payment.fee_month)} thermal={thermal} />
        <Row label="Payment" value={payment.method.toUpperCase()} thermal={thermal} />
        {payment.cash_amount > 0 && (
          <Row label="Cash" value={formatCurrency(payment.cash_amount)} thermal={thermal} />
        )}
        {payment.online_amount > 0 && (
          <Row label="Online" value={formatCurrency(payment.online_amount)} thermal={thermal} />
        )}

        {/* Total */}
        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: '2px solid #1B2A4A',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: thermal ? 15 : 20,
            fontWeight: 700,
          }}
        >
          <span>TOTAL</span>
          <span>{formatCurrency(payment.amount)}</span>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, fontSize: thermal ? 10 : 12 }}>
          <div>Collected by: {payment.collected_by ?? '—'}</div>
          <div style={{ marginTop: 24, textAlign: 'center', color: '#555' }}>
            {settings.receipt_footer}
          </div>
        </div>
      </div>
    </div>
  );
});

function Row({ label, value, thermal }: { label: string; value: string; thermal: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '4px 0',
        fontSize: thermal ? 11 : 13,
        borderBottom: '1px dashed #ddd',
      }}
    >
      <span style={{ color: '#555' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

export default Receipt;
