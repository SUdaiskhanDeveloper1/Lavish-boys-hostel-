import { useRef, useState } from 'react';
import { Modal, Button, Segmented, Space, message } from 'antd';
import { PrinterOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';
import jsPDF from 'jspdf';
import type { FeePayment, HostelSettings } from '@/types/models';
import Receipt from './Receipt';

interface Props {
  open: boolean;
  onClose: () => void;
  payment: FeePayment | null;
  settings: HostelSettings;
}

/** Preview + print + PDF-download wrapper around <Receipt>. */
export default function ReceiptModal({ open, onClose, payment, settings }: Props) {
  const [format, setFormat] = useState<'a4' | 'thermal'>('a4');
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: payment?.receipt_no ?? 'receipt',
  });

  const handlePdf = async () => {
    if (!printRef.current || !payment) return;
    try {
      const doc = new jsPDF({ unit: 'px', format: format === 'a4' ? 'a4' : [80, 200] });
      await doc.html(printRef.current, {
        callback: (d) => d.save(`${payment.receipt_no}.pdf`),
        x: 0,
        y: 0,
        html2canvas: { scale: format === 'a4' ? 0.6 : 0.9 },
      });
    } catch {
      message.error('Could not generate PDF');
    }
  };

  const studentName = payment?.student?.full_name ?? '—';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={format === 'a4' ? 860 : 380}
      title={`Receipt ${payment?.receipt_no ?? ''}`}
      footer={
        <Space>
          <Segmented
            value={format}
            onChange={(v) => setFormat(v as 'a4' | 'thermal')}
            options={[
              { label: 'A4', value: 'a4' },
              { label: 'Thermal', value: 'thermal' },
            ]}
          />
          <Button icon={<FilePdfOutlined />} onClick={handlePdf}>
            Download PDF
          </Button>
          <Button type="primary" icon={<PrinterOutlined />} onClick={() => handlePrint()}>
            Print
          </Button>
        </Space>
      }
    >
      <div style={{ maxHeight: '70vh', overflow: 'auto', background: '#f0f2f5', padding: 16 }}>
        {payment && (
          <Receipt
            ref={printRef}
            payment={payment}
            settings={settings}
            studentName={studentName}
            roomNumber={payment.room_id ? payment.seat_number : null}
            format={format}
          />
        )}
      </div>
    </Modal>
  );
}
