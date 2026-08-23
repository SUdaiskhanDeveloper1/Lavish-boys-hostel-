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
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  EyeOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PAGE_SIZE, STUDENT_STATUS, BLOOD_GROUPS,  } from '@/constants';
import {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  type StudentQuery,
} from '@/services/students.service';
import { listAvailableRooms } from '@/services/rooms.service';
import type { Student, StudentStatus } from '@/types/models';
import { formatCurrency, formatDate } from '@/utils/format';
import { exportToExcel } from '@/utils/export';
// import FileUpload from '@/components/common/FileUpload';
import StudentDrawer from './StudentDrawer';

const { Title } = Typography;

export default function StudentsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StudentStatus | undefined>();
  const [editing, setEditing] = useState<Student | null>(null);
  const [open, setOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const debounced = useDebouncedValue(search, 400);

  const query: StudentQuery = { page, pageSize: PAGE_SIZE, search: debounced, status };
  const { data, isLoading } = useQuery({
    queryKey: ['students', query],
    queryFn: () => listStudents(query),
  });

  const { data: rooms } = useQuery({ queryKey: ['available-rooms'], queryFn: listAvailableRooms });

  const saveMut = useMutation({
    mutationFn: (values: Partial<Student>) =>
      editing ? updateStudent(editing.id, values) : createStudent(values),
    onSuccess: () => {
      message.success(editing ? 'Student updated' : 'Student registered');
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['available-rooms'] });
      setOpen(false);
    },
    onError: (e: Error) => message.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      message.success('Student deleted');
      qc.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active', joining_date: dayjs(), monthly_fee: 0 });
    setOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditing(s);
    form.setFieldsValue({
      ...s,
      joining_date: s.joining_date ? dayjs(s.joining_date) : undefined,
      leaving_date: s.leaving_date ? dayjs(s.leaving_date) : undefined,
    });
    setOpen(true);
  };

  const onFinish = (values: Record<string, unknown>) => {
    const payload: Partial<Student> = {
      ...(values as Partial<Student>),
      joining_date: values.joining_date
        ? dayjs(values.joining_date as dayjs.Dayjs).format('YYYY-MM-DD')
        : undefined,
      leaving_date: values.leaving_date
        ? dayjs(values.leaving_date as dayjs.Dayjs).format('YYYY-MM-DD')
        : null,
    };
    saveMut.mutate(payload);
  };

  const handleExport = async () => {
    const all = await listStudents({ page: 1, pageSize: 10000 });
    exportToExcel(
      all.data.map((s) => ({
        Name: s.full_name,
        Father: s.father_name,
        CNIC: s.cnic,
        Phone: s.phone,
        Room: s.room?.room_number ?? '',
        Seat: s.seat_number,
        MonthlyFee: s.monthly_fee,
        Status: s.status,
        Joined: s.joining_date,
      })),
      'students',
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Title level={3} style={{ margin: 0 }}>
          Students
        </Title>
        <Space>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            Export
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Register Student
          </Button>
        </Space>
      </div>

      <Space wrap style={{ margin: '16px 0' }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search name / CNIC / phone"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ width: 280 }}
        />
        <Select
          allowClear
          placeholder="Status"
          style={{ width: 160 }}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={STUDENT_STATUS.map((s) => ({ label: s.label, value: s.value }))}
        />
      </Space>

      <Table<Student>
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: data?.total ?? 0,
          onChange: setPage,
          showTotal: (t) => `${t} students`,
        }}
        columns={[
          { title: 'Name', dataIndex: 'full_name' },
          { title: 'Father', dataIndex: 'father_name', responsive: ['lg'] },
          { title: 'Phone', dataIndex: 'phone' },
          { title: 'Room', render: (_, s) => s.room?.room_number ?? '—' },
          { title: 'Seat', dataIndex: 'seat_number', responsive: ['lg'] },
          { title: 'Fee', dataIndex: 'monthly_fee', render: (v: number) => formatCurrency(v) },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (s: StudentStatus) => {
              const conf = STUDENT_STATUS.find((x) => x.value === s);
              return <Tag color={conf?.color}>{conf?.label}</Tag>;
            },
          },
          { title: 'Joined', dataIndex: 'joining_date', render: (d: string) => formatDate(d), responsive: ['xl'] },
          {
            title: 'Actions',
            fixed: 'right',
            render: (_, s) => (
              <Space>
                <Button size="small" icon={<EyeOutlined />} onClick={() => setViewId(s.id)} />
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(s)} />
                <Popconfirm title="Delete this student?" onConfirm={() => delMut.mutate(s.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        title={editing ? 'Edit Student' : 'Register Student'}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saveMut.isPending}
        width={760}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="full_name" label="Full Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="father_name" label="Father Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="cnic" label="CNIC"  rules={[{ required: true }]}>
                <Input placeholder="00000-0000000-0" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="emergency_contact" label="Emergency Contact">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="address" label="Address">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="room_id" label="Room">
                <Select
                  allowClear
                  placeholder="Assign room"
                  options={(rooms ?? []).map((r) => ({
                    label: `${r.room_number} (${r.capacity - r.occupied_seats} free)`,
                    value: r.id,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="seat_number" label="Seat #">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="blood_group" label="Blood Group">
                <Select allowClear options={BLOOD_GROUPS.map((b) => ({ label: b, value: b }))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="monthly_fee" label="Monthly Fee" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} addonBefore="Rs" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="security_deposit" label="Security Deposit" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} addonBefore="Rs" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="admission_fee" label="Admission Fee">
                <InputNumber min={0} style={{ width: '100%' }} addonBefore="Rs" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="joining_date" label="Joining Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="leaving_date" label="Leaving Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                <Select options={STUDENT_STATUS.map((s) => ({ label: s.label, value: s.value }))} />
              </Form.Item>
            </Col>
            {/* <Col xs={24} md={8}>
              <Form.Item name="photo_url" label="Photo">
                <FileUpload bucket={STORAGE_BUCKETS.studentPhotos} accept="image/*" label="Upload photo" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="cnic_front_url" label="CNIC Front">
                <FileUpload bucket={STORAGE_BUCKETS.studentDocuments} accept="image/*" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="cnic_back_url" label="CNIC Back">
                <FileUpload bucket={STORAGE_BUCKETS.studentDocuments} accept="image/*" />
              </Form.Item>
            </Col> */}
            <Col xs={24}>
              <Form.Item name="medical_notes" label="Medical Notes / Remarks">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <StudentDrawer studentId={viewId} onClose={() => setViewId(null)} />
    </div>
  );
}
