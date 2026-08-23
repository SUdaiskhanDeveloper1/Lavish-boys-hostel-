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
  Typography,
  Popconfirm,
  message,
  Progress,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PAGE_SIZE, ROOM_STATUS, ROOM_TYPES, DEFAULT_CAPACITY } from '@/constants';
import {
  listRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  type RoomQuery,
} from '@/services/rooms.service';
import type { Room, RoomStatus, RoomType } from '@/types/models';
import { formatCurrency } from '@/utils/format';

const { Title } = Typography;

export default function RoomsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<RoomStatus | undefined>();
  const [editing, setEditing] = useState<Room | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const debounced = useDebouncedValue(search, 400);

  const query: RoomQuery = { page, pageSize: PAGE_SIZE, search: debounced, status };
  const { data, isLoading } = useQuery({
    queryKey: ['rooms', query],
    queryFn: () => listRooms(query),
  });

  const saveMut = useMutation({
    mutationFn: (values: Partial<Room>) =>
      editing ? updateRoom(editing.id, values) : createRoom(values),
    onSuccess: () => {
      message.success(editing ? 'Room updated' : 'Room created');
      qc.invalidateQueries({ queryKey: ['rooms'] });
      setOpen(false);
    },
    onError: (e: Error) => message.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => {
      message.success('Room deleted');
      qc.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ room_type: 'double', capacity: 2, status: 'active', floor: 0 });
    setOpen(true);
  };

  const openEdit = (room: Room) => {
    setEditing(room);
    form.setFieldsValue(room);
    setOpen(true);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Title level={3} style={{ margin: 0 }}>
          Rooms
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Room
        </Button>
      </div>

      <Space wrap style={{ margin: '16px 0' }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search room number"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ width: 240 }}
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
          options={ROOM_STATUS.map((s) => ({ label: s.label, value: s.value }))}
        />
      </Space>

      <Table<Room>
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: data?.total ?? 0,
          onChange: setPage,
          showTotal: (t) => `${t} rooms`,
        }}
        columns={[
          { title: 'Room #', dataIndex: 'room_number', sorter: true },
          { title: 'Floor', dataIndex: 'floor' },
          {
            title: 'Type',
            dataIndex: 'room_type',
            render: (t: RoomType) => t.charAt(0).toUpperCase() + t.slice(1),
          },
          {
            title: 'Occupancy',
            render: (_, r) => (
              <div style={{ minWidth: 140 }}>
                <span>
                  {r.occupied_seats}/{r.capacity} beds
                </span>
                <Progress
                  percent={Math.round((r.occupied_seats / r.capacity) * 100)}
                  size="small"
                  showInfo={false}
                />
              </div>
            ),
          },
          {
            title: 'Vacant',
            render: (_, r) => <Tag color={r.capacity - r.occupied_seats > 0 ? 'green' : 'red'}>{r.capacity - r.occupied_seats}</Tag>,
          },
          { title: 'Rent', dataIndex: 'rent_per_month', render: (v: number) => formatCurrency(v) },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (s: RoomStatus) => {
              const conf = ROOM_STATUS.find((x) => x.value === s);
              return <Tag color={conf?.color}>{conf?.label}</Tag>;
            },
          },
          {
            title: 'Actions',
            fixed: 'right',
            render: (_, r) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                <Popconfirm
                  title="Delete this room?"
                  description={r.occupied_seats > 0 ? 'Room has occupants — reassign them first.' : undefined}
                  onConfirm={() => delMut.mutate(r.id)}
                  disabled={r.occupied_seats > 0}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} disabled={r.occupied_seats > 0} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        title={editing ? 'Edit Room' : 'Add Room'}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saveMut.isPending}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => saveMut.mutate(v)}
          onValuesChange={(changed) => {
            if (changed.room_type && changed.room_type !== 'custom') {
              form.setFieldValue('capacity', DEFAULT_CAPACITY[changed.room_type as RoomType]);
            }
          }}
        >
          <Form.Item name="room_number" label="Room Number" rules={[{ required: true }]}>
            <Input placeholder="e.g. 101" />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="baseline">
            <Form.Item name="floor" label="Floor" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="room_type" label="Room Type" rules={[{ required: true }]}>
              <Select options={ROOM_TYPES} style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="capacity" label="Capacity" rules={[{ required: true, type: 'number', min: 1 }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="rent_per_month" label="Rent / Month" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} addonBefore="Rs" />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select options={ROOM_STATUS.map((s) => ({ label: s.label, value: s.value }))} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
