import { useQuery } from '@tanstack/react-query';
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Spin,
  Empty,
  Table,
  Tag,
  Button,
  Space,
} from 'antd';
import {
  DollarOutlined,
  WalletOutlined,
  TeamOutlined,
  HomeOutlined,
  RiseOutlined,
  FallOutlined,
  UserAddOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Column } from '@ant-design/charts';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '@/services/dashboard.service';
import { formatCurrency, formatDate } from '@/utils/format';
import type { FeePayment } from '@/types/models';

const { Title } = Typography;

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardStats,
    refetchInterval: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  const chartData = data.series.flatMap((s) => [
    { day: s.day, type: 'Income', value: s.income },
    { day: s.day, type: 'Expense', value: s.expense },
  ]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Title level={3} style={{ margin: 0 }}>
          Dashboard
        </Title>
        <Space wrap>
          <Button icon={<UserAddOutlined />} onClick={() => navigate('/students')}>
            Register Student
          </Button>
          <Button icon={<HomeOutlined />} onClick={() => navigate('/rooms')}>
            Add Room
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/fees')}>
            Collect Fee
          </Button>
          <Button icon={<WalletOutlined />} onClick={() => navigate('/expenses')}>
            Add Expense
          </Button>
        </Space>
      </div>

      {/* Money today */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Today's Income"
              value={data.todayIncome}
              formatter={(v) => formatCurrency(Number(v))}
              prefix={<DollarOutlined style={{ color: '#3f8600' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Today's Expenses"
              value={data.todayExpense}
              formatter={(v) => formatCurrency(Number(v))}
              prefix={<WalletOutlined style={{ color: '#cf1322' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Salary Paid Today"
              value={data.todaySalary}
              formatter={(v) => formatCurrency(Number(v))}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Net Today"
              value={data.todayIncome - data.todayExpense - data.todaySalary}
              formatter={(v) => formatCurrency(Number(v))}
              valueStyle={{
                color: data.todayIncome - data.todayExpense - data.todaySalary >= 0 ? '#3f8600' : '#cf1322',
              }}
              prefix={
                data.todayIncome - data.todayExpense - data.todaySalary >= 0 ? (
                  <RiseOutlined />
                ) : (
                  <FallOutlined />
                )
              }
            />
          </Card>
        </Col>
      </Row>

      {/* Strength */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={12} sm={8} lg={4}>
          <Card><Statistic title="Active Students" value={data.totalStudents} /></Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card><Statistic title="Total Rooms" value={data.totalRooms} /></Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card><Statistic title="Occupied Beds" value={data.occupiedBeds} /></Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card><Statistic title="Vacant Beds" value={data.vacantBeds} /></Card>
        </Col>
        {/* <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Leaving Soon"
              value={data.leavingSoon}
              valueStyle={{ color: data.leavingSoon ? '#faad14' : undefined }}
            />
          </Card>
        </Col> */}
        {/* <Col xs={12} sm={8} lg={4}>
          <Card>
            <Statistic
              title="Pending Fees"
              value={data.pendingFeesCount}
              valueStyle={{ color: data.pendingFeesCount ? '#cf1322' : undefined }}
            />
          </Card>
        </Col> */}
      </Row>

      {/* Charts + monthly */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="Weekly Income vs Expenses">
            {chartData.some((d) => d.value > 0) ? (
              <Column
                data={chartData}
                xField="day"
                yField="value"
                colorField="type"
                group
                height={280}
                scale={{ color: { range: ['#1B2A4A', '#E0B94A'] } }}
              />
            ) : (
              <Empty description="No transactions in the last 7 days" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="This Month" style={{ height: '100%' }}>
            <Statistic
              title="Monthly Income"
              value={data.monthlyIncome}
              formatter={(v) => formatCurrency(Number(v))}
              valueStyle={{ color: '#3f8600' }}
            />
            <Statistic
              title="Monthly Expenses"
              value={data.monthlyExpense}
              formatter={(v) => formatCurrency(Number(v))}
              valueStyle={{ color: '#cf1322', marginTop: 12 }}
              style={{ marginTop: 16 }}
            />
            <Statistic
              title="Monthly Profit"
              value={data.monthlyIncome - data.monthlyExpense}
              formatter={(v) => formatCurrency(Number(v))}
              style={{ marginTop: 16 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Recent transactions */}
      <Card title="Recent Transactions" style={{ marginTop: 16 }}>
        <Table<FeePayment>
          rowKey="id"
          dataSource={data.recent}
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: <Empty description="No transactions yet" /> }}
          columns={[
            { title: 'Receipt #', dataIndex: 'receipt_no' },
            { title: 'Student', render: (_, r) => r.student?.full_name ?? '—' },
            {
              title: 'Amount',
              dataIndex: 'amount',
              render: (v: number) => formatCurrency(v),
            },
            {
              title: 'Method',
              dataIndex: 'method',
              render: (m: string) => <Tag color={m === 'cash' ? 'green' : 'blue'}>{m.toUpperCase()}</Tag>,
            },
            { title: 'Date', dataIndex: 'paid_on', render: (d: string) => formatDate(d) },
          ]}
        />
      </Card>
    </div>
  );
}
