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
  Drawer,
  List,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PAGE_SIZE, STORAGE_BUCKETS } from '@/constants';
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  listEmployeePayments,
  addEmployeePayment,
  type EmployeeQuery,
} from '@/services/employees.service';
import type { Employee, EmpTxnType } from '@/types/models';
import { formatCurrency, formatDate, monthLabel } from '@/utils/format';
import FileUpload from '@/components/common/FileUpload';

const { Title } = Typography;

const EMP_STATUS = [
  { label: 'Active', value: 'active', color: 'green' },
  { label: 'Inactive', value: 'inactive', color: 'default' },
  { label: 'Terminated', value: 'terminated', color: 'red' },
];

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Employee | null>(null);
  const [open, setOpen] = useState(false);
  const [payFor, setPayFor] = useState<Employee | null>(null);
  const [form] = Form.useForm();
  const [payForm] = Form.useForm();
  const debounced = useDebouncedValue(search, 400);

  const query: EmployeeQuery = { page, pageSize: PAGE_SIZE, search: debounced };
  const { data, isLoading } = useQuery({ queryKey: ['employees', query], queryFn: () => listEmployees(query) });

  const { data: payments } = useQuery({
    queryKey: ['emp-payments', payFor?.id],
    queryFn: () => listEmployeePayments(payFor!.id),
    enabled: !!payFor,
  });

  const saveMut = useMutation({
    mutationFn: (values: Partial<Employee>) =>
      editing ? updateEmployee(editing.id, values) : createEmployee(values),
    onSuccess: () => {
      message.success(editing ? 'Employee updated' : 'Employee added');
      qc.invalidateQueries({ queryKey: ['employees'] });
      setOpen(false);
    },
    onError: (e: Error) => message.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      message.success('Employee deleted');
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const payMut = useMutation({
    mutationFn: addEmployeePayment,
    onSuccess: () => {
      message.success('Payment recorded');
      qc.invalidateQueries({ queryKey: ['emp-payments'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      payForm.resetFields();
    },
    onError: (e: Error) => message.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active', joining_date: dayjs(), salary: 0 });
    setOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    form.setFieldsValue({ ...e, joining_date: dayjs(e.joining_date) });
    setOpen(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Title level={3} style={{ margin: 0 }}>
          Employees
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Employee
        </Button>
      </div>

      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search name / phone"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        style={{ width: 240, margin: '16px 0' }}
      />

      <Table<Employee>
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: data?.total ?? 0,
          onChange: setPage,
          showTotal: (t) => `${t} employees`,
        }}
        columns={[
          { title: 'Name', dataIndex: 'full_name' },
          { title: 'Designation', dataIndex: 'designation' },
          { title: 'Phone', dataIndex: 'phone' },
          { title: 'Salary', dataIndex: 'salary', render: (v: number) => formatCurrency(v) },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (s: string) => {
              const conf = EMP_STATUS.find((x) => x.value === s);
              return <Tag color={conf?.color}>{conf?.label}</Tag>;
            },
          },
          { title: 'Joined', dataIndex: 'joining_date', render: (d: string) => formatDate(d), responsive: ['lg'] },
          {
            title: 'Actions',
            fixed: 'right',
            render: (_, e) => (
              <Space>
                <Button size="small" icon={<DollarOutlined />} onClick={() => setPayFor(e)}>
                  Salary
                </Button>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(e)} />
                <Popconfirm title="Delete this employee?" onConfirm={() => delMut.mutate(e.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      {/* Create / edit */}
      <Modal
        open={open}
        title={editing ? 'Edit Employee' : 'Add Employee'}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saveMut.isPending}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(v) => saveMut.mutate({ ...v, joining_date: dayjs(v.joining_date).format('YYYY-MM-DD') })}>
          <Form.Item name="full_name" label="Full Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="baseline">
            <Form.Item name="cnic" label="CNIC">
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex' }} align="baseline">
            <Form.Item name="designation" label="Designation">
              <Input placeholder="e.g. Cook, Guard" />
            </Form.Item>
            <Form.Item name="salary" label="Monthly Salary" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} addonBefore="Rs" />
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex' }} align="baseline">
            <Form.Item name="joining_date" label="Joining Date" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select style={{ width: 160 }} options={EMP_STATUS.map((s) => ({ label: s.label, value: s.value }))} />
            </Form.Item>
          </Space>
          <Form.Item name="photo_url" label="Photo">
            <FileUpload bucket={STORAGE_BUCKETS.employeeDocuments} accept="image/*" label="Upload photo" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Salary / advance / bonus history */}
      <Drawer
        open={!!payFor}
        onClose={() => setPayFor(null)}
        width={480}
        title={`Salary — ${payFor?.full_name ?? ''}`}
      >
        <Form
          form={payForm}
          layout="vertical"
          onFinish={(v) =>
            payMut.mutate({
              employee_id: payFor!.id,
              txn_type: v.txn_type as EmpTxnType,
              amount: Number(v.amount),
              for_month: v.for_month ? dayjs(v.for_month).format('YYYY-MM-DD') : null,
              paid_on: dayjs(v.paid_on ?? dayjs()).format('YYYY-MM-DD'),
              notes: v.notes,
            })
          }
          initialValues={{ txn_type: 'salary', paid_on: dayjs(), amount: payFor?.salary }}
        >
          <Space style={{ display: 'flex' }} align="baseline">
            <Form.Item name="txn_type" label="Type" rules={[{ required: true }]}>
              <Select
                style={{ width: 140 }}
                options={[
                  { label: 'Salary', value: 'salary' },
                  { label: 'Bonus', value: 'bonus' },
                  { label: 'Advance', value: 'advance' },
                  { label: 'Deduction', value: 'deduction' },
                ]}
              />
            </Form.Item>
            <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} addonBefore="Rs" />
            </Form.Item>
          </Space>
          <Space style={{ display: 'flex' }} align="baseline">
            <Form.Item name="for_month" label="For Month">
              <DatePicker picker="month" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="paid_on" label="Paid On" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="notes" label="Notes">
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={payMut.isPending} block>
            Record Payment
          </Button>
        </Form>

        <List
          style={{ marginTop: 24 }}
          header={<strong>History</strong>}
          dataSource={payments ?? []}
          locale={{ emptyText: 'No payments yet' }}
          renderItem={(p) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Space>
                    <Tag color={p.txn_type === 'deduction' ? 'red' : 'green'}>{p.txn_type}</Tag>
                    {formatCurrency(p.amount)}
                  </Space>
                }
                description={`${formatDate(p.paid_on)}${p.for_month ? ` · for ${monthLabel(p.for_month)}` : ''}`}
              />
            </List.Item>
          )}
        />
      </Drawer>
    </div>
  );
}
