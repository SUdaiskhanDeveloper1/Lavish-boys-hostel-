import { useState } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Tag,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  Select,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, SearchOutlined, PrinterOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PAGE_SIZE } from '@/constants';
import { listFees, collectFee, type FeeQuery } from '@/services/fees.service';
import { listStudents } from '@/services/students.service';
import { getSettings } from '@/services/settings.service';
import type { FeePayment, PaymentMethod } from '@/types/models';
import { formatCurrency, formatDate, monthLabel, monthStart } from '@/utils/format';
import ReceiptModal from '@/components/receipt/ReceiptModal';

const { Title } = Typography;

export default function FeesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<FeePayment | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [form] = Form.useForm();
  const debounced = useDebouncedValue(search, 400);
  const debStudent = useDebouncedValue(studentSearch, 400);

  const query: FeeQuery = { page, pageSize: PAGE_SIZE, search: debounced };
  const { data, isLoading } = useQuery({ queryKey: ['fees', query], queryFn: () => listFees(query) });
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const { data: students } = useQuery({
    queryKey: ['students-lookup', debStudent],
    queryFn: () => listStudents({ page: 1, pageSize: 20, search: debStudent, status: 'active' }),
  });

  const method: PaymentMethod = Form.useWatch('method', form) ?? 'cash';

  const collectMut = useMutation({
    mutationFn: collectFee,
    onSuccess: (rec) => {
      message.success(`Receipt ${rec.receipt_no} generated`);
      qc.invalidateQueries({ queryKey: ['fees'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setOpen(false);
      setReceipt(rec);
    },
    onError: (e: Error) => message.error(e.message),
  });

  const openCollect = () => {
    form.resetFields();
    form.setFieldsValue({ method: 'cash', paid_on: dayjs(), fee_month: dayjs() });
    setOpen(true);
  };

  const onFinish = (v: Record<string, unknown>) => {
    const student = students?.data.find((s) => s.id === v.student_id);
    const amount = Number(v.amount);
    const cash = v.method === 'online' ? 0 : v.method === 'mixed' ? Number(v.cash_amount ?? 0) : amount;
    const online = v.method === 'cash' ? 0 : v.method === 'mixed' ? amount - Number(v.cash_amount ?? 0) : amount;
    collectMut.mutate({
      student_id: v.student_id as string,
      room_id: student?.room_id ?? null,
      seat_number: student?.seat_number ?? null,
      fee_month: monthStart(v.fee_month as dayjs.Dayjs),
      amount,
      cash_amount: cash,
      online_amount: online,
      method: v.method as PaymentMethod,
      paid_on: dayjs(v.paid_on as dayjs.Dayjs).format('YYYY-MM-DD'),
      collected_by: v.collected_by as string,
      notes: v.notes as string,
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Title level={3} style={{ margin: 0 }}>
          Fees & Receipts
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCollect}>
          Collect Fee
        </Button>
      </div>

      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search receipt number"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        style={{ width: 260, margin: '16px 0' }}
      />

      <Table<FeePayment>
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: data?.total ?? 0,
          onChange: setPage,
          showTotal: (t) => `${t} receipts`,
        }}
        columns={[
          { title: 'Receipt #', dataIndex: 'receipt_no' },
          { title: 'Student', render: (_, r) => r.student?.full_name ?? '—' },
          { title: 'Month', dataIndex: 'fee_month', render: (m: string) => monthLabel(m) },
          { title: 'Amount', dataIndex: 'amount', render: (v: number) => formatCurrency(v) },
          {
            title: 'Method',
            dataIndex: 'method',
            render: (m: string) => <Tag color={m === 'cash' ? 'green' : m === 'online' ? 'blue' : 'purple'}>{m.toUpperCase()}</Tag>,
          },
          { title: 'Paid On', dataIndex: 'paid_on', render: (d: string) => formatDate(d) },
          {
            title: 'Actions',
            fixed: 'right',
            render: (_, r) => (
              <Button size="small" icon={<PrinterOutlined />} onClick={() => setReceipt(r)}>
                Print
              </Button>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        title="Collect Fee"
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={collectMut.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="student_id" label="Student" rules={[{ required: true }]}>
            <Select
              showSearch
              filterOption={false}
              onSearch={setStudentSearch}
              placeholder="Search student by name / phone"
              options={(students?.data ?? []).map((s) => ({
                label: `${s.full_name}${s.room?.room_number ? ` — Room ${s.room.room_number}` : ''}`,
                value: s.id,
              }))}
              onChange={(id) => {
                const s = students?.data.find((x) => x.id === id);
                if (s) form.setFieldValue('amount', s.monthly_fee);
              }}
            />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="baseline">
            <Form.Item name="fee_month" label="Fee Month" rules={[{ required: true }]}>
              <DatePicker picker="month" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="paid_on" label="Paid On" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="amount" label="Amount" rules={[{ required: true, type: 'number', min: 1 }]}>
            <InputNumber min={1} style={{ width: '100%' }} addonBefore="Rs" />
          </Form.Item>
          <Form.Item name="method" label="Payment Method" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'Cash', value: 'cash' },
                { label: 'Online', value: 'online' },
                { label: 'Mixed (cash + online)', value: 'mixed' },
              ]}
            />
          </Form.Item>
          {method === 'mixed' && (
            <Form.Item
              name="cash_amount"
              label="Cash Portion (rest counted as online)"
              rules={[{ required: true, type: 'number', min: 0 }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} addonBefore="Rs" />
            </Form.Item>
          )}
          <Form.Item name="collected_by" label="Collected By">
            <Input placeholder="Name of receiver" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {settings && (
        <ReceiptModal
          open={!!receipt}
          onClose={() => setReceipt(null)}
          payment={receipt}
          settings={settings}
        />
      )}
    </div>
  );
}
