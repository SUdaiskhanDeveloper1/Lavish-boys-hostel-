import { Drawer, Descriptions, Statistic, Row, Col, Card, Timeline, Tag, Spin, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getStudent, getStudentFinancials, getTimeline } from '@/services/students.service';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format';
import { STUDENT_STATUS } from '@/constants';

interface Props {
  studentId: string | null;
  onClose: () => void;
}

/** Read-only student profile: details + financial summary + timeline. */
export default function StudentDrawer({ studentId, onClose }: Props) {
  const open = !!studentId;

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => getStudent(studentId!),
    enabled: open,
  });
  const { data: fin } = useQuery({
    queryKey: ['student-fin', studentId],
    queryFn: () => getStudentFinancials(studentId!),
    enabled: open,
  });
  const { data: timeline } = useQuery({
    queryKey: ['student-timeline', studentId],
    queryFn: () => getTimeline(studentId!),
    enabled: open,
  });

  const statusConf = STUDENT_STATUS.find((s) => s.value === student?.status);

  return (
    <Drawer open={open} onClose={onClose} width={560} title={student?.full_name ?? 'Student'}>
      {isLoading || !student ? (
        <Spin />
      ) : (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card size="small">
                <Statistic title="Total Paid" value={fin?.total_paid ?? 0} formatter={(v) => formatCurrency(Number(v))} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="Pending"
                  value={fin?.pending_amount ?? 0}
                  formatter={(v) => formatCurrency(Number(v))}
                  valueStyle={{ color: (fin?.pending_amount ?? 0) > 0 ? '#cf1322' : '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic title="Months" value={fin?.months_stayed ?? 0} />
              </Card>
            </Col>
          </Row>

          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Status">
              <Tag color={statusConf?.color}>{statusConf?.label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Father">{student.father_name ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="CNIC">{student.cnic ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Phone">{student.phone ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Emergency">{student.emergency_contact ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Room / Seat">
              {student.room?.room_number ?? '—'} / {student.seat_number ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Monthly Fee">{formatCurrency(student.monthly_fee)}</Descriptions.Item>
            <Descriptions.Item label="Joined">{formatDate(student.joining_date)}</Descriptions.Item>
            <Descriptions.Item label="Leaving">{formatDate(student.leaving_date)}</Descriptions.Item>
            <Descriptions.Item label="Blood Group">{student.blood_group ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Address">{student.address ?? '—'}</Descriptions.Item>
          </Descriptions>

          <Card title="Timeline" size="small" style={{ marginTop: 16 }}>
            {timeline && timeline.length > 0 ? (
              <Timeline
                items={timeline.map((t) => ({
                  children: (
                    <>
                      <strong>{t.title}</strong>
                      <div style={{ color: '#999', fontSize: 12 }}>{formatDateTime(t.event_date)}</div>
                      {t.detail && <div>{t.detail}</div>}
                    </>
                  ),
                }))}
              />
            ) : (
              <Empty description="No events yet" />
            )}
          </Card>
        </>
      )}
    </Drawer>
  );
}
