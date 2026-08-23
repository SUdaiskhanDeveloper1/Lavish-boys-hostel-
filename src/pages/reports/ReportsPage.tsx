import { useState } from 'react';
import {
  Card,
  DatePicker,
  Segmented,
  Row,
  Col,
  Statistic,
  Button,
  Space,
  Typography,
  Table,
  message,
} from 'antd';
import { FilePdfOutlined, FileExcelOutlined, PrinterOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { buildReport, type ReportResult } from '@/services/reports.service';
import { formatCurrency, formatDate } from '@/utils/format';
import { exportToExcel, exportTableToPdf } from '@/utils/export';

const { Title } = Typography;
type Preset = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

function presetRange(p: Preset): [dayjs.Dayjs, dayjs.Dayjs] {
  const now = dayjs();
  switch (p) {
    case 'daily':
      return [now.startOf('day'), now.endOf('day')];
    case 'weekly':
      return [now.subtract(6, 'day').startOf('day'), now.endOf('day')];
    case 'monthly':
      return [now.startOf('month'), now.endOf('month')];
    case 'yearly':
      return [now.startOf('year'), now.endOf('year')];
    default:
      return [now.startOf('month'), now.endOf('month')];
  }
}

export default function ReportsPage() {
  const [preset, setPreset] = useState<Preset>('monthly');
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>(presetRange('monthly'));
  const [result, setResult] = useState<ReportResult | null>(null);

  const runMut = useMutation({
    mutationFn: () =>
      buildReport({ from: range[0].format('YYYY-MM-DD'), to: range[1].format('YYYY-MM-DD') }),
    onSuccess: setResult,
    onError: (e: Error) => message.error(e.message),
  });

  const changePreset = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') setRange(presetRange(p));
  };

  const label = `${formatDate(range[0])} – ${formatDate(range[1])}`;

  const exportExcel = () => {
    if (!result) return;
    exportToExcel(
      [
        { Metric: 'Income', Value: result.income },
        { Metric: 'Expenses', Value: result.expense },
        { Metric: 'Salaries', Value: result.salary },
        { Metric: 'Profit', Value: result.profit },
        { Metric: 'Pending Fees', Value: result.pendingFees },
        { Metric: 'Active Students', Value: result.activeStudents },
        { Metric: 'Occupied Rooms', Value: result.occupiedRooms },
        { Metric: 'Vacant Rooms', Value: result.vacantRooms },
      ],
      `report-${range[0].format('YYYYMMDD')}-${range[1].format('YYYYMMDD')}`,
    );
  };

  const exportPdf = () => {
    if (!result) return;
    exportTableToPdf(
      `Hostel Report (${label})`,
      ['Metric', 'Value'],
      [
        ['Income', formatCurrency(result.income)],
        ['Expenses', formatCurrency(result.expense)],
        ['Salaries', formatCurrency(result.salary)],
        ['Profit', formatCurrency(result.profit)],
        ['Pending Fees', formatCurrency(result.pendingFees)],
        ['Active Students', String(result.activeStudents)],
        ['Occupied Rooms', String(result.occupiedRooms)],
        ['Vacant Rooms', String(result.vacantRooms)],
      ],
      'hostel-report',
    );
  };

  return (
    <div>
      <Title level={3} style={{ margin: 0 }}>
        Reports
      </Title>

      <Card style={{ margin: '16px 0' }}>
        <Space wrap>
          <Segmented
            value={preset}
            onChange={(v) => changePreset(v as Preset)}
            options={[
              { label: 'Daily', value: 'daily' },
              { label: 'Weekly', value: 'weekly' },
              { label: 'Monthly', value: 'monthly' },
              { label: 'Yearly', value: 'yearly' },
              { label: 'Custom', value: 'custom' },
            ]}
          />
          <DatePicker.RangePicker
            value={range}
            onChange={(v) => {
              if (v && v[0] && v[1]) {
                setRange([v[0], v[1]]);
                setPreset('custom');
              }
            }}
          />
          <Button type="primary" onClick={() => runMut.mutate()} loading={runMut.isPending}>
            Generate
          </Button>
        </Space>
      </Card>

      {result && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Space>
              <Button icon={<FileExcelOutlined />} onClick={exportExcel}>
                Excel
              </Button>
              <Button icon={<FilePdfOutlined />} onClick={exportPdf}>
                PDF
              </Button>
              <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
                Print
              </Button>
            </Space>
          </div>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Income" value={result.income} formatter={(v) => formatCurrency(Number(v))} valueStyle={{ color: '#3f8600' }} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Expenses" value={result.expense} formatter={(v) => formatCurrency(Number(v))} valueStyle={{ color: '#cf1322' }} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Salaries" value={result.salary} formatter={(v) => formatCurrency(Number(v))} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Profit" value={result.profit} formatter={(v) => formatCurrency(Number(v))} valueStyle={{ color: result.profit >= 0 ? '#3f8600' : '#cf1322' }} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Pending Fees" value={result.pendingFees} formatter={(v) => formatCurrency(Number(v))} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Active Students" value={result.activeStudents} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Occupied Rooms" value={result.occupiedRooms} /></Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card><Statistic title="Vacant Rooms" value={result.vacantRooms} /></Card>
            </Col>
          </Row>

          <Card title="Income detail" style={{ marginTop: 16 }}>
            <Table
              rowKey={(r) => r.receipt_no}
              size="small"
              dataSource={result.incomeRows}
              scroll={{ x: 'max-content' }}
              columns={[
                { title: 'Receipt #', dataIndex: 'receipt_no' },
                { title: 'Date', dataIndex: 'paid_on', render: (d: string) => formatDate(d) },
                { title: 'Amount', dataIndex: 'amount', render: (v: number) => formatCurrency(v) },
              ]}
            />
          </Card>

          <Card title="Expense detail" style={{ marginTop: 16 }}>
            <Table
              rowKey={(_, i) => String(i)}
              size="small"
              dataSource={result.expenseRows}
              scroll={{ x: 'max-content' }}
              columns={[
                { title: 'Title', dataIndex: 'title' },
                { title: 'Category', dataIndex: 'category' },
                { title: 'Date', dataIndex: 'spent_on', render: (d: string) => formatDate(d) },
                { title: 'Amount', dataIndex: 'amount', render: (v: number) => formatCurrency(v) },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
}
