import { useState } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  Typography,
  Popconfirm,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PAGE_SIZE, EXPENSE_CATEGORIES, STORAGE_BUCKETS } from '@/constants';
import {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  type ExpenseQuery,
} from '@/services/expenses.service';
import type { Expense } from '@/types/models';
import { formatCurrency, formatDate } from '@/utils/format';
import { exportToExcel } from '@/utils/export';
import FileUpload from '@/components/common/FileUpload';

const { Title } = Typography;

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const debounced = useDebouncedValue(search, 400);

  const query: ExpenseQuery = {
    page,
    pageSize: PAGE_SIZE,
    search: debounced,
    category,
    from: range?.[0]?.format('YYYY-MM-DD'),
    to: range?.[1]?.format('YYYY-MM-DD'),
  };
  const { data, isLoading } = useQuery({ queryKey: ['expenses', query], queryFn: () => listExpenses(query) });

  const saveMut = useMutation({
    mutationFn: (values: Partial<Expense>) =>
      editing ? updateExpense(editing.id, values) : createExpense(values),
    onSuccess: () => {
      message.success(editing ? 'Expense updated' : 'Expense added');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setOpen(false);
    },
    onError: (e: Error) => message.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      message.success('Expense deleted');
      qc.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ spent_on: dayjs() });
    setOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    form.setFieldsValue({ ...e, spent_on: dayjs(e.spent_on) });
    setOpen(true);
  };

  const onFinish = (v: Record<string, unknown>) =>
    saveMut.mutate({
      ...(v as Partial<Expense>),
      spent_on: dayjs(v.spent_on as dayjs.Dayjs).format('YYYY-MM-DD'),
    });

  const handleExport = async () => {
    const all = await listExpenses({ page: 1, pageSize: 10000 });
    exportToExcel(
      all.data.map((e) => ({
        Title: e.title,
        Category: e.category,
        Amount: e.amount,
        PaidTo: e.paid_to,
        Date: e.spent_on,
      })),
      'expenses',
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Title level={3} style={{ margin: 0 }}>
          Expenses
        </Title>
        <Space>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            Export
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Add Expense
          </Button>
        </Space>
      </div>

      <Space wrap style={{ margin: '16px 0' }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search title / paid to"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ width: 240 }}
        />
        <Select
          allowClear
          placeholder="Category"
          style={{ width: 180 }}
          value={category}
          onChange={(v) => {
            setCategory(v);
            setPage(1);
          }}
          options={EXPENSE_CATEGORIES.map((c) => ({ label: c, value: c }))}
        />
        <DatePicker.RangePicker
          value={range}
          onChange={(v) => {
            setRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null);
            setPage(1);
          }}
        />
      </Space>

      <Table<Expense>
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: data?.total ?? 0,
          onChange: setPage,
          showTotal: (t) => `${t} expenses`,
        }}
        columns={[
          { title: 'Title', dataIndex: 'title' },
          { title: 'Category', dataIndex: 'category', render: (c: string) => <Tag>{c}</Tag> },
          { title: 'Amount', dataIndex: 'amount', render: (v: number) => formatCurrency(v) },
          { title: 'Paid To', dataIndex: 'paid_to', responsive: ['md'] },
          { title: 'Date', dataIndex: 'spent_on', render: (d: string) => formatDate(d) },
          {
            title: 'Actions',
            fixed: 'right',
            render: (_, e) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(e)} />
                <Popconfirm title="Delete this expense?" onConfirm={() => delMut.mutate(e.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        title={editing ? 'Edit Expense' : 'Add Expense'}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saveMut.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="baseline">
            <Form.Item name="category" label="Category" rules={[{ required: true }]}>
              <Select style={{ width: 200 }} options={EXPENSE_CATEGORIES.map((c) => ({ label: c, value: c }))} />
            </Form.Item>
            <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} addonBefore="Rs" />
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex' }} align="baseline">
            <Form.Item name="spent_on" label="Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="paid_to" label="Paid To">
              <Input />
            </Form.Item>
          </Space>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="bill_url" label="Bill / Receipt">
            <FileUpload bucket={STORAGE_BUCKETS.expenseBills} accept="image/*,application/pdf" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
